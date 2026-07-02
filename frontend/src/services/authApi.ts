import type { AuthSession, LoginPayload } from "../types/auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export async function login(payload: LoginPayload): Promise<AuthSession> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/auth/login`, {
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
    throw new Error(data.detail ?? "Không thể đăng nhập. Vui lòng thử lại.");
  }

  return data as AuthSession;
}
