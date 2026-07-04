from __future__ import annotations

import ast
from datetime import datetime, time, timedelta, timezone
from math import sqrt
from typing import Any

from fastapi import HTTPException

from app.services.face_engine import extract_embedding
from app.services.supabase_client import get_supabase_client


MATCH_THRESHOLD = 0.4


def _parse_embedding(value: Any) -> list[float]:
    if isinstance(value, list):
        return [float(item) for item in value]
    if isinstance(value, str):
        return [float(item) for item in ast.literal_eval(value)]
    raise ValueError("Unsupported embedding format")


def _cosine_distance(first: list[float], second: list[float]) -> float:
    dot = sum(a * b for a, b in zip(first, second))
    first_norm = sqrt(sum(a * a for a in first))
    second_norm = sqrt(sum(b * b for b in second))
    if first_norm == 0 or second_norm == 0:
        return 1.0
    return float(1 - dot / (first_norm * second_norm))


def _parse_time(time_str: str) -> time:
    parts = list(map(int, time_str.split(":")))
    return time(parts[0], parts[1], parts[2] if len(parts) > 2 else 0)


def _is_late(check_in_dt: datetime, shift_start_str: str, late_after_min: int) -> bool:
    vn_tz = timezone(timedelta(hours=7))
    if check_in_dt.tzinfo is None:
        check_in_vn = check_in_dt.replace(tzinfo=vn_tz)
    else:
        check_in_vn = check_in_dt.astimezone(vn_tz)
        
    shift_start = _parse_time(shift_start_str)
    shift_start_dt = datetime.combine(check_in_vn.date(), shift_start, vn_tz)
    delta = check_in_vn - shift_start_dt
    return delta.total_seconds() > late_after_min * 60


def _is_early(check_out_dt: datetime, shift_end_str: str, early_before_min: int) -> bool:
    vn_tz = timezone(timedelta(hours=7))
    if check_out_dt.tzinfo is None:
        check_out_vn = check_out_dt.replace(tzinfo=vn_tz)
    else:
        check_out_vn = check_out_dt.astimezone(vn_tz)
        
    shift_end = _parse_time(shift_end_str)
    shift_end_dt = datetime.combine(check_out_vn.date(), shift_end, vn_tz)
    delta = shift_end_dt - check_out_vn
    return delta.total_seconds() > early_before_min * 60


def _ensure_evidence_bucket() -> None:
    client = get_supabase_client()
    try:
        client.storage.get_bucket("attendance-evidence")
    except Exception:
        try:
            client.storage.create_bucket(
                "attendance-evidence",
                options={
                    "public": True,
                    "allowed_mime_types": ["image/jpeg", "image/png", "image/webp"],
                },
            )
        except Exception as caught:
            raise HTTPException(
                status_code=502,
                detail="Không tạo hoặc truy cập được Supabase Storage bucket lưu ảnh minh chứng điểm danh.",
            ) from caught


def _upload_evidence_image(employee_id: str, filename: str, content_type: str, image_bytes: bytes) -> tuple[str, str]:
    _ensure_evidence_bucket()
    from uuid import uuid4
    from pathlib import Path
    suffix = Path(filename).suffix.lower() or ".jpg"
    object_path = f"attendance/{employee_id}/{uuid4().hex}{suffix}"
    try:
        bucket = get_supabase_client().storage.from_("attendance-evidence")
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
        raise HTTPException(status_code=502, detail="Không upload được ảnh minh chứng lên Supabase Storage.") from caught
    return object_path, image_url


def verify_attendance_image(filename: str, content_type: str, image_bytes: bytes, mode: str = "check-in") -> dict:
    if content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(status_code=400, detail="Định dạng ảnh không được hỗ trợ.")

    try:
        probe_embedding = extract_embedding(image_bytes)
    except Exception as caught:
        raise HTTPException(status_code=422, detail="Không tạo được embedding từ ảnh điểm danh.") from caught

    try:
        response = (
            get_supabase_client()
            .table("face_profiles")
            .select(
                "id, employee_id, embedding, image_path, "
                "employees(id, employee_code, full_name, department, role_title)"
            )
            .eq("status", "active")
            .execute()
        )
    except Exception as caught:
        raise HTTPException(status_code=502, detail="Không lấy được dữ liệu khuôn mặt đã đăng ký.") from caught

    profiles = response.data or []
    if not profiles:
        return {
            "matched": False,
            "mode": mode,
            "filename": filename,
            "reason": "Chưa có face profile nào để so khớp.",
            "threshold": MATCH_THRESHOLD,
            "best_distance": None,
            "employee": None,
            "record": None,
        }

    scored_profiles = []
    for profile in profiles:
        try:
            registered_embedding = _parse_embedding(profile["embedding"])
            distance = _cosine_distance(probe_embedding, registered_embedding)
        except Exception:
            continue
        scored_profiles.append((distance, profile))

    if not scored_profiles:
        raise HTTPException(status_code=422, detail="Không đọc được embedding đã đăng ký.")

    scored_profiles.sort(key=lambda item: item[0])
    best_distance, best_profile = scored_profiles[0]
    second_distance = scored_profiles[1][0] if len(scored_profiles) > 1 else None
    matched = best_distance <= MATCH_THRESHOLD
    employee = None
    if matched:
        raw_employee = best_profile.get("employees")
        if raw_employee:
            # Attach the face image URL from the matched profile so the frontend can display it
            employee = {
                **raw_employee,
                "face_image_url": best_profile.get("image_path") or None,
            }

    record_details = None
    if matched and employee:
        employee_id = employee["id"]
        vn_tz = timezone(timedelta(hours=7))
        now_vn = datetime.now(vn_tz)
        attendance_date = str(now_vn.date())

        evidence_path, evidence_url = _upload_evidence_image(employee_id, filename, content_type, image_bytes)

        shift_id = None
        shift_details = None
        try:
            client = get_supabase_client()
            assign_res = (
                client.table("shift_assignments")
                .select("shift_id, work_shifts(*)")
                .eq("employee_id", employee_id)
                .lte("effective_from", attendance_date)
                .execute()
            )
            active_assignment = None
            for assign in (assign_res.data or []):
                eff_to = assign.get("effective_to")
                if not eff_to or eff_to >= attendance_date:
                    active_assignment = assign
                    break
            
            if active_assignment:
                shift_id = active_assignment.get("shift_id")
                shift_details = active_assignment.get("work_shifts")
        except Exception:
            pass

        record_id = None
        check_in_at = None
        check_out_at = None
        status = "valid"
        
        try:
            client = get_supabase_client()
            existing_res = (
                client.table("attendance_records")
                .select("*")
                .eq("employee_id", employee_id)
                .eq("attendance_date", attendance_date)
                .execute()
            )
            existing_records = existing_res.data or []
            
            if len(existing_records) > 0:
                record = existing_records[0]
                record_id = record["id"]
                check_in_at_str = record.get("check_in_at")
                check_out_at_str = record.get("check_out_at")
                
                check_in_at = datetime.fromisoformat(check_in_at_str) if check_in_at_str else None
                check_out_at = datetime.fromisoformat(check_out_at_str) if check_out_at_str else None
                
                if mode == "check-in":
                    if not check_in_at:
                        check_in_at = now_vn
                else:
                    check_out_at = now_vn
                
                if shift_details:
                    start_time_str = shift_details.get("start_time")
                    end_time_str = shift_details.get("end_time")
                    late_min = shift_details.get("late_after_minutes", 10)
                    early_min = shift_details.get("early_before_minutes", 15)
                    
                    is_late_val = check_in_at and _is_late(check_in_at, start_time_str, late_min)
                    is_early_val = check_out_at and _is_early(check_out_at, end_time_str, early_min)
                    
                    if is_late_val:
                        status = "late"
                    elif is_early_val:
                        status = "early"
                    else:
                        status = "valid"
                else:
                    status = "valid"
                
                update_payload = {
                    "check_in_at": check_in_at.isoformat() if check_in_at else None,
                    "check_out_at": check_out_at.isoformat() if check_out_at else None,
                    "status": status,
                    "match_distance": best_distance,
                    "evidence_path": evidence_url
                }
                if shift_id:
                    update_payload["shift_id"] = shift_id
                
                client.table("attendance_records").update(update_payload).eq("id", record_id).execute()
            else:
                if mode == "check-in":
                    check_in_at = now_vn
                else:
                    check_out_at = now_vn
                
                if shift_details:
                    start_time_str = shift_details.get("start_time")
                    end_time_str = shift_details.get("end_time")
                    late_min = shift_details.get("late_after_minutes", 10)
                    early_min = shift_details.get("early_before_minutes", 15)
                    
                    is_late_val = check_in_at and _is_late(check_in_at, start_time_str, late_min)
                    is_early_val = check_out_at and _is_early(check_out_at, end_time_str, early_min)
                    
                    if is_late_val:
                        status = "late"
                    elif is_early_val:
                        status = "early"
                    else:
                        status = "valid"
                else:
                    status = "valid"
                
                insert_payload = {
                    "employee_id": employee_id,
                    "attendance_date": attendance_date,
                    "check_in_at": check_in_at.isoformat() if check_in_at else None,
                    "check_out_at": check_out_at.isoformat() if check_out_at else None,
                    "status": status,
                    "match_distance": best_distance,
                    "evidence_path": evidence_url
                }
                if shift_id:
                    insert_payload["shift_id"] = shift_id
                
                client.table("attendance_records").insert(insert_payload).execute()
                
            record_details = {
                "attendance_date": attendance_date,
                "check_in_at": check_in_at.isoformat() if check_in_at else None,
                "check_out_at": check_out_at.isoformat() if check_out_at else None,
                "status": status,
                "evidence_path": evidence_url,
                "shift_name": shift_details.get("name") if shift_details else None,
                "start_time": shift_details.get("start_time") if shift_details else None,
                "end_time": shift_details.get("end_time") if shift_details else None,
            }
        except Exception as caught:
            raise HTTPException(status_code=502, detail=f"Không lưu được bản ghi điểm danh vào cơ sở dữ liệu: {caught}") from caught

    return {
        "matched": matched,
        "mode": mode,
        "filename": filename,
        "threshold": MATCH_THRESHOLD,
        "best_distance": best_distance,
        "second_distance": second_distance,
        "reason": None if matched else "Không nhận diện chắc chắn với ngưỡng hiện tại.",
        "employee": employee,
        "face_profile_id": best_profile.get("id") if matched else None,
        "record": record_details,
    }
