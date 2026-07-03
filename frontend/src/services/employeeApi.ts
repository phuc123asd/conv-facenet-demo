import type {
  EmployeeCreateInput,
  EmployeeCreateResponse,
  EmployeeUpdateInput,
  EmployeeUpdateResponse,
  EmployeesResponse,
  FaceProfileRegistrationResponse,
} from "../types/employee";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export async function getEmployees(): Promise<EmployeesResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/employees`);
  } catch (caught) {
    throw new Error("Không kết nối được backend. Vui lòng kiểm tra server API.");
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail ?? "Không lấy được danh sách nhân viên.");
  }

  return data as EmployeesResponse;
}

export async function createEmployee(payload: EmployeeCreateInput): Promise<EmployeeCreateResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/employees`, {
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
  } catch (caught) {
    throw new Error("Không kết nối được backend. Vui lòng kiểm tra server API.");
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail ?? "Không thêm được nhân viên.");
  }

  return data as EmployeeCreateResponse;
}

export async function updateEmployee(employeeId: string, payload: EmployeeUpdateInput): Promise<EmployeeUpdateResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/employees/${employeeId}`, {
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
      },
      method: "PATCH",
    });
  } catch (caught) {
    throw new Error("Không kết nối được backend. Vui lòng kiểm tra server API.");
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail ?? "Không cập nhật được nhân viên.");
  }

  return data as EmployeeUpdateResponse;
}

export async function registerFaceProfile(employeeId: string, image: File): Promise<FaceProfileRegistrationResponse> {
  const formData = new FormData();
  formData.append("image", image);

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/employees/${employeeId}/face-profile`, {
      body: formData,
      method: "POST",
    });
  } catch (caught) {
    throw new Error("Không kết nối được backend. Vui lòng kiểm tra server API.");
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail ?? "Không đăng ký được khuôn mặt.");
  }

  return data as FaceProfileRegistrationResponse;
}
