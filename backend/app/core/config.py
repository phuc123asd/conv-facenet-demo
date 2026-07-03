from functools import lru_cache
from os import getenv
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parents[3]
BACKEND_DIR = ROOT_DIR / "backend"
FACE_MODEL_DIR = ROOT_DIR / "face-service" / "conv-facenet"
FACE_MODEL_SRC = FACE_MODEL_DIR / "src"

load_dotenv(BACKEND_DIR / ".env")


class Settings:
    def __init__(self) -> None:
        self.supabase_url = getenv("SUPABASE_URL", "").strip()
        self.supabase_service_role_key = getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        self.supabase_face_images_bucket = getenv("SUPABASE_FACE_IMAGES_BUCKET", "face-images").strip()

    def require_supabase(self) -> None:
        missing = []
        if not self.supabase_url:
            missing.append("SUPABASE_URL")
        if not self.supabase_service_role_key:
            missing.append("SUPABASE_SERVICE_ROLE_KEY")
        if missing:
            raise RuntimeError(f"Missing required environment variable(s): {', '.join(missing)}")


@lru_cache
def get_settings() -> Settings:
    return Settings()
