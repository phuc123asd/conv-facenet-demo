# Supabase Schema Relationships

Tài liệu này mô tả các bảng trong schema `public` cho hệ thống điểm danh bằng nhận diện khuôn mặt.

## Sơ Đồ Quan Hệ

```mermaid
erDiagram
  employees ||--o{ face_profiles : "có hồ sơ khuôn mặt"
  employees ||--o{ shift_assignments : "được gán ca"
  employees ||--o{ attendance_records : "có lịch sử điểm danh"
  employees ||--o{ attendance_adjustment_requests : "gửi yêu cầu sửa công"
  employees ||--o{ spoofing_alerts : "có thể liên quan cảnh báo"

  work_shifts ||--o{ shift_assignments : "được gán cho nhân viên"
  work_shifts ||--o{ attendance_records : "áp dụng cho lần điểm danh"

  kiosk_devices ||--o{ attendance_records : "ghi nhận điểm danh"
  kiosk_devices ||--o{ spoofing_alerts : "phát sinh cảnh báo"

  attendance_records ||--o{ attendance_adjustment_requests : "có yêu cầu điều chỉnh"
```

## Bảng Chính

### `employees`

Lưu hồ sơ nhân viên.

Cột quan trọng:

- `id`: khóa chính UUID.
- `employee_code`: mã nhân viên, duy nhất.
- `full_name`: họ tên nhân viên.
- `department`: phòng ban.
- `role_title`: vai trò/chức danh.
- `employment_status`: trạng thái làm việc, ví dụ `active`, `probation`, `inactive`.

Quan hệ:

- Một nhân viên có nhiều `face_profiles`.
- Một nhân viên có nhiều `attendance_records`.
- Một nhân viên có nhiều `shift_assignments`.
- Một nhân viên có thể có nhiều `attendance_adjustment_requests`.
- Một nhân viên có thể liên quan đến nhiều `spoofing_alerts`.

### `face_profiles`

Lưu thông tin khuôn mặt đã đăng ký của nhân viên.

Cột quan trọng:

- `id`: khóa chính UUID.
- `employee_id`: khóa ngoại đến `employees.id`.
- `embedding`: vector 128 chiều từ model `conv-facenet`.
- `image_path`: đường dẫn ảnh đăng ký trong storage.
- `status`: trạng thái hồ sơ khuôn mặt, ví dụ `active`, `revoked`, `needs_update`.
- `registered_at`: thời điểm đăng ký.
- `registered_by`: người thực hiện đăng ký, để gán với tài khoản admin sau này.

Quan hệ:

- Nhiều `face_profiles` thuộc về một `employees`.
- Khi xóa nhân viên, các `face_profiles` của nhân viên đó cũng bị xóa theo `on delete cascade`.

### `work_shifts`

Lưu cấu hình ca làm.

Cột quan trọng:

- `id`: khóa chính UUID.
- `name`: tên ca, ví dụ `Hành chính`, `Ca sáng`, `Ca chiều`.
- `start_time`: giờ bắt đầu ca.
- `end_time`: giờ kết thúc ca.
- `late_after_minutes`: số phút cho phép trước khi tính đi muộn.
- `early_before_minutes`: số phút trước giờ kết thúc sẽ tính về sớm.

Quan hệ:

- Một ca làm có nhiều `shift_assignments`.
- Một ca làm có thể được gán vào nhiều `attendance_records`.

### `shift_assignments`

Gán nhân viên với ca làm theo mốc hiệu lực.

Cột quan trọng:

- `id`: khóa chính UUID.
- `employee_id`: khóa ngoại đến `employees.id`.
- `shift_id`: khóa ngoại đến `work_shifts.id`.
- `effective_from`: ngày bắt đầu áp dụng ca.
- `effective_to`: ngày kết thúc áp dụng ca, có thể rỗng nếu vẫn còn hiệu lực.

Ràng buộc:

- `unique(employee_id, shift_id, effective_from)`: tránh gán trùng cùng một ca cho cùng nhân viên trong cùng ngày bắt đầu.

Quan hệ:

- Nhiều `shift_assignments` thuộc về một `employees`.
- Nhiều `shift_assignments` tham chiếu một `work_shifts`.

### `kiosk_devices`

Lưu danh sách kiosk/camera dùng để điểm danh.

Cột quan trọng:

- `id`: khóa chính UUID.
- `name`: tên thiết bị, ví dụ `Kiosk Cổng A`.
- `camera_code`: mã camera, duy nhất.
- `location`: vị trí lắp đặt.
- `status`: trạng thái thiết bị, ví dụ `online`, `offline`, `maintenance`.
- `last_seen_at`: thời điểm thiết bị gửi tín hiệu gần nhất.

Quan hệ:

- Một kiosk có nhiều `attendance_records`.
- Một kiosk có thể tạo nhiều `spoofing_alerts`.

### `attendance_records`

Lưu từng bản ghi điểm danh của nhân viên.

Cột quan trọng:

- `id`: khóa chính UUID.
- `employee_id`: khóa ngoại đến `employees.id`.
- `device_id`: kiosk/camera ghi nhận điểm danh.
- `shift_id`: ca làm áp dụng tại thời điểm điểm danh.
- `attendance_date`: ngày công.
- `check_in_at`: thời điểm vào.
- `check_out_at`: thời điểm ra.
- `status`: trạng thái, ví dụ `valid`, `late`, `early_leave`, `missing_checkout`, `manual_adjusted`.
- `liveness_score`: điểm liveness nếu có.
- `match_distance`: khoảng cách so khớp khuôn mặt từ model.
- `evidence_path`: ảnh bằng chứng trong storage nếu cần.

Quan hệ:

- Nhiều `attendance_records` thuộc về một `employees`.
- Nhiều `attendance_records` được ghi nhận bởi một `kiosk_devices`.
- Nhiều `attendance_records` có thể tham chiếu một `work_shifts`.
- Một `attendance_records` có thể có nhiều `attendance_adjustment_requests`.

Chỉ mục:

- `idx_attendance_employee_date`: tăng tốc truy vấn lịch sử theo nhân viên và ngày.
- `idx_attendance_date_status`: tăng tốc báo cáo theo ngày và trạng thái.

### `attendance_adjustment_requests`

Lưu yêu cầu chỉnh sửa công, ví dụ quên check-out, camera lỗi, đi công tác.

Cột quan trọng:

- `id`: khóa chính UUID.
- `attendance_id`: bản ghi điểm danh cần điều chỉnh, có thể rỗng nếu yêu cầu tạo mới công.
- `employee_id`: nhân viên gửi/được tạo yêu cầu.
- `reason`: lý do điều chỉnh.
- `requested_check_in_at`: giờ vào đề nghị.
- `requested_check_out_at`: giờ ra đề nghị.
- `status`: trạng thái, ví dụ `pending`, `approved`, `rejected`.
- `reviewed_by`: người duyệt.
- `reviewed_at`: thời điểm duyệt.

Quan hệ:

- Nhiều yêu cầu thuộc về một `employees`.
- Nhiều yêu cầu có thể liên quan một `attendance_records`.

### `spoofing_alerts`

Lưu cảnh báo giả mạo khi điểm danh bằng khuôn mặt.

Cột quan trọng:

- `id`: khóa chính UUID.
- `device_id`: kiosk/camera phát sinh cảnh báo.
- `employee_id`: nhân viên liên quan nếu hệ thống dự đoán được.
- `alert_type`: loại cảnh báo, ví dụ `photo_replay`, `phone_screen`, `abnormal_light`.
- `risk_level`: mức rủi ro, ví dụ `low`, `medium`, `high`.
- `evidence_path`: ảnh bằng chứng trong storage.
- `status`: trạng thái xử lý, ví dụ `open`, `reviewed`, `dismissed`.
- `created_at`: thời điểm phát sinh.

Quan hệ:

- Nhiều `spoofing_alerts` có thể thuộc về một `kiosk_devices`.
- Nhiều `spoofing_alerts` có thể liên quan một `employees`.

Chỉ mục:

- `idx_spoofing_alerts_status`: tăng tốc màn hình danh sách cảnh báo cần xử lý.

### `audit_logs`

Lưu nhật ký thao tác quan trọng trong hệ thống.

Cột quan trọng:

- `id`: khóa chính UUID.
- `actor_id`: người thực hiện thao tác, sẽ liên kết với bảng người dùng/admin sau này.
- `action`: hành động, ví dụ `approve_attendance_adjustment`, `update_shift_rule`.
- `target_table`: bảng bị tác động.
- `target_id`: id bản ghi bị tác động.
- `before_data`: dữ liệu trước khi thay đổi.
- `after_data`: dữ liệu sau khi thay đổi.
- `created_at`: thời điểm thao tác.

Ghi chú:

- Bảng này hiện chưa có khóa ngoại vì hệ thống admin/auth sẽ được thiết kế sau.
- Khi thêm Supabase Auth hoặc bảng `admin_users`, có thể liên kết `actor_id` đến bảng người dùng quản trị.

## Luồng Dữ Liệu Chính

### Đăng Ký Khuôn Mặt

1. Tạo hồ sơ trong `employees`.
2. Backend gọi `conv-facenet` để tạo embedding 128 chiều.
3. Lưu embedding vào `face_profiles.embedding`.
4. Nếu có ảnh gốc, lưu ảnh vào Supabase Storage và ghi đường dẫn vào `face_profiles.image_path`.

### Điểm Danh Kiosk

1. Kiosk gửi ảnh lên backend.
2. Backend kiểm tra liveness và trích xuất embedding.
3. Backend so khớp với `face_profiles.embedding`.
4. Nếu hợp lệ, tạo/cập nhật `attendance_records`.
5. Nếu nghi vấn giả mạo, tạo bản ghi `spoofing_alerts`.

### Duyệt Chỉnh Sửa Công

1. Tạo yêu cầu trong `attendance_adjustment_requests`.
2. Admin duyệt hoặc từ chối.
3. Nếu duyệt, cập nhật `attendance_records`.
4. Ghi thao tác vào `audit_logs`.

## Ghi Chú Về RLS

Tất cả bảng đã bật Row Level Security. Khi backend dùng `service_role` key, backend có thể đọc/ghi theo logic riêng. Khi frontend truy cập trực tiếp Supabase bằng anon key, cần tạo policy riêng trước khi cho phép đọc/ghi.
