from fastapi import HTTPException, status

from app.services.supabase_client import create_supabase_client


def login_with_password(email: str, password: str) -> dict:
    email = email.strip().lower()
    if "@" not in email:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Email không hợp lệ.",
        )

    auth_client = create_supabase_client()
    admin_client = create_supabase_client()

    try:
        auth_response = auth_client.auth.sign_in_with_password(
            {
                "email": email,
                "password": password,
            }
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không đúng.",
        ) from exc

    user = auth_response.user
    session = auth_response.session
    if user is None or session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Không thể đăng nhập tài khoản này.",
        )

    employee_response = (
        admin_client.table("employees")
        .select("id, auth_user_id, employee_code, full_name, department, role_title, employment_status")
        .eq("auth_user_id", user.id)
        .limit(1)
        .execute()
    )
    employee = employee_response.data[0] if employee_response.data else None

    if employee is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản chưa được liên kết với hồ sơ nhân viên.",
        )

    if employee["employment_status"] != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hồ sơ nhân viên đang không hoạt động.",
        )

    return {
        "access_token": session.access_token,
        "refresh_token": session.refresh_token,
        "token_type": session.token_type,
        "expires_in": session.expires_in,
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.app_metadata.get("role"),
            "employee_code": user.app_metadata.get("employee_code"),
        },
        "employee": employee,
    }
