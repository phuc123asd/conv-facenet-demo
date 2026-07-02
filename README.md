# Hệ Thống Điểm Danh Bằng Khuôn Mặt (Face Attendance System)

Dự án gồm ứng dụng web điểm danh, backend API và module nhận diện khuôn mặt Conv-FaceNet.

## Cấu Trúc Dự Án

```text
.
├── frontend/                 # React + Vite: Kiosk và Admin Portal
├── backend/                  # FastAPI: nghiệp vụ điểm danh và API nhận diện
│   └── app/
│       ├── api/              # Các route API
│       ├── services/         # Kết nối face engine, cơ sở dữ liệu, logic điểm danh
│       └── main.py
├── face-service/
│   └── conv-facenet/         # Thư viện/model nhận diện khuôn mặt hiện tại
├── database/
│   └── supabase/             # Migration SQL cho Supabase/PostgreSQL
└── work/                     # Cache và các công cụ (tooling) local
```

## Vai Trò Từng Phần

- `frontend/`: Giao diện dành cho kiosk check-in, quản trị viên (admin), nhân viên, quản lý ca làm và báo cáo.
- `backend/`: API trung gian kết nối frontend, xử lý nghiệp vụ và gọi model nhận diện khuôn mặt.
- `face-service/conv-facenet/`: Mã nguồn của model Conv-FaceNet, bao gồm bộ phát hiện (detector), bộ trích xuất đặc trưng (descriptor), và trọng số model (weights).
- `database/supabase/`: Schema cơ sở dữ liệu cloud quản lý nhân viên, thông tin điểm danh, ca làm việc, thiết bị kiosk và nhật ký hệ thống (audit log).

## Luồng Xử Lý

```text
Frontend React
  -> Backend FastAPI
  -> face-service/conv-facenet (Xử lý nhận diện)
  -> Supabase PostgreSQL (Truy vấn / Lưu trữ dữ liệu)
  -> Supabase Storage (Lưu trữ ảnh check-in)
```

## Chạy Frontend

Chạy các lệnh sau trong thư mục `frontend`:

```bash
cd frontend
npm install
npm run dev
```

Mặc định, ứng dụng web sẽ chạy tại:

```text
http://127.0.0.1:5173/
```

## Chạy Backend

Chạy các lệnh sau để thiết lập môi trường ảo và khởi chạy backend FastAPI:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -r ../face-service/conv-facenet/requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Kiểm tra trạng thái backend:

- Kiểm tra sức khỏe hệ thống: `GET http://127.0.0.1:8000/health`
- Đối sánh hai khuôn mặt: `POST http://127.0.0.1:8000/face/verify`
- Trích xuất đặc trưng khuôn mặt: `POST http://127.0.0.1:8000/face/embedding`

## Cơ Sở Dữ Liệu (Database)

Các file cấu hình migration của Supabase được đặt tại:

```text
database/supabase/001_initial_schema.sql
```

Các bảng dữ liệu chính bao gồm:

- `employees` (Thông tin nhân viên)
- `face_profiles` (Thông tin vector khuôn mặt)
- `work_shifts` (Ca làm việc)
- `shift_assignments` (Phân ca làm việc)
- `kiosk_devices` (Thiết bị Kiosk đăng ký)
- `attendance_records` (Lịch sử điểm danh)
- `attendance_adjustment_requests` (Yêu cầu điều chỉnh công)
- `spoofing_alerts` (Cảnh báo giả mạo)
- `audit_logs` (Nhật ký hoạt động hệ thống)

## Ghi Chú

`conv-facenet` hiện đang hoạt động như một package Python độc lập. Để các đường dẫn chứa trọng số (weights) cũ hoạt động chính xác, Backend sẽ thêm đường dẫn `face-service/conv-facenet/src` vào import path của hệ thống và chạy model trực tiếp từ thư mục `face-service/conv-facenet`.
