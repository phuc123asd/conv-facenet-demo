from fastapi import APIRouter, File, Form, UploadFile

from app.services.attendance_service import (
    recognize_attendance_face,
    recognize_attendance_face_batch,
    verify_attendance_image,
)


router = APIRouter(prefix="/attendance", tags=["attendance"])


@router.post("/verify-image")
async def verify_image_attendance(
    image: UploadFile = File(...),
    mode: str = Form("check-in"),
):
    return verify_attendance_image(
        filename=image.filename or "attendance.jpg",
        content_type=image.content_type or "application/octet-stream",
        image_bytes=await image.read(),
        mode=mode,
    )


@router.post("/recognize-frame")
async def recognize_camera_frame(
    image: UploadFile = File(...),
    mode: str = Form("check-in"),
):
    return recognize_attendance_face(
        filename=image.filename or "camera-frame.jpg",
        content_type=image.content_type or "application/octet-stream",
        image_bytes=await image.read(),
        mode=mode,
    )


@router.post("/recognize-batch")
async def recognize_camera_batch(
    images: list[UploadFile] = File(...),
    mode: str = Form("check-in"),
):
    files = [
        (
            image.filename or f"camera-frame-{index + 1}.jpg",
            image.content_type or "application/octet-stream",
            await image.read(),
        )
        for index, image in enumerate(images)
    ]
    return recognize_attendance_face_batch(files=files, mode=mode)


@router.get("/records")
def get_records(
    employee_id: str | None = None,
    from_date: str | None = None,
    to_date: str | None = None,
    status: str | None = None,
):
    from app.services.supabase_client import get_supabase_client
    client = get_supabase_client()
    query = client.table("attendance_records").select(
        "*, employees(id, full_name, employee_code, department)"
    )
    if employee_id:
        query = query.eq("employee_id", employee_id)
    if from_date:
        query = query.gte("attendance_date", from_date)
    if to_date:
        query = query.lte("attendance_date", to_date)
    if status:
        # Map statuses from VietNamese UI filters if needed
        # We can handle both DB values ('valid', 'late', 'early') and Vietnamese UI text
        if status in ("Hợp lệ", "valid"):
            query = query.eq("status", "valid")
        elif status in ("Đi muộn", "late"):
            query = query.eq("status", "late")
        elif status in ("Về sớm", "early"):
            query = query.eq("status", "early")
        else:
            query = query.eq("status", status)
    
    query = query.order("attendance_date", desc=True).order("check_in_at", desc=True)
    res = query.execute()
    return {"records": res.data or []}


@router.get("/stats")
def get_stats():
    from app.services.supabase_client import get_supabase_client
    from datetime import datetime, timezone, timedelta
    vn_tz = timezone(timedelta(hours=7))
    today_str = str(datetime.now(vn_tz).date())
    
    client = get_supabase_client()
    
    # 1. Total employees
    emp_res = client.table("employees").select("id", count="exact").eq("employment_status", "active").execute()
    total_employees = emp_res.count or 0
    if not total_employees and emp_res.data:
        total_employees = len(emp_res.data)
        
    # 2. Today's records
    att_res = client.table("attendance_records").select("*").eq("attendance_date", today_str).execute()
    today_records = att_res.data or []
    
    present_count = len(today_records)
    late_count = sum(1 for r in today_records if r.get("status") == "late")
    early_count = sum(1 for r in today_records if r.get("status") == "early")
    absent_count = max(0, total_employees - present_count)
    
    liveness_scores = [r.get("liveness_score") for r in today_records if r.get("liveness_score") is not None]
    liveness_rate = 98.0
    if liveness_scores:
        liveness_rate = round((sum(1 for s in liveness_scores if s >= 0.8) / len(liveness_scores)) * 100, 1)
        
    # 3. Spoofing alerts
    alert_res = client.table("spoofing_alerts").select("id", count="exact").gte("created_at", today_str + "T00:00:00").execute()
    alert_count = alert_res.count or 0
    if not alert_count and alert_res.data:
        alert_count = len(alert_res.data)
        
    recent_alerts_res = (
        client.table("spoofing_alerts")
        .select("*, employees(full_name)")
        .order("created_at", desc=True)
        .limit(5)
        .execute()
    )
    recent_alerts = recent_alerts_res.data or []
    
    return {
        "total_employees": total_employees,
        "present_count": present_count,
        "absent_count": absent_count,
        "late_count": late_count,
        "early_count": early_count,
        "liveness_rate": liveness_rate,
        "alert_count": alert_count,
        "recent_alerts": recent_alerts,
    }
