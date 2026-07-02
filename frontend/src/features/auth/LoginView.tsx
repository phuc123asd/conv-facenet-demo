import { FormEvent, useState } from "react";
import { Fingerprint, KeyRound, LockKeyhole, Mail, ScanFace, ShieldCheck, UserRound, Waves } from "lucide-react";

import { login } from "../../services/authApi";
import type { AuthSession } from "../../types/auth";

type LoginViewProps = {
  onLogin: (session: AuthSession) => void;
};

export function LoginView({ onLogin }: LoginViewProps) {
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("Admin@123456");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const session = await login({ email, password });
      onLogin(session);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể đăng nhập. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-shell">
      <section className="login-console glass">
        <aside className="login-visual" aria-label="Trạng thái nhận diện">
          <div className="login-brand">
            <span className="login-mark">
              <Fingerprint size={30} />
            </span>
            <div>
              <p className="eyebrow">Face Attendance</p>
              <h1>Secure Access</h1>
            </div>
          </div>

          <div className="access-orbit" aria-hidden="true">
            <span className="orbit-ring ring-one" />
            <span className="orbit-ring ring-two" />
            <span className="orbit-ring ring-three" />
            <div className="face-frame">
              <ScanFace size={74} />
            </div>
            <span className="scan-beam" />
          </div>

          <div className="security-strip">
            <div>
              <Waves size={20} />
              <strong>98.7%</strong>
              <span>Liveness</span>
            </div>
            <div>
              <KeyRound size={20} />
              <strong>2FA</strong>
              <span>Auth layer</span>
            </div>
            <div>
              <ShieldCheck size={20} />
              <strong>Live</strong>
              <span>API ready</span>
            </div>
          </div>

          <div className="access-note">
            <ShieldCheck size={18} />
            <span>Phiên đăng nhập được xác thực bằng Supabase Auth và liên kết trực tiếp với hồ sơ nhân viên.</span>
          </div>
        </aside>

        <div className="login-card">
          <div>
            <p className="eyebrow">Admin & Kiosk Portal</p>
            <h2>Đăng nhập hệ thống</h2>
            <p className="login-subtitle">Chọn đúng tài khoản để hệ thống tự mở quyền Admin hoặc Kiosk.</p>
          </div>

          <form className="login-form" onSubmit={submitLogin}>
            <label>
              <span>Email</span>
              <div className="login-field">
                <Mail size={18} />
                <input
                  autoComplete="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@example.com"
                  type="email"
                  value={email}
                />
              </div>
            </label>

            <label>
              <span>Mật khẩu</span>
              <div className="login-field">
                <LockKeyhole size={18} />
                <input
                  autoComplete="current-password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Nhập mật khẩu"
                  type="password"
                  value={password}
                />
              </div>
            </label>

            {error && <p className="login-error">{error}</p>}

            <button className="primary-action login-submit" disabled={isSubmitting} type="submit">
              <ShieldCheck size={18} />
              {isSubmitting ? "Đang xác thực..." : "Đăng nhập an toàn"}
            </button>
          </form>

          <div className="demo-login-grid" aria-label="Tài khoản demo">
            <button
              type="button"
              onClick={() => {
                setEmail("admin@example.com");
                setPassword("Admin@123456");
              }}
            >
              <UserRound size={18} />
              <strong>Admin</strong>
              <span>admin@example.com</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail("employee@example.com");
                setPassword("Employee@123456");
              }}
            >
              <UserRound size={18} />
              <strong>Nhân viên</strong>
              <span>employee@example.com</span>
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
