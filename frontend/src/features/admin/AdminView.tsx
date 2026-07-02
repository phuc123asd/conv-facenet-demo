import { useState } from "react";
import { Bell, Search, UserRound } from "lucide-react";

import type { AdminPanel } from "../../types/navigation";
import { AdminSidebar } from "./AdminSidebar";
import {
  ApprovalPanel,
  AuditPanel,
  DashboardPanel,
  DevicePanel,
  EmployeePanel,
  HistoryPanel,
  ReportPanel,
  SettingsPanel,
  ShiftPanel,
} from "./AdminPanels";

export function AdminView() {
  const [panel, setPanel] = useState<AdminPanel>("dashboard");
  const titles: Record<AdminPanel, string> = {
    dashboard: "Bảng điều khiển",
    employees: "Nhân viên & khuôn mặt",
    shifts: "Ca làm & quy tắc",
    approvals: "Duyệt chỉnh sửa công",
    history: "Lịch sử chấm công",
    reports: "Báo cáo tổng hợp",
    devices: "Thiết bị kiosk",
    audit: "Nhật ký hệ thống",
    settings: "Cài đặt",
  };

  return (
    <main className="view-space">
      <section className="admin-layout">
        <AdminSidebar panel={panel} setPanel={setPanel} />

        <div className="admin-main">
          <header className="admin-header">
            <div>
              <p className="eyebrow">Admin Portal</p>
              <h2>{titles[panel]}</h2>
            </div>
            <div className="admin-tools">
              <label className="spotlight">
                <Search size={18} />
                <input type="search" placeholder="Tìm kiếm nhân viên, mã NV..." />
                <kbd>⌘K</kbd>
              </label>
              <button className="icon-button" type="button" aria-label="Thông báo">
                <Bell size={19} />
              </button>
              <div className="avatar admin-avatar">
                <UserRound size={22} />
              </div>
            </div>
          </header>

          {panel === "dashboard" && <DashboardPanel />}
          {panel === "employees" && <EmployeePanel />}
          {panel === "shifts" && <ShiftPanel />}
          {panel === "approvals" && <ApprovalPanel />}
          {panel === "history" && <HistoryPanel />}
          {panel === "reports" && <ReportPanel />}
          {panel === "devices" && <DevicePanel />}
          {panel === "audit" && <AuditPanel />}
          {panel === "settings" && <SettingsPanel />}
        </div>
      </section>
    </main>
  );
}
