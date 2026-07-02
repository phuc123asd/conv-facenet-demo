from pydantic import BaseModel, Field

from fastapi import APIRouter

from app.services.auth_service import login_with_password


router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=6)


@router.post("/login")
def login(payload: LoginRequest):
    return login_with_password(payload.email, payload.password)
