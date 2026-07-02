# Giao Diện Người Dùng (Frontend)

Ứng dụng React + Vite phục vụ giao diện người dùng cho hệ thống điểm danh bằng khuôn mặt (Face Attendance System).

## Chạy Local

Chạy các lệnh sau trong thư mục `frontend` để cài đặt và khởi chạy:

```bash
npm install
npm run dev
```

Mặc định, frontend sẽ kết nối tới backend tại địa chỉ:

```text
http://127.0.0.1:8000
```

Nếu backend của bạn chạy ở một cổng hoặc URL khác, hãy tạo một file `.env` trong thư mục `frontend` và khai báo cấu hình sau:

```text
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## Tài Khoản Thử Nghiệm (Demo Accounts)

Hệ thống có cấu hình sẵn hai tài khoản demo để kiểm thử:

- **Quản trị viên (Admin):** `admin@example.com` / Mật khẩu: `Admin@123456`
- **Nhân viên (Employee):** `employee@example.com` / Mật khẩu: `Employee@123456`

> [!NOTE]
> Tài khoản Admin có quyền truy cập đầy đủ vào trang quản trị (Admin Portal). Tài khoản nhân viên thông thường chỉ có quyền sử dụng khu vực Kiosk để check-in/check-out, mọi truy cập vào trang Admin Portal sẽ bị từ chối/khóa.

## Cấu Trúc Thư Mục Chính

```text
src/
├── App.tsx                  # Component gốc điều phối trạng thái đăng nhập và các màn hình chính
├── components/              # Các component dùng chung (nút bấm, bảng, thanh điều hướng...)
├── data/                    # Dữ liệu tĩnh phục vụ việc kiểm thử
├── features/
│   ├── auth/                # Chức năng và màn hình đăng nhập
│   ├── admin/               # Các chức năng quản trị (Admin Portal)
│   └── kiosk/               # Khu vực check-in/check-out của Kiosk điểm danh
├── services/                # Các service gọi API và quản lý session người dùng
├── styles/                  # Tệp cấu hình CSS và định dạng giao diện
└── types/                   # Định nghĩa các TypeScript interface/type dùng chung
```
