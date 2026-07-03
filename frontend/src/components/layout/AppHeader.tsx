import { LogOut, ScanFace, UserRound } from "lucide-react";

import type { AuthSession } from "../../types/auth";
import type { MainView } from "../../types/navigation";

type AppHeaderProps = {
  canOpenAdmin: boolean;
  onLogout: () => void;
  session: AuthSession;
  setView: (view: MainView) => void;
  view: MainView;
};

export function AppHeader({ canOpenAdmin, onLogout, session, setView, view }: AppHeaderProps) {
  return (
    <header className="mode-bar glass">
      <div className="header-brand">
        <div className="header-logo" aria-hidden="true">
          <ScanFace size={30} />
        </div>
        <div className="header-copy">
          <p className="eyebrow">Face Attendance</p>
          <h1>Check-in AI &amp; Admin Portal</h1>
        </div>
      </div>
      <div className="top-controls">
        <div className="session-chip" aria-label="Tài khoản đang đăng nhập">
          <UserRound size={17} />
          <span>
            <strong>{session.employee.full_name}</strong>
            <small>{session.employee.employee_code} · {session.user.role}</small>
          </span>
        </div>
        <nav className="mode-switch" aria-label="Chọn phân hệ">
          <button className={view === "kiosk" ? "active" : ""} onClick={() => setView("kiosk")} type="button">
            Kiosk
          </button>
          <button
            className={view === "admin" ? "active" : ""}
            disabled={!canOpenAdmin}
            onClick={() => {
              if (canOpenAdmin) setView("admin");
            }}
            title={canOpenAdmin ? "Mở Admin Portal" : "Tài khoản nhân viên không có quyền mở Admin"}
            type="button"
          >
            Admin
          </button>
        </nav>
        <button className="logout-button" onClick={onLogout} type="button">
          <LogOut size={17} />
          Đăng xuất
        </button>
      </div>
    </header>
  );
}
