from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[2]
FACE_MODEL_DIR = ROOT_DIR / "face-service" / "conv-facenet"
FACE_MODEL_SRC = FACE_MODEL_DIR / "src"
