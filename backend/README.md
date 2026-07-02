# Backend API

FastAPI service phục vụ cho hệ thống điểm danh bằng khuôn mặt.

## Chạy Local

Thực hiện các lệnh sau để cài đặt và khởi chạy:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -r ../face-service/conv-facenet/requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Cập nhật file `backend/.env` bằng các giá trị thực tế từ dự án Supabase của bạn:

```text
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

> [!WARNING]
> `SUPABASE_SERVICE_ROLE_KEY` chứa toàn quyền quản trị và chỉ được sử dụng ở phía backend. Tuyệt đối không được đưa key này vào mã nguồn frontend, đẩy lên GitHub hoặc khai báo trong các biến môi trường có tiền tố public.

## Các Route API Chính

- `GET /health`: Kiểm tra trạng thái hoạt động (sức khỏe) của server.
- `POST /auth/login`: Đăng nhập bằng email/password, trả về token, thông tin người dùng và hồ sơ nhân viên liên quan.
- `POST /face/embedding`: Upload 1 hình ảnh khuôn mặt, trả về vector đặc trưng 128 chiều.
- `POST /face/verify`: Upload 2 hình ảnh khuôn mặt, so khớp và trả về kết quả xem có phải là cùng một người hay không.

## Cấu Trúc Thư Mục Backend

```text
app/
├── main.py                 # Khởi tạo ứng dụng FastAPI, middleware và tích hợp router tổng
├── api/
│   ├── router.py           # Gom tất cả các router của các module lại với nhau
│   └── routes/
│       ├── auth.py         # API đăng nhập thông qua Supabase Auth
│       ├── health.py       # API kiểm tra trạng thái hoạt động (health check)
│       └── face.py         # API xử lý các tác vụ nhận diện khuôn mặt
├── core/
│   └── config.py           # Cấu hình đường dẫn, biến môi trường (env) và các tham số hệ thống
└── services/
    ├── auth_service.py     # Logic đăng nhập và lấy thông tin hồ sơ nhân viên
    ├── face_engine.py      # Logic kết nối và gọi model nhận diện Conv-FaceNet
    └── supabase_client.py  # Khởi tạo Supabase client sử dụng service role trong backend
```

Khi thêm API mới, hãy tạo file route tương ứng trong thư mục `app/api/routes/`, sau đó đăng ký (include) router đó vào trong file `app/api/router.py`.
