from pathlib import Path
import sys

PROJECT_DIR = Path(__file__).resolve().parent
SRC_DIR = PROJECT_DIR / "src"

if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

import convfacenet

img1 = convfacenet.load_image(PROJECT_DIR / "test1.jpg")
img2 = convfacenet.load_image(PROJECT_DIR / "test2.jpg")

result, distance = convfacenet.verify_faces(img1, img2)

print("Are the faces the same person?", result)
