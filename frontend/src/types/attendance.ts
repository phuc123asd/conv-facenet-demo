export type AttendanceVerifyResult = {
  best_distance: number | null;
  employee: {
    department: string | null;
    employee_code: string;
    face_image_url?: string | null;
    full_name: string;
    id: string;
    role_title: string | null;
  } | null;
  face_profile_id: string | null;
  filename: string;
  matched: boolean;
  mode: "check-in" | "check-out";
  reason: string | null;
  second_distance: number | null;
  threshold: number;
  record: {
    attendance_date: string;
    check_in_at: string | null;
    check_out_at: string | null;
    status: string;
    evidence_path: string;
    shift_name: string | null;
    start_time: string | null;
    end_time: string | null;
  } | null;
};

export type AttendanceRecord = {
  id: string;
  employee_id: string;
  device_id: string | null;
  shift_id: string | null;
  attendance_date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  status: "valid" | "late" | "early" | string;
  liveness_score: number | null;
  match_distance: number | null;
  evidence_path: string | null;
  created_at: string;
  employees?: {
    id: string;
    full_name: string;
    employee_code: string;
    department: string | null;
  } | null;
};

export type AttendanceStats = {
  total_employees: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  early_count: number;
  liveness_rate: number;
  alert_count: number;
  recent_alerts: Array<{
    id: string;
    device_id: string | null;
    employee_id: string | null;
    alert_type: string;
    risk_level: string;
    evidence_path: string | null;
    status: string;
    created_at: string;
    employees?: {
      full_name: string;
    } | null;
  }>;
};
