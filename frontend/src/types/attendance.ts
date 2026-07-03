export type AttendanceVerifyResult = {
  best_distance: number | null;
  employee: {
    department: string | null;
    employee_code: string;
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
};
