# Face Attendance System

Du an gom web diem danh, backend API va module nhan dien guong mat Conv-FaceNet.

## Cau Truc

```text
.
├── frontend/                 # React + Vite: Kiosk va Admin Portal
├── backend/                  # FastAPI: nghiep vu diem danh va API nhan dien
│   └── app/
│       ├── api/              # Route API
│       ├── services/         # Ket noi face engine, database, attendance logic
│       └── main.py
├── face-service/
│   └── conv-facenet/         # Thu vien/model nhan dien guong mat hien co
├── database/
│   └── supabase/             # Migration SQL cho Supabase/PostgreSQL
└── work/                     # Cache/tooling local
```

## Vai Tro Tung Phan

- `frontend/`: giao dien kiosk check-in, admin, nhan vien, ca lam, bao cao.
- `backend/`: API trung gian cho frontend, xu ly nghiep vu, goi model nhan dien.
- `face-service/conv-facenet/`: code model Conv-FaceNet, detector, descriptor, weights.
- `database/supabase/`: schema cloud database cho nhan vien, diem danh, ca lam, kiosk, audit log.

## Luong Xu Ly

```text
Frontend React
  -> Backend FastAPI
  -> face-service/conv-facenet
  -> Supabase PostgreSQL
  -> Supabase Storage
```

## Chay Frontend

```bash
cd frontend
npm install
npm run dev
```

Mac dinh web chay tai:

```text
http://127.0.0.1:5173/
```

## Chay Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -r ../face-service/conv-facenet/requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Kiem tra backend:

```text
GET http://127.0.0.1:8000/health
POST http://127.0.0.1:8000/face/verify
POST http://127.0.0.1:8000/face/embedding
```

## Database

Migration Supabase nam tai:

```text
database/supabase/001_initial_schema.sql
```

Bang chinh:

- `employees`
- `face_profiles`
- `work_shifts`
- `shift_assignments`
- `kiosk_devices`
- `attendance_records`
- `attendance_adjustment_requests`
- `spoofing_alerts`
- `audit_logs`

## Ghi Chu

`conv-facenet` hien la package Python doc lap. Backend them `face-service/conv-facenet/src` vao import path va chay model tu thu muc `face-service/conv-facenet` de cac duong dan weights cu van hoat dong.
