create extension if not exists vector;

create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  employee_code text not null unique,
  full_name text not null,
  department text,
  role_title text,
  employment_status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists face_profiles (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  embedding vector(128),
  image_path text,
  status text not null default 'active',
  registered_at timestamptz not null default now(),
  registered_by uuid
);

create table if not exists work_shifts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_time time not null,
  end_time time not null,
  late_after_minutes integer not null default 10,
  early_before_minutes integer not null default 15,
  created_at timestamptz not null default now()
);

create table if not exists shift_assignments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  shift_id uuid not null references work_shifts(id) on delete restrict,
  effective_from date not null,
  effective_to date,
  unique(employee_id, shift_id, effective_from)
);

create table if not exists kiosk_devices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  camera_code text not null unique,
  location text,
  status text not null default 'online',
  last_seen_at timestamptz
);

create table if not exists attendance_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete restrict,
  device_id uuid references kiosk_devices(id) on delete set null,
  shift_id uuid references work_shifts(id) on delete set null,
  attendance_date date not null,
  check_in_at timestamptz,
  check_out_at timestamptz,
  status text not null default 'valid',
  liveness_score numeric(5, 4),
  match_distance numeric(8, 6),
  evidence_path text,
  created_at timestamptz not null default now()
);

create table if not exists attendance_adjustment_requests (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid references attendance_records(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete restrict,
  reason text not null,
  requested_check_in_at timestamptz,
  requested_check_out_at timestamptz,
  status text not null default 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists spoofing_alerts (
  id uuid primary key default gen_random_uuid(),
  device_id uuid references kiosk_devices(id) on delete set null,
  employee_id uuid references employees(id) on delete set null,
  alert_type text not null,
  risk_level text not null default 'medium',
  evidence_path text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  target_table text,
  target_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_attendance_employee_date on attendance_records(employee_id, attendance_date);
create index if not exists idx_attendance_date_status on attendance_records(attendance_date, status);
create index if not exists idx_spoofing_alerts_status on spoofing_alerts(status, created_at desc);
