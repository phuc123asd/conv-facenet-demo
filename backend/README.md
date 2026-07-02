# Backend API

FastAPI service cho he thong diem danh.

## Chay Local

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -r ../face-service/conv-facenet/requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## API

- `GET /health`: kiem tra server.
- `POST /face/embedding`: upload 1 anh, tra ve vector 128 chieu.
- `POST /face/verify`: upload 2 anh, tra ve ket qua so khop.
