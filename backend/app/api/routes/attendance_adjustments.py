from datetime import datetime
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.adjustment_service import create_adjustment, list_adjustments, review_adjustment


router = APIRouter(prefix="/attendance/adjustments", tags=["attendance-adjustments"])


class AdjustmentCreateRequest(BaseModel):
    employee_id: str
    reason: str = Field(min_length=3, max_length=1000)
    attendance_id: str | None = None
    requested_check_in_at: datetime | None = None
    requested_check_out_at: datetime | None = None


class AdjustmentReviewRequest(BaseModel):
    action: Literal["approved", "rejected"]
    reviewed_by: str | None = None


@router.get("")
def get_adjustments(
    status: Literal["pending", "approved", "rejected"] | None = None,
    employee_id: str | None = None,
):
    return {"requests": list_adjustments(status=status, employee_id=employee_id)}


@router.post("", status_code=201)
def submit_adjustment(payload: AdjustmentCreateRequest):
    return {
        "request": create_adjustment(
            attendance_id=payload.attendance_id,
            employee_id=payload.employee_id,
            reason=payload.reason,
            requested_check_in_at=payload.requested_check_in_at,
            requested_check_out_at=payload.requested_check_out_at,
        )
    }


@router.patch("/{request_id}/review")
def review_request(request_id: str, payload: AdjustmentReviewRequest):
    return {
        "request": review_adjustment(
            request_id=request_id,
            action=payload.action,
            reviewed_by=payload.reviewed_by,
        )
    }
