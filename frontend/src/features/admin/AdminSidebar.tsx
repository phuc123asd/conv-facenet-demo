import type { ReactNode } from "react";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileSpreadsheet,
  Fingerprint,
  History,
  LayoutDashboard,
  Monitor,
  Settings,
  UsersRound,
} from "lucide-react";

import type { AdminPanel } from "../../types/navigation";

type AdminSidebarProps = {
  panel: AdminPanel;
  setPanel: (panel: AdminPanel) => void;
};

export function AdminSidebar({ panel, setPanel }: AdminSidebarProps) {
  return (
    <aside className="sidebar glass">
      <div className="brand-lockup">
        <div className="app-icon">
          <Fingerprint size={24} />
        </div>
        <div className="brand-copy">
          <strong>Attendance AI</strong>
          <span>HR Admin</span>
        </div>
      </div>
      <nav className="side-nav" aria-label="Menu quản trị">
        <NavItem active={panel === "dashboard"} icon={<LayoutDashboard size={18} />} label="Dashboard" onClick={() => setPanel("dashboard")} />
        <NavItem active={panel === "employees"} icon={<UsersRound size={18} />} label="Nhân viên" onClick={() => setPanel("employees")} />
        <NavItem active={panel === "shifts"} icon={<CalendarClock size={18} />} label="Ca làm" onClick={() => setPanel("shifts")} />
        <NavItem active={panel === "approvals"} icon={<CheckCircle2 size={18} />} label="Duyệt công" onClick={() => setPanel("approvals")} />
        <NavItem active={panel === "history"} icon={<ClipboardList size={18} />} label="Lịch sử" onClick={() => setPanel("history")} />
        <NavItem active={panel === "reports"} icon={<FileSpreadsheet size={18} />} label="Báo cáo" onClick={() => setPanel("reports")} />
        <NavItem active={panel === "devices"} icon={<Monitor size={18} />} label="Thiết bị" onClick={() => setPanel("devices")} />
        <NavItem active={panel === "audit"} icon={<History size={18} />} label="Nhật ký" onClick={() => setPanel("audit")} />
        <NavItem active={panel === "settings"} icon={<Settings size={18} />} label="Cài đặt" onClick={() => setPanel("settings")} />
      </nav>
    </aside>
  );
}

function NavItem({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick} title={label} type="button">
      <span className="nav-icon">{icon}</span>
      <span className="nav-label">{label}</span>
    </button>
  );
}
