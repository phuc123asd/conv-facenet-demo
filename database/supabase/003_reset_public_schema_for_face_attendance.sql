drop table if exists public.attendance_adjustment_requests cascade;
drop table if exists public.spoofing_alerts cascade;
drop table if exists public.attendance_records cascade;
drop table if exists public.shift_assignments cascade;
drop table if exists public.face_profiles cascade;
drop table if exists public.kiosk_devices cascade;
drop table if exists public.work_shifts cascade;
drop table if exists public.employees cascade;
drop table if exists public.audit_logs cascade;
drop table if exists public.friendships cascade;
drop table if exists public.friend_requests cascade;
drop table if exists public.users cascade;

create extension if not exists vector;

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  employee_code text not null unique,
  full_name text not null,
  department text,
  role_title text,
  employment_status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.face_profiles (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  embedding vector(128),
  image_path text,
  status text not null default 'active',
  registered_at timestamptz not null default now(),
  registered_by uuid
);

create table public.work_shifts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_time time not null,
  end_time time not null,
  late_after_minutes integer not null default 10,
  early_before_minutes integer not null default 15,
  created_at timestamptz not null default now()
);

create table public.shift_assignments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  shift_id uuid not null references public.work_shifts(id) on delete restrict,
  effective_from date not null,
  effective_to date,
  unique(employee_id, shift_id, effective_from)
);

create table public.kiosk_devices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  camera_code text not null unique,
  location text,
  status text not null default 'online',
  last_seen_at timestamptz
);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete restrict,
  device_id uuid references public.kiosk_devices(id) on delete set null,
  shift_id uuid references public.work_shifts(id) on delete set null,
  attendance_date date not null,
  check_in_at timestamptz,
  check_out_at timestamptz,
  status text not null default 'valid',
  liveness_score numeric(5, 4),
  match_distance numeric(8, 6),
  evidence_path text,
  created_at timestamptz not null default now()
);

create table public.attendance_adjustment_requests (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid references public.attendance_records(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict,
  reason text not null,
  requested_check_in_at timestamptz,
  requested_check_out_at timestamptz,
  status text not null default 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.spoofing_alerts (
  id uuid primary key default gen_random_uuid(),
  device_id uuid references public.kiosk_devices(id) on delete set null,
  employee_id uuid references public.employees(id) on delete set null,
  alert_type text not null,
  risk_level text not null default 'medium',
  evidence_path text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  target_table text,
  target_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

alter table public.employees enable row level security;
alter table public.face_profiles enable row level security;
alter table public.work_shifts enable row level security;
alter table public.shift_assignments enable row level security;
alter table public.kiosk_devices enable row level security;
alter table public.attendance_records enable row level security;
alter table public.attendance_adjustment_requests enable row level security;
alter table public.spoofing_alerts enable row level security;
alter table public.audit_logs enable row level security;

create index idx_attendance_employee_date on public.attendance_records(employee_id, attendance_date);
create index idx_attendance_date_status on public.attendance_records(attendance_date, status);
create index idx_spoofing_alerts_status on public.spoofing_alerts(status, created_at desc);
