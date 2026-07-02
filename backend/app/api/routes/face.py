from fastapi import APIRouter, File, Form, UploadFile

from app.services.face_engine import extract_embedding, verify_faces


router = APIRouter(prefix="/face", tags=["face"])


@router.post("/embedding")
async def create_embedding(image: UploadFile = File(...)):
    embedding = extract_embedding(await image.read())
    return {
        "dimension": len(embedding),
        "embedding": embedding,
    }


@router.post("/verify")
async def verify(
    first_image: UploadFile = File(...),
    second_image: UploadFile = File(...),
    threshold: float = Form(0.4),
):
    return verify_faces(
        first_image=await first_image.read(),
        second_image=await second_image.read(),
        threshold=threshold,
    )
