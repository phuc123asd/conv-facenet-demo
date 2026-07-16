from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone

from fastapi import HTTPException

from app.services.supabase_client import get_supabase_client


VN_TZ = timezone(timedelta(hours=7))
ADJUSTMENT_SELECT = (
    "*, "
    "employees(id, full_name, employee_code, department), "
    "attendance_records(id, attendance_date, check_in_at, check_out_at, status, shift_id)"
)


def _parse_datetime(value: datetime | str | None) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        parsed = value
    else:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=VN_TZ)
    return parsed


def _to_iso(value: datetime | str | None) -> str | None:
    parsed = _parse_datetime(value)
    return parsed.isoformat() if parsed else None


def _parse_time(value: str) -> time:
    hours, minutes, *seconds = (int(part) for part in value.split(":"))
    return time(hours, minutes, seconds[0] if seconds else 0)


def _attendance_date_from(value: datetime | str | None) -> str:
    parsed = _parse_datetime(value)
    if parsed is None:
        raise HTTPException(status_code=400, detail="Không xác định được ngày công cần điều chỉnh.")
    return str(parsed.astimezone(VN_TZ).date())


def _calculate_status(
    check_in_at: datetime | str | None,
    check_out_at: datetime | str | None,
    attendance_date: str,
    shift: dict | None,
) -> str:
    if not shift:
        return "valid"

    work_date = date.fromisoformat(attendance_date)
    check_in = _parse_datetime(check_in_at)
    check_out = _parse_datetime(check_out_at)
    start_time = shift.get("start_time")
    end_time = shift.get("end_time")

    if check_in and start_time:
        start_at = datetime.combine(work_date, _parse_time(start_time), VN_TZ)
        allowed_late = int(shift.get("late_after_minutes") or 0)
        if (check_in.astimezone(VN_TZ) - start_at).total_seconds() > allowed_late * 60:
            return "late"

    if check_out and end_time:
        end_at = datetime.combine(work_date, _parse_time(end_time), VN_TZ)
        allowed_early = int(shift.get("early_before_minutes") or 0)
        if (end_at - check_out.astimezone(VN_TZ)).total_seconds() > allowed_early * 60:
            return "early"

    return "valid"


def _get_shift(client, employee_id: str, attendance_date: str, shift_id: str | None) -> tuple[str | None, dict | None]:
    if shift_id:
        response = client.table("work_shifts").select("*").eq("id", shift_id).limit(1).execute()
        rows = response.data or []
        if rows:
            return shift_id, rows[0]

    response = (
        client.table("shift_assignments")
        .select("shift_id, effective_from, effective_to, work_shifts(*)")
        .eq("employee_id", employee_id)
        .lte("effective_from", attendance_date)
        .order("effective_from", desc=True)
        .execute()
    )
    for assignment in response.data or []:
        effective_to = assignment.get("effective_to")
        if not effective_to or effective_to >= attendance_date:
            return assignment.get("shift_id"), assignment.get("work_shifts")
    return None, None


def _fetch_adjustment(client, request_id: str) -> dict:
    response = (
        client.table("attendance_adjustment_requests")
        .select(ADJUSTMENT_SELECT)
        .eq("id", request_id)
        .limit(1)
        .execute()
    )
    rows = response.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu chỉnh sửa công.")
    return rows[0]


def list_adjustments(status: str | None = None, employee_id: str | None = None) -> list[dict]:
    try:
        client = get_supabase_client()
        query = client.table("attendance_adjustment_requests").select(ADJUSTMENT_SELECT)
        if status:
            query = query.eq("status", status)
        if employee_id:
            query = query.eq("employee_id", employee_id)
        response = query.order("created_at", desc=True).execute()
        return response.data or []
    except HTTPException:
        raise
    except Exception as caught:
        raise HTTPException(status_code=502, detail=f"Không tải được yêu cầu chỉnh sửa công: {caught}") from caught


def create_adjustment(
    *,
    employee_id: str,
    reason: str,
    attendance_id: str | None = None,
    requested_check_in_at: datetime | None = None,
    requested_check_out_at: datetime | None = None,
) -> dict:
    reason = reason.strip()
    if not reason:
        raise HTTPException(status_code=400, detail="Vui lòng nhập lý do chỉnh sửa công.")
    if requested_check_in_at is None and requested_check_out_at is None:
        raise HTTPException(status_code=400, detail="Cần nhập ít nhất giờ vào hoặc giờ ra đề nghị.")

    try:
        client = get_supabase_client()
        if attendance_id:
            record_response = (
                client.table("attendance_records")
                .select("id, employee_id")
                .eq("id", attendance_id)
                .limit(1)
                .execute()
            )
            records = record_response.data or []
            if not records:
                raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi chấm công cần sửa.")
            if records[0].get("employee_id") != employee_id:
                raise HTTPException(status_code=400, detail="Bản ghi chấm công không thuộc nhân viên đã chọn.")

            pending_response = (
                client.table("attendance_adjustment_requests")
                .select("id")
                .eq("attendance_id", attendance_id)
                .eq("status", "pending")
                .limit(1)
                .execute()
            )
            if pending_response.data:
                raise HTTPException(status_code=409, detail="Bản ghi này đã có một yêu cầu đang chờ duyệt.")
        else:
            employee_response = (
                client.table("employees").select("id").eq("id", employee_id).limit(1).execute()
            )
            if not employee_response.data:
                raise HTTPException(status_code=404, detail="Không tìm thấy nhân viên gửi yêu cầu.")

        insert_response = client.table("attendance_adjustment_requests").insert(
            {
                "attendance_id": attendance_id,
                "employee_id": employee_id,
                "reason": reason,
                "requested_check_in_at": _to_iso(requested_check_in_at),
                "requested_check_out_at": _to_iso(requested_check_out_at),
                "status": "pending",
            }
        ).execute()
        rows = insert_response.data or []
        if not rows:
            raise HTTPException(status_code=502, detail="Supabase không trả về yêu cầu vừa tạo.")
        return _fetch_adjustment(client, rows[0]["id"])
    except HTTPException:
        raise
    except Exception as caught:
        raise HTTPException(status_code=502, detail=f"Không tạo được yêu cầu chỉnh sửa công: {caught}") from caught


def _apply_approved_request(client, adjustment: dict) -> str:
    attendance_id = adjustment.get("attendance_id")
    employee_id = adjustment["employee_id"]
    record = None

    if attendance_id:
        record_response = (
            client.table("attendance_records").select("*").eq("id", attendance_id).limit(1).execute()
        )
        records = record_response.data or []
        if not records:
            raise HTTPException(status_code=404, detail="Bản ghi chấm công cần sửa không còn tồn tại.")
        record = records[0]
        if record.get("employee_id") != employee_id:
            raise HTTPException(status_code=400, detail="Yêu cầu không khớp với chủ sở hữu bản ghi chấm công.")

    requested_check_in = adjustment.get("requested_check_in_at")
    requested_check_out = adjustment.get("requested_check_out_at")
    attendance_date = (
        record.get("attendance_date")
        if record
        else _attendance_date_from(requested_check_in or requested_check_out)
    )

    if record is None:
        existing_response = (
            client.table("attendance_records")
            .select("*")
            .eq("employee_id", employee_id)
            .eq("attendance_date", attendance_date)
            .limit(1)
            .execute()
        )
        existing_records = existing_response.data or []
        record = existing_records[0] if existing_records else None

    check_in_at = requested_check_in if requested_check_in is not None else (record or {}).get("check_in_at")
    check_out_at = requested_check_out if requested_check_out is not None else (record or {}).get("check_out_at")
    shift_id, shift = _get_shift(client, employee_id, attendance_date, (record or {}).get("shift_id"))
    status = _calculate_status(check_in_at, check_out_at, attendance_date, shift)

    payload = {
        "employee_id": employee_id,
        "attendance_date": attendance_date,
        "check_in_at": _to_iso(check_in_at),
        "check_out_at": _to_iso(check_out_at),
        "status": status,
    }
    if shift_id:
        payload["shift_id"] = shift_id

    if record:
        response = client.table("attendance_records").update(payload).eq("id", record["id"]).execute()
    else:
        response = client.table("attendance_records").insert(payload).execute()
    rows = response.data or []
    if not rows:
        raise HTTPException(status_code=502, detail="Không cập nhật được bản ghi chấm công sau khi duyệt.")
    return rows[0]["id"]


def review_adjustment(request_id: str, action: str, reviewed_by: str | None = None) -> dict:
    if action not in {"approved", "rejected"}:
        raise HTTPException(status_code=400, detail="Trạng thái duyệt không hợp lệ.")

    try:
        client = get_supabase_client()
        adjustment = _fetch_adjustment(client, request_id)
        if adjustment.get("status") != "pending":
            raise HTTPException(status_code=409, detail="Yêu cầu này đã được xử lý trước đó.")

        attendance_id = adjustment.get("attendance_id")
        if action == "approved":
            attendance_id = _apply_approved_request(client, adjustment)

        review_payload = {
            "status": action,
            "reviewed_by": reviewed_by,
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
        }
        if attendance_id:
            review_payload["attendance_id"] = attendance_id

        response = (
            client.table("attendance_adjustment_requests")
            .update(review_payload)
            .eq("id", request_id)
            .eq("status", "pending")
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=409, detail="Yêu cầu vừa được xử lý bởi một phiên khác.")
        return _fetch_adjustment(client, request_id)
    except HTTPException:
        raise
    except Exception as caught:
        raise HTTPException(status_code=502, detail=f"Không xử lý được yêu cầu chỉnh sửa công: {caught}") from caught
