# Đánh Giá Cấu Trúc Dự Án (Project Structure Review)

## Trước Khi Sắp Xếp

- Mã nguồn Web React nằm ở thư mục gốc.
- Thư mục `conv-facenet` nằm cùng cấp với web, bao gồm cả mã nguồn mô hình, notebook, weights, `.venv` và cấu hình `.git`.
- Chưa có backend riêng để kết nối ứng dụng web với mô hình nhận diện khuôn mặt.
- Chưa có cấu trúc (schema) cơ sở dữ liệu cho Supabase.

## Sau Khi Sắp Xếp

```text
frontend/                  # Giao diện ứng dụng React hiện tại
backend/                   # API dịch vụ FastAPI
face-service/conv-facenet/ # Dự án nhận diện khuôn mặt hiện có
database/supabase/         # SQL migration quản lý schema cơ sở dữ liệu
```

## Lý Do Sắp Xếp

- Giao diện frontend không nên import trực tiếp mô hình AI để chạy các tác vụ trích xuất nặng.
- Backend chịu trách nhiệm xử lý nghiệp vụ điểm danh, phân quyền, kết xuất báo cáo và tương tác trực tiếp với cơ sở dữ liệu.
- Face service giữ mô hình/thư viện nhận dạng độc lập, giúp dễ dàng tách thành microservice GPU riêng biệt khi mở rộng quy mô.
- Thư mục database migration được thiết kế riêng giúp quản lý phiên bản và theo dõi thay đổi cấu trúc bảng rõ ràng.

## Bước Nâng Cấp Tiếp Theo

1. Thực hiện kết nối hoàn chỉnh backend với Supabase.
2. Bổ sung các API quản lý nhân viên, ca làm việc và lịch sử điểm danh.
3. Lưu trữ vector đặc trưng khuôn mặt (face embedding) vào bảng `face_profiles`.
4. Cập nhật frontend để gọi API backend thay vì sử dụng dữ liệu tĩnh (mock data).
5. Tách `conv-facenet` thành một service độc lập nếu có nhu cầu sử dụng GPU chuyên dụng hoặc kết nối nhiều thiết bị kiosk điểm danh.
