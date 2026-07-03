import type { AttendanceVerifyResult } from "../types/attendance";

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
