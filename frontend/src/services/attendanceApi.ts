import type {
  AttendanceBatchRecognitionResult,
  AttendanceRecognitionResult,
  AttendanceRecord,
  AttendanceStats,
  AttendanceVerifyResult,
} from "../types/attendance";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export async function verifyAttendanceImage(image: File, mode: "check-in" | "check-out"): Promise<AttendanceVerifyResult> {
  const formData = new FormData();
  formData.append("image", image);
  formData.append("mode", mode);

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/attendance/verify-image`, {
      body: formData,
      method: "POST",
    });
  } catch (caught) {
    throw new Error("Không kết nối được backend. Vui lòng kiểm tra server API.");
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail ?? "Không chấm công được bằng ảnh.");
  }

  return data as AttendanceVerifyResult;
}

export async function recognizeAttendanceFrame(image: Blob, mode: "check-in" | "check-out"): Promise<AttendanceRecognitionResult> {
  const formData = new FormData();
  formData.append("image", image, "camera-frame.jpg");
  formData.append("mode", mode);

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/attendance/recognize-frame`, {
      body: formData,
      method: "POST",
    });
  } catch (caught) {
    throw new Error("KhÃ´ng káº¿t ná»‘i Ä‘Æ°á»£c backend. Vui lÃ²ng kiá»ƒm tra server API.");
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail ?? "KhÃ´ng nháº­n diá»‡n Ä‘Æ°á»£c frame camera.");
  }

  return data as AttendanceRecognitionResult;
}

export async function recognizeAttendanceBatch(
  images: Blob[],
  mode: "check-in" | "check-out",
): Promise<AttendanceBatchRecognitionResult> {
  const formData = new FormData();
  images.forEach((image, index) => {
    formData.append("images", image, `camera-sample-${index + 1}.jpg`);
  });
  formData.append("mode", mode);

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/attendance/recognize-batch`, {
      body: formData,
      method: "POST",
    });
  } catch (caught) {
    throw new Error("Khong ket noi duoc backend. Vui long kiem tra server API.");
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail ?? "Khong nhan dien duoc batch camera.");
  }

  return data as AttendanceBatchRecognitionResult;
}

export async function getAttendanceRecords(filters: {
  employeeId?: string;
  fromDate?: string;
  toDate?: string;
  status?: string;
} = {}): Promise<{ records: AttendanceRecord[] }> {
  let url = `${API_BASE_URL}/attendance/records`;
  const params = new URLSearchParams();
  if (filters.employeeId) params.append("employee_id", filters.employeeId);
  if (filters.fromDate) params.append("from_date", filters.fromDate);
  if (filters.toDate) params.append("to_date", filters.toDate);
  if (filters.status) params.append("status", filters.status);
  
  const queryStr = params.toString();
  if (queryStr) url += `?${queryStr}`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch (caught) {
    throw new Error("Không kết nối được backend. Vui lòng kiểm tra server API.");
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail ?? "Không lấy được lịch sử điểm danh.");
  }

  return data as { records: AttendanceRecord[] };
}

export async function getAttendanceStats(): Promise<AttendanceStats> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/attendance/stats`);
  } catch (caught) {
    throw new Error("Không kết nối được backend. Vui lòng kiểm tra server API.");
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail ?? "Không lấy được thống kê điểm danh.");
  }

  return data as AttendanceStats;
}
