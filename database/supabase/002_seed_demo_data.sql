insert into employees (employee_code, full_name, department, role_title, employment_status)
values
  ('NV-0248', 'Nguyễn Văn A', 'Product Operations', 'Nhân viên vận hành', 'active'),
  ('NV-0312', 'Trần Minh K', 'Fulfillment', 'Nhân viên kho', 'active'),
  ('NV-0186', 'Lê Thu H', 'HR', 'Chuyên viên nhân sự', 'active'),
  ('NV-0415', 'Phạm Quốc B', 'Retail', 'Nhân viên bán hàng', 'probation')
on conflict (employee_code) do update set
  full_name = excluded.full_name,
  department = excluded.department,
  role_title = excluded.role_title,
  employment_status = excluded.employment_status,
  updated_at = now();

insert into work_shifts (name, start_time, end_time, late_after_minutes, early_before_minutes)
values
  ('Hành chính', '08:00', '17:00', 10, 15),
  ('Ca sáng', '06:00', '14:00', 5, 10),
  ('Ca chiều', '14:00', '22:00', 5, 10)
on conflict do nothing;

insert into kiosk_devices (name, camera_code, location, status, last_seen_at)
values
  ('Kiosk Cổng A', 'CAM-A01', 'Cổng A', 'online', now()),
  ('Kiosk Cổng B', 'CAM-B02', 'Cổng B', 'online', now() - interval '2 minutes'),
  ('Kiosk Sảnh HR', 'CAM-HR1', 'Sảnh HR', 'offline', now() - interval '23 minutes')
on conflict (camera_code) do update set
  name = excluded.name,
  location = excluded.location,
  status = excluded.status,
  last_seen_at = excluded.last_seen_at;
