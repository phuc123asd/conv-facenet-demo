from pydantic import BaseModel
from fastapi import APIRouter, HTTPException

from app.services.supabase_client import get_supabase_client


router = APIRouter(prefix="/shifts", tags=["shifts"])


class ShiftCreateRequest(BaseModel):
    name: str
    start_time: str  # e.g., "08:00:00"
    end_time: str    # e.g., "17:00:00"
    late_after_minutes: int = 10
    early_before_minutes: int = 15


class ShiftUpdateRequest(BaseModel):
    name: str | None = None
    start_time: str | None = None
    end_time: str | None = None
    late_after_minutes: int | None = None
    early_before_minutes: int | None = None


class ShiftAssignRequest(BaseModel):
    employee_id: str
    shift_id: str
    effective_from: str  # e.g. "YYYY-MM-DD"
    effective_to: str | None = None


@router.get("")
def list_shifts():
    try:
        client = get_supabase_client()
        res = client.table("work_shifts").select("*").execute()
        return {"shifts": res.data or []}
    except Exception as caught:
        raise HTTPException(status_code=502, detail=f"Không lấy được danh sách ca làm: {caught}")


@router.post("", status_code=201)
def create_shift(payload: ShiftCreateRequest):
    try:
        client = get_supabase_client()
        res = client.table("work_shifts").insert({
            "name": payload.name,
            "start_time": payload.start_time,
            "end_time": payload.end_time,
            "late_after_minutes": payload.late_after_minutes,
            "early_before_minutes": payload.early_before_minutes
        }).execute()
        
        rows = res.data or []
        if len(rows) == 0:
            raise HTTPException(status_code=502, detail="Supabase không trả về dữ liệu ca làm vừa tạo.")
        return {"shift": rows[0]}
    except Exception as caught:
        raise HTTPException(status_code=502, detail=f"Không tạo được ca làm: {caught}")


@router.patch("/{shift_id}")
def update_shift(shift_id: str, payload: ShiftUpdateRequest):
    try:
        client = get_supabase_client()
        update_data = {}
        if payload.name is not None:
            update_data["name"] = payload.name
        if payload.start_time is not None:
            update_data["start_time"] = payload.start_time
        if payload.end_time is not None:
            update_data["end_time"] = payload.end_time
        if payload.late_after_minutes is not None:
            update_data["late_after_minutes"] = payload.late_after_minutes
        if payload.early_before_minutes is not None:
            update_data["early_before_minutes"] = payload.early_before_minutes
            
        if not update_data:
            raise HTTPException(status_code=400, detail="Không có trường nào để cập nhật.")
            
        res = client.table("work_shifts").update(update_data).eq("id", shift_id).execute()
        rows = res.data or []
        if len(rows) == 0:
            raise HTTPException(status_code=404, detail="Không tìm thấy ca làm để cập nhật.")
        return {"shift": rows[0]}
    except Exception as caught:
        raise HTTPException(status_code=502, detail=f"Không cập nhật được ca làm: {caught}")


@router.delete("/{shift_id}")
def delete_shift(shift_id: str):
    try:
        client = get_supabase_client()
        res = client.table("work_shifts").delete().eq("id", shift_id).execute()
        return {"success": True, "deleted_id": shift_id}
    except Exception as caught:
        raise HTTPException(status_code=502, detail=f"Không xóa được ca làm: {caught}")


@router.post("/assign", status_code=201)
def assign_shift(payload: ShiftAssignRequest):
    try:
        client = get_supabase_client()
        
        # Validate overlap
        existing_res = client.table("shift_assignments").select("*").eq("employee_id", payload.employee_id).execute()
        existing_list = existing_res.data or []
        
        new_from = payload.effective_from
        new_to = payload.effective_to
        nt = None if not new_to else new_to

        for ext in existing_list:
            ext_from = ext["effective_from"]
            ext_to = ext.get("effective_to")
            
            overlap = True
            if ext_to and new_from > ext_to:
                overlap = False
            if nt and ext_from > nt:
                overlap = False
                
            if overlap:
                period_str = f"từ {ext_from} đến {ext_to if ext_to else 'vô hạn'}"
                raise HTTPException(
                    status_code=400,
                    detail=f"Thời gian phân ca bị trùng lặp với ca đã được phân từ trước ({period_str})."
                )

        res = client.table("shift_assignments").insert({
            "employee_id": payload.employee_id,
            "shift_id": payload.shift_id,
            "effective_from": payload.effective_from,
            "effective_to": payload.effective_to
        }).execute()
        
        rows = res.data or []
        if len(rows) == 0:
            raise HTTPException(status_code=502, detail="Supabase không trả về dữ liệu phân ca vừa tạo.")
        return {"assignment": rows[0]}
    except HTTPException as caught:
        raise caught
    except Exception as caught:
        raise HTTPException(status_code=502, detail=f"Không phân được ca làm cho nhân viên: {caught}")


@router.delete("/assign/{assign_id}")
def delete_assignment(assign_id: str):
    try:
        client = get_supabase_client()
        client.table("shift_assignments").delete().eq("id", assign_id).execute()
        return {"success": True, "deleted_id": assign_id}
    except Exception as caught:
        raise HTTPException(status_code=502, detail=f"Không xóa được phân ca: {caught}")
