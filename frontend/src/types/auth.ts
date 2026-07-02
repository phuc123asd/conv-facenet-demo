import type { AccountRole } from "./navigation";

export type LoginPayload = {
  email: string;
  password: string;
};

export type AuthUser = {
  employee_code: string | null;
  email: string;
  id: string;
  role: AccountRole;
};

export type EmployeeProfile = {
  auth_user_id: string;
  department: string | null;
  employee_code: string;
  employment_status: string;
  full_name: string;
  id: string;
  role_title: AccountRole;
};

export type AuthSession = {
  access_token: string;
  employee: EmployeeProfile;
  expires_in: number;
  refresh_token: string;
  token_type: string;
  user: AuthUser;
};
