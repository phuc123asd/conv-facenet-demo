import type { AuthSession } from "../types/auth";

const SESSION_KEY = "face-attendance-session";

export function loadSession(): AuthSession | null {
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as AuthSession;

    if (
      !session.access_token ||
      !session.employee?.employee_code ||
      !session.employee?.full_name ||
      !session.user?.email ||
      !session.user?.role
    ) {
      window.localStorage.removeItem(SESSION_KEY);
      return null;
    }

    return session;
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function saveSession(session: AuthSession) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_KEY);
}
