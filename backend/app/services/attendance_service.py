from __future__ import annotations

import ast
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
    employee = best_profile.get("employees") if matched else None

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
    }
