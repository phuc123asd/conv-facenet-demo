from fastapi import APIRouter, File, Form, UploadFile

from app.services.attendance_service import verify_attendance_image


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
