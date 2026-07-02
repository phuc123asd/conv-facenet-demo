from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.face import router as face_router


app = FastAPI(title="Face Attendance API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(face_router)
