import type {
  AttendanceAdjustmentCreateInput,
  AttendanceAdjustmentRequest,
  AttendanceAdjustmentStatus,
} from "../types/attendance";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

async function readResponse(response: Response, fallbackMessage: string) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail ?? fallbackMessage);
  }
  return data;
}

export async function getAttendanceAdjustments(filters: {
  status?: AttendanceAdjustmentStatus;
  employeeId?: string;
} = {}): Promise<{ requests: AttendanceAdjustmentRequest[] }> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.employeeId) params.set("employee_id", filters.employeeId);
  const query = params.toString();

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/attendance/adjustments${query ? `?${query}` : ""}`);
  } catch {
    throw new Error("Không kết nối được backend. Vui lòng kiểm tra server API.");
  }

  return readResponse(response, "Không tải được yêu cầu chỉnh sửa công.");
}

export async function createAttendanceAdjustment(
  payload: AttendanceAdjustmentCreateInput,
): Promise<{ request: AttendanceAdjustmentRequest }> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/attendance/adjustments`, {
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
  } catch {
    throw new Error("Không kết nối được backend. Vui lòng kiểm tra server API.");
  }

  return readResponse(response, "Không tạo được yêu cầu chỉnh sửa công.");
}

export async function reviewAttendanceAdjustment(
  requestId: string,
  action: "approved" | "rejected",
  reviewedBy?: string,
): Promise<{ request: AttendanceAdjustmentRequest }> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/attendance/adjustments/${requestId}/review`, {
      body: JSON.stringify({ action, reviewed_by: reviewedBy ?? null }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    });
  } catch {
    throw new Error("Không kết nối được backend. Vui lòng kiểm tra server API.");
  }

  return readResponse(response, "Không xử lý được yêu cầu chỉnh sửa công.");
}
