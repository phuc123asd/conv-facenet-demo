from fastapi import APIRouter

from app.api.routes import attendance, attendance_adjustments, auth, employees, face, health, shifts


api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(employees.router)
api_router.include_router(attendance.router)
api_router.include_router(attendance_adjustments.router)
api_router.include_router(face.router)
api_router.include_router(shifts.router)
