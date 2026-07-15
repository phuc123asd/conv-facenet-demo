# Kiến Trúc Hệ Thống (System Architecture)

Tài liệu này mô tả chi tiết kiến trúc, cấu trúc thư mục, vai trò của từng thành phần và luồng xử lý dữ liệu trong hệ thống điểm danh bằng khuôn mặt.

---

## 🛠️ Cấu Trúc Dự Án (Directory Structure)

```text
.
├── frontend/                 # React + Vite: Giao diện Kiosk điểm danh và Admin Portal quản lý
├── backend/                  # FastAPI: Xử lý nghiệp vụ điểm danh và gọi model nhận diện
│   └── app/
│       ├── api/              # Các route API (kiosk, admin, shifts, employees,...)
│       ├── services/         # Logic kết nối cơ sở dữ liệu, face engine, và ca làm việc
│       └── main.py           # Điểm khởi chạy của FastAPI
├── face-service/
│   └── conv-facenet/         # Mô hình nhận diện khuôn mặt Conv-FaceNet (RetinaFace + ConvNeXt)
├── database/
│   └── supabase/             # Bản thiết kế schema SQL và dữ liệu mẫu trên Supabase/PostgreSQL
└── work/                     # Thư mục chứa log/cache cục bộ
```

---

## 🏗️ Vai Trò Của Từng Thành Phần (Component Roles)

- **`frontend/`**: Giao diện người dùng được tối ưu hóa cho hai đối tượng:
  - **Kiosk Mode**: Dành cho nhân viên tự check-in/check-out qua camera.
  - **Admin Portal**: Dành cho quản lý để thêm/sửa/xóa nhân viên, phân ca làm việc, duyệt sửa công, xem lịch sử điểm danh và cấu hình thiết bị.
- **`backend/`**: Máy chủ API trung gian xử lý toàn bộ logic nghiệp vụ hệ thống. Kết nối trực tiếp với Supabase để thực hiện các thao tác CRUD và điều phối các tác vụ nhận diện khuôn mặt.
- **`face-service/conv-facenet/`**: Thư viện lõi chứa mô hình AI (RetinaFace dùng làm detector và ConvNeXt dùng làm descriptor). Nhận ảnh đầu vào từ backend, căn chỉnh khuôn mặt, trích xuất đặc trưng (embedding 128 chiều) và tính toán khoảng cách cosine để so khớp.
- **`database/supabase/`**: Chứa mã SQL migration định nghĩa schema cơ sở dữ liệu trên Supabase/PostgreSQL bao gồm quản lý nhân viên, lịch sử điểm danh, cấu hình ca làm việc, cảnh báo giả mạo (spoofing alerts) và nhật ký hoạt động (audit logs).

---

## 🔄 Luồng Xử Lý Điểm Danh (Check-in / Check-out Flow)

Dưới đây là sơ đồ mô tả luồng gửi dữ liệu và xử lý khi nhân viên đứng trước Kiosk để điểm danh:

```text
  [ Kiosk React ]  ---( Gửi loạt ảnh từ Camera )--->  [ Backend FastAPI ]
                                                               |
                                                   ( Trích xuất Embedding )
                                                               |
                                                               v
  [ Supabase DB ]  <---( Truy vấn & So khớp )--------  [ conv-facenet ]
         |
  ( Lưu record )
         |
         v
  [ Kiosk React ]  <---( Phản hồi kết quả )-----------  [ Backend FastAPI ]
```

1. **Gửi dữ liệu:** Kiosk React chụp loạt khung hình (frames) từ webcam và gửi yêu cầu `POST /attendance/recognize-batch` tới Backend FastAPI.
2. **Trích xuất đặc trưng:** Backend FastAPI gọi module nhận diện `conv-facenet` để thực hiện phát hiện khuôn mặt, căn chỉnh và trích xuất vector đặc trưng (128-dimensional embedding).
3. **So khớp & Xác thực:** Trọng số mô hình đối sánh vector khuôn mặt trích xuất được với các vector đã lưu trong bảng `face_profiles` trên cơ sở dữ liệu Supabase.
4. **Lưu trữ & Phản hồi:** Nếu tìm thấy nhân viên khớp dưới ngưỡng cho phép, backend sẽ tiến hành ghi nhận bản ghi điểm danh vào bảng `attendance_records` trên Supabase Database và tải ảnh minh chứng lên Supabase Storage, sau đó trả về kết quả thành công cho Frontend.

---

## 🗄️ Thiết Kế Cơ Sở Dữ Liệu
Chi tiết về các bảng và quan hệ giữa các thực thể, vui lòng xem tại tài liệu [SCHEMA_RELATIONSHIPS.md](file:///Users/cps/Documents/build-web-data-visualization-plugin-build-2/database/supabase/SCHEMA_RELATIONSHIPS.md).
