from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException

from app.core.config import get_settings
from app.services.face_engine import extract_embedding
from app.services.supabase_client import get_supabase_client


ALLOWED_FACE_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
DEFAULT_EMPLOYMENT_STATUS = "active"
EMPLOYEE_CODE_PREFIX = "NV"
EMPLOYEE_CODE_WIDTH = 4
EMPLOYEE_CODE_RETRY_LIMIT = 25
EMPLOYEE_SELECT_COLUMNS = (
    "id, auth_user_id, employee_code, full_name, department, "
    "role_title, employment_status, created_at, updated_at, "
    "face_profiles(id, status, image_path, registered_at)"
)
ROLE_TITLES = {"employee", "admin"}


def _normalize_role_title(role_title: str | None) -> str:
    if role_title in ROLE_TITLES:
        return role_title
    if "admin" in str(role_title or "").lower():
        return "admin"
    return "employee"


def _generate_employee_code() -> str:
    try:
        response = (
            get_supabase_client()
            .table("employees")
            .select("employee_code")
            .ilike("employee_code", "NV-%")
            .execute()
        )
    except Exception as caught:
        raise HTTPException(status_code=502, detail="Không sinh được mã nhân viên kế tiếp.") from caught

    current_numbers: list[int] = []
    for employee in response.data or []:
        code = str(employee.get("employee_code") or "")
        prefix, _, numeric_part = code.partition("-")
        if prefix == EMPLOYEE_CODE_PREFIX and len(numeric_part) == EMPLOYEE_CODE_WIDTH and numeric_part.isdigit():
            current_numbers.append(int(code[3:]))

    next_number = max(current_numbers, default=0) + 1
    if next_number > 10**EMPLOYEE_CODE_WIDTH - 1:
        raise HTTPException(status_code=409, detail="Đã hết dải mã nhân viên NV-0001 đến NV-9999.")

    return f"{EMPLOYEE_CODE_PREFIX}-{next_number:0{EMPLOYEE_CODE_WIDTH}d}"


def _is_unique_constraint_error(caught: Exception) -> bool:
    message = str(caught).lower()
    return "duplicate" in message or "unique" in message or "23505" in message


def _validate_employee_code(employee_code: str) -> None:
    prefix, _, numeric_part = employee_code.partition("-")
    if prefix != EMPLOYEE_CODE_PREFIX or len(numeric_part) != EMPLOYEE_CODE_WIDTH or not numeric_part.isdigit():
        raise HTTPException(status_code=400, detail="Mã nhân viên phải có định dạng NV-0001.")


def _format_employee(employee: dict) -> dict:
    face_profiles = employee.get("face_profiles") or []
    face_status, face_image_url = _format_face_info(face_profiles)
    return {
        "id": employee["id"],
        "auth_user_id": employee.get("auth_user_id"),
        "code": employee["employee_code"],
        "name": employee["full_name"],
        "department": employee.get("department") or "Chưa cập nhật",
        "role_title": _normalize_role_title(employee.get("role_title")),
        "status": employee.get("employment_status") or DEFAULT_EMPLOYMENT_STATUS,
        "face": face_status,
        "face_image_url": face_image_url,
        "created_at": employee.get("created_at"),
        "updated_at": employee.get("updated_at"),
    }


def _format_face_info(face_profiles: list[dict]) -> tuple[str, str | None]:
    active_profiles = [
        profile
        for profile in face_profiles
        if profile.get("status", "active") == "active"
    ]
    if not active_profiles:
        return "Chưa đăng ký", None
    latest = max(active_profiles, key=lambda p: p.get("registered_at") or "")
    return "Đã đăng ký", latest.get("image_path") or None


def list_employees() -> list[dict]:
    try:
        response = (
            get_supabase_client()
            .table("employees")
            .select(
                EMPLOYEE_SELECT_COLUMNS
            )
            .order("employee_code")
            .execute()
        )
    except RuntimeError as caught:
        raise HTTPException(status_code=500, detail=str(caught)) from caught
    except Exception as caught:
        raise HTTPException(status_code=502, detail="Không lấy được danh sách nhân viên từ Supabase.") from caught

    employees = response.data or []

    return [_format_employee(employee) for employee in employees]


def create_employee(
    employee_code: str | None,
    full_name: str,
    department: str | None = None,
    role_title: str | None = None,
    employment_status: str = DEFAULT_EMPLOYMENT_STATUS,
) -> dict:
    requested_employee_code = employee_code.strip().upper() if employee_code else None
    if requested_employee_code:
        _validate_employee_code(requested_employee_code)

    full_name = full_name.strip()
    department = department.strip() if department else None
    role_title = role_title.strip() if role_title else None
    employment_status = employment_status.strip() or DEFAULT_EMPLOYMENT_STATUS

    if not full_name:
        raise HTTPException(status_code=400, detail="Họ tên nhân viên là bắt buộc.")
    if employment_status not in {"active", "probation", "inactive"}:
        raise HTTPException(status_code=400, detail="Trạng thái nhân viên không hợp lệ.")
    if role_title and role_title not in ROLE_TITLES:
        raise HTTPException(status_code=400, detail="Vai trò nhân viên không hợp lệ.")

    last_unique_error: Exception | None = None
    attempts = 1 if requested_employee_code else EMPLOYEE_CODE_RETRY_LIMIT

    for _ in range(attempts):
        employee_code = requested_employee_code or _generate_employee_code()

        try:
            response = (
                get_supabase_client()
                .table("employees")
                .insert(
                    {
                        "employee_code": employee_code,
                        "full_name": full_name,
                        "department": department,
                        "role_title": role_title or "employee",
                        "employment_status": employment_status,
                    }
                )
                .execute()
            )
            break
        except RuntimeError as caught:
            raise HTTPException(status_code=500, detail=str(caught)) from caught
        except Exception as caught:
            if _is_unique_constraint_error(caught):
                last_unique_error = caught
                if requested_employee_code:
                    raise HTTPException(status_code=409, detail="Mã nhân viên đã tồn tại.") from caught
                continue
            raise HTTPException(status_code=502, detail="Không tạo được nhân viên trên Supabase.") from caught
    else:
        raise HTTPException(
            status_code=409,
            detail="Không sinh được mã nhân viên duy nhất sau nhiều lần thử.",
        ) from last_unique_error

    employee = (response.data or [{}])[0]
    if not employee.get("id"):
        raise HTTPException(status_code=502, detail="Supabase không trả về hồ sơ nhân viên vừa tạo.")

    employee["face_profiles"] = []
    return _format_employee(employee)


def update_employee(
    employee_id: str,
    full_name: str,
    department: str | None = None,
    role_title: str | None = None,
    employment_status: str = DEFAULT_EMPLOYMENT_STATUS,
) -> dict:
    full_name = full_name.strip()
    department = department.strip() if department else None
    role_title = role_title.strip() if role_title else None
    employment_status = employment_status.strip() or DEFAULT_EMPLOYMENT_STATUS

    if not full_name:
        raise HTTPException(status_code=400, detail="Họ tên nhân viên là bắt buộc.")
    if employment_status not in {"active", "probation", "inactive"}:
        raise HTTPException(status_code=400, detail="Trạng thái nhân viên không hợp lệ.")
    if role_title not in ROLE_TITLES:
        raise HTTPException(status_code=400, detail="Vai trò nhân viên không hợp lệ.")

    try:
        response = (
            get_supabase_client()
            .table("employees")
            .update(
                {
                    "full_name": full_name,
                    "department": department,
                    "role_title": role_title,
                    "employment_status": employment_status,
                }
            )
            .eq("id", employee_id)
            .select(EMPLOYEE_SELECT_COLUMNS)
            .execute()
        )
    except RuntimeError as caught:
        raise HTTPException(status_code=500, detail=str(caught)) from caught
    except Exception as caught:
        raise HTTPException(status_code=502, detail=f"Lỗi khi cập nhật nhân viên trên Supabase: {caught}") from caught

    rows = response.data or []
    if len(rows) == 0:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhân viên với ID đã cho.")

    return _format_employee(rows[0])


def _vector_literal(values: list[float]) -> str:
    return "[" + ",".join(f"{value:.10f}" for value in values) + "]"


def _extension_from_filename(filename: str, content_type: str) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix:
        return suffix
    return {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
    }.get(content_type, ".jpg")


def _ensure_face_bucket() -> None:
    settings = get_settings()
    client = get_supabase_client()

    try:
        client.storage.get_bucket(settings.supabase_face_images_bucket)
    except Exception:
        try:
            client.storage.create_bucket(
                settings.supabase_face_images_bucket,
                options={
                    "public": True,
                    "allowed_mime_types": sorted(ALLOWED_FACE_IMAGE_TYPES),
                },
            )
        except Exception as caught:
            raise HTTPException(
                status_code=502,
                detail="Không tạo hoặc truy cập được Supabase Storage bucket lưu ảnh khuôn mặt.",
            ) from caught


def _upload_face_image(employee_id: str, filename: str, content_type: str, image_bytes: bytes) -> tuple[str, str]:
    settings = get_settings()
    _ensure_face_bucket()

    extension = _extension_from_filename(filename, content_type)
    object_path = f"employees/{employee_id}/{uuid4().hex}{extension}"

    try:
        bucket = get_supabase_client().storage.from_(settings.supabase_face_images_bucket)
        bucket.upload(
            object_path,
            image_bytes,
            file_options={
                "cache-control": "3600",
                "content-type": content_type,
                "upsert": "false",
            },
        )
        image_url = bucket.get_public_url(object_path)
    except Exception as caught:
        raise HTTPException(status_code=502, detail="Không upload được ảnh khuôn mặt lên Supabase Storage.") from caught

    return object_path, image_url


def register_face_profile(employee_id: str, filename: str, content_type: str, image_bytes: bytes) -> dict:
    if content_type not in ALLOWED_FACE_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Định dạng ảnh không được hỗ trợ.")

    try:
        employee_response = (
            get_supabase_client()
            .table("employees")
            .select("id, employee_code, full_name")
            .eq("id", employee_id)
            .single()
            .execute()
        )
    except Exception as caught:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhân viên.") from caught

    try:
        embedding = extract_embedding(image_bytes)
    except Exception as caught:
        raise HTTPException(status_code=422, detail="Không tạo được embedding từ ảnh. Vui lòng chọn ảnh rõ khuôn mặt.") from caught

    object_path, image_url = _upload_face_image(employee_id, filename, content_type, image_bytes)

    try:
        profile_response = (
            get_supabase_client()
            .table("face_profiles")
            .insert(
                {
                    "employee_id": employee_id,
                    "embedding": _vector_literal(embedding),
                    "image_path": image_url,
                    "status": "active",
                }
            )
            .execute()
        )
    except Exception as caught:
        raise HTTPException(status_code=502, detail="Không lưu được face profile vào Supabase.") from caught

    profile = (profile_response.data or [{}])[0]
    return {
        "employee": employee_response.data,
        "face_profile": {
            "id": profile.get("id"),
            "employee_id": employee_id,
            "image_path": image_url,
            "object_path": object_path,
            "status": profile.get("status", "active"),
            "registered_at": profile.get("registered_at"),
        },
    }
