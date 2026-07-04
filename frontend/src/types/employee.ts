export type EmployeeShiftAssignment = {
  id: string;
  shift_id: string;
  shift_name: string;
  effective_from: string;
  effective_to: string | null;
};

export type Employee = {
  auth_user_id: string | null;
  code: string;
  created_at: string | null;
  department: string;
  face: "Đã đăng ký" | "Chưa đăng ký";
  face_image_url: string | null;
  id: string;
  name: string;
  role_title: "employee" | "admin";
  status: "active" | "probation" | "inactive";
  shift_assignments?: EmployeeShiftAssignment[];
  stats?: {
    late_count: number;
    early_count: number;
    liveness_pass_pct: number;
    face_id_updates: number;
  };
  attendance_records?: Array<{
    id: string;
    attendance_date: string;
    check_in_at: string | null;
    check_out_at: string | null;
    status: string;
  }>;
  updated_at: string | null;
};

export type EmployeesResponse = {
  employees: Employee[];
};

export type EmployeeCreateInput = {
  department?: string;
  employee_code?: string;
  employment_status?: "active" | "probation" | "inactive";
  full_name: string;
  role_title?: "employee" | "admin";
};

export type EmployeeCreateResponse = {
  employee: Employee;
};

export type EmployeeUpdateInput = {
  department?: string;
  employment_status: "active" | "probation" | "inactive";
  full_name: string;
  role_title: "employee" | "admin";
};

export type EmployeeUpdateResponse = {
  employee: Employee;
};

export type FaceProfileRegistrationResponse = {
  employee: {
    employee_code: string;
    full_name: string;
    id: string;
  };
  face_profile: {
    employee_id: string;
    id: string | null;
    image_path: string;
    object_path: string;
    registered_at: string | null;
    status: string;
  };
};
