from pydantic import BaseModel
from fastapi import APIRouter, File, UploadFile

from app.services.employee_service import create_employee, list_employees, register_face_profile, update_employee


router = APIRouter(prefix="/employees", tags=["employees"])


class EmployeeCreateRequest(BaseModel):
    employee_code: str | None = None
    full_name: str
    department: str | None = None
    role_title: str | None = None
    employment_status: str = "active"


class EmployeeUpdateRequest(BaseModel):
    full_name: str
    department: str | None = None
    role_title: str
    employment_status: str = "active"


@router.get("")
def get_employees():
    return {"employees": list_employees()}


@router.post("", status_code=201)
def create_employee_record(payload: EmployeeCreateRequest):
    return {
        "employee": create_employee(
            employee_code=payload.employee_code,
            full_name=payload.full_name,
            department=payload.department,
            role_title=payload.role_title,
            employment_status=payload.employment_status,
        )
    }


@router.patch("/{employee_id}")
def update_employee_record(employee_id: str, payload: EmployeeUpdateRequest):
    return {
        "employee": update_employee(
            employee_id=employee_id,
            full_name=payload.full_name,
            department=payload.department,
            role_title=payload.role_title,
            employment_status=payload.employment_status,
        )
    }


@router.post("/{employee_id}/face-profile")
@router.put("/{employee_id}/face-profile")
@router.patch("/{employee_id}/face-profile")
async def create_employee_face_profile(employee_id: str, image: UploadFile = File(...)):
    return register_face_profile(
        employee_id=employee_id,
        filename=image.filename or "face.jpg",
        content_type=image.content_type or "application/octet-stream",
        image_bytes=await image.read(),
    )


@router.delete("/{employee_id}", status_code=204)
def delete_employee_record(employee_id: str):
    from app.services.employee_service import delete_employee
    delete_employee(employee_id)
    return None
