import os
import sys
from io import BytesIO
from pathlib import Path

import numpy as np
from PIL import Image

from app.core.config import FACE_MODEL_DIR, FACE_MODEL_SRC


def _ensure_convfacenet_importable() -> None:
    src_path = str(FACE_MODEL_SRC)
    if src_path not in sys.path:
        sys.path.insert(0, src_path)


def _load_image(image_bytes: bytes) -> Image.Image:
    return Image.open(BytesIO(image_bytes)).convert("RGB")


def _run_from_model_dir():
    class ModelDirContext:
        def __enter__(self):
            self.previous_cwd = Path.cwd()
            os.chdir(FACE_MODEL_DIR)

        def __exit__(self, exc_type, exc, traceback):
            os.chdir(self.previous_cwd)

    return ModelDirContext()


def extract_embedding(image_bytes: bytes) -> list[float]:
    _ensure_convfacenet_importable()
    import convfacenet

    image = _load_image(image_bytes)
    with _run_from_model_dir():
        features = convfacenet.faces_features(image)[0]
    return np.asarray(features, dtype=float).tolist()


def verify_faces(first_image: bytes, second_image: bytes, threshold: float = 0.4) -> dict:
    _ensure_convfacenet_importable()
    import convfacenet

    image_a = _load_image(first_image)
    image_b = _load_image(second_image)
    with _run_from_model_dir():
        verified, distance = convfacenet.verify_faces(image_a, image_b, threshold=threshold)

    return {
        "verified": bool(verified),
        "distance": float(distance),
        "threshold": threshold,
    }
