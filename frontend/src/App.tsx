import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  Bell,
  CalendarClock,
  Camera,
  Check,
  CheckCircle2,
  CircleDot,
  ClipboardList,
  Download,
  Edit3,
  FileSpreadsheet,
  Flag,
  Fingerprint,
  History,
  LayoutDashboard,
  Monitor,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  UserPlus,
  UserRound,
  UsersRound,
  X,
  XCircle,
} from "lucide-react";

type MainView = "kiosk" | "admin";
type AdminPanel = "dashboard" | "employees" | "shifts" | "approvals" | "history" | "reports" | "devices" | "audit" | "settings";

const statusSteps = [
  { title: "Đang tìm khuôn mặt...", hint: "Vòng liveness đang quét chậm" },
  { title: "Đã phát hiện khuôn mặt", hint: "Vui lòng nhìn thẳng vào camera" },
  { title: "Đang kiểm tra liveness", hint: "Chớp mắt nhẹ để xác nhận người thật" },
  { title: "Xác thực thành công!", hint: "Thông tin nhân viên đã được ghi nhận" },
];

const historyRows = [
  { name: "Nguyễn Văn A", date: "25/06", checkIn: "08:01", checkOut: "--", status: "Hợp lệ" },
  { name: "Trần Minh K", date: "25/06", checkIn: "08:24", checkOut: "--", status: "Đi muộn" },
  { name: "Lê Thu H", date: "25/06", checkIn: "07:52", checkOut: "--", status: "Hợp lệ" },
  { name: "Phạm Quốc B", date: "25/06", checkIn: "08:37", checkOut: "--", status: "Đi muộn" },
];

const spoofAlerts = [
  { title: "Ảnh chụp trước camera", time: "08:42 · Cổng A", tone: "sunset" },
  { title: "Màn hình điện thoại", time: "09:17 · Cổng B", tone: "aqua" },
  { title: "Ánh sáng bất thường", time: "10:03 · Cổng A", tone: "rose" },
];

const employees = [
  { name: "Nguyễn Văn A", code: "NV-0248", department: "Product Operations", shift: "Hành chính", face: "Đã đăng ký", status: "Đang làm" },
  { name: "Trần Minh K", code: "NV-0312", department: "Fulfillment", shift: "Ca sáng", face: "Cần cập nhật", status: "Đang làm" },
  { name: "Lê Thu H", code: "NV-0186", department: "HR", shift: "Hành chính", face: "Đã đăng ký", status: "Đang làm" },
  { name: "Phạm Quốc B", code: "NV-0415", department: "Retail", shift: "Ca chiều", face: "Chưa đăng ký", status: "Thử việc" },
];

const shifts = [
  { name: "Hành chính", time: "08:00 - 17:00", late: "Sau 08:10", early: "Trước 16:45", members: 86 },
  { name: "Ca sáng", time: "06:00 - 14:00", late: "Sau 06:05", early: "Trước 13:50", members: 24 },
  { name: "Ca chiều", time: "14:00 - 22:00", late: "Sau 14:05", early: "Trước 21:50", members: 28 },
];

const approvalRequests = [
  { name: "Trần Minh K", reason: "Quên check-out", request: "Bổ sung giờ ra 17:12", status: "Chờ duyệt" },
  { name: "Phạm Quốc B", reason: "Camera cổng B lỗi", request: "Xác nhận check-in 08:04", status: "Chờ duyệt" },
  { name: "Lê Thu H", reason: "Đi công tác", request: "Miễn điểm danh buổi chiều", status: "Đã duyệt" },
];

const devices = [
  { name: "Kiosk Cổng A", camera: "CAM-A01", status: "Online", lastSeen: "Vừa xong", alerts: 1 },
  { name: "Kiosk Cổng B", camera: "CAM-B02", status: "Online", lastSeen: "2 phút trước", alerts: 2 },
  { name: "Kiosk Sảnh HR", camera: "CAM-HR1", status: "Offline", lastSeen: "23 phút trước", alerts: 0 },
];

const auditLogs = [
  { actor: "HR Admin", action: "Duyệt bổ sung công cho Trần Minh K", time: "10:42", target: "NV-0312" },
  { actor: "System", action: "Ghi nhận cảnh báo spoofing tại Cổng B", time: "09:17", target: "CAM-B02" },
  { actor: "HR Admin", action: "Cập nhật quy tắc đi muộn ca Hành chính", time: "08:30", target: "Ca làm" },
];

function App() {
  const [view, setView] = useState<MainView>("kiosk");

  return (
    <div className="app-shell">
      <header className="mode-bar glass">
        <div>
          <p className="eyebrow">Face Attendance</p>
          <h1>Check-in AI &amp; Admin Portal</h1>
        </div>
        <nav className="mode-switch" aria-label="Chọn phân hệ">
          <button className={view === "kiosk" ? "active" : ""} onClick={() => setView("kiosk")} type="button">
            Kiosk
          </button>
          <button className={view === "admin" ? "active" : ""} onClick={() => setView("admin")} type="button">
            Admin
          </button>
        </nav>
      </header>

      {view === "kiosk" ? <KioskView /> : <AdminView />}
    </div>
  );
}

/* ─── KIOSK ─── */

function KioskView() {
  const [mode, setMode] = useState<"check-in" | "check-out">("check-in");
  const [step, setStep] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const current = statusSteps[step];

  useEffect(() => {
    if (isScanning) return;
    const id = window.setInterval(() => setStep((v) => (v >= 2 ? 0 : v + 1)), 3600);
    return () => window.clearInterval(id);
  }, [isScanning]);

  const runScan = () => {
    setIsScanning(true);
    statusSteps.forEach((_, i) => {
      window.setTimeout(() => setStep(i), i * 900);
    });
    window.setTimeout(() => setIsScanning(false), 3850);
  };

  return (
    <main className="view-space">
      <section className="kiosk-grid">
        <article className="camera-card card">
          <div className="camera-header">
            <div>
              <p className="eyebrow">User Check-in Kiosk</p>
              <h2>Nhận diện khuôn mặt</h2>
            </div>
            <div className="live-pill">
              <span />
              Live
            </div>
          </div>

          <div className={`camera-frame ${isScanning ? "scanning" : ""}`} data-step={step}>
            {/* Grid background */}
            <div className="scan-grid" />

            {/* Scan line */}
            <div className="scan-line" />

            {/* Liveness ring */}
            <div className="liveness-ring">
              <svg viewBox="0 0 120 120">
                <circle className="ring-track" cx="60" cy="60" r="54" />
                <circle className="ring-fill" cx="60" cy="60" r="54" />
              </svg>
            </div>

            {/* Status bar */}
            <div className="camera-footer">
              <span className="status-dot" />
              <strong>{current.title}</strong>
              <small>{current.hint}</small>
            </div>
          </div>

          <div className="kiosk-actions">
            <div className="ios-toggle" role="group" aria-label="Chọn trạng thái chấm công">
              <button className={mode === "check-in" ? "active" : ""} onClick={() => setMode("check-in")} type="button">
                Check-in
              </button>
              <button className={mode === "check-out" ? "active" : ""} onClick={() => setMode("check-out")} type="button">
                Check-out
              </button>
            </div>
            <button className="primary-action" disabled={isScanning} onClick={runScan} type="button">
              {isScanning ? "Đang quét..." : "Mô phỏng nhận diện"}
            </button>
          </div>
        </article>

        <aside className="person-panel">
          <article className={`greeting-card card ${step === 3 ? "active" : ""}`}>
            <div className="avatar avatar-large">
              <UserRound size={50} />
            </div>
            <p className="eyebrow">Xác thực thành công</p>
            <h2>Xin chào, Nguyễn Văn A!</h2>
            <p className="muted">Product Operations · NV-0248</p>
          </article>

          <article className="shift-card card">
            <div>
              <p className="eyebrow">Ca làm việc hôm nay</p>
              <h3>08:00 - 17:00</h3>
            </div>
            <StatusBadge status="Hợp lệ" label="Đúng giờ" />
          </article>

          <article className="history-card card">
            <div className="section-title">
              <h3>3 lần gần nhất</h3>
              <span>Tuần này</span>
            </div>
            <div className="mini-table">
              <div>
                <strong>Thứ 2</strong>
                <span>07:56</span>
                <em>Check-in</em>
              </div>
              <div>
                <strong>Thứ 3</strong>
                <span>17:08</span>
                <em>Check-out</em>
              </div>
              <div>
                <strong>Hôm nay</strong>
                <span>08:01</span>
                <em>{mode === "check-in" ? "Check-in" : "Check-out"}</em>
              </div>
            </div>
          </article>
        </aside>
      </section>
    </main>
  );
}

/* ─── ADMIN ─── */

function AdminView() {
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
        <aside className="sidebar glass">
          <div className="brand-lockup">
            <div className="app-icon">
              <Fingerprint size={24} />
            </div>
            <div>
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

function NavItem({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick} type="button">
      {icon}
      {label}
    </button>
  );
}

function DashboardPanel() {
  return (
    <>
      <div className="stats-grid">
        <StatCard icon={<UsersRound size={22} />} tone="blue" label="Tổng NV" value="138" />
        <StatCard icon={<Check size={22} />} tone="green" label="Check-in" value="110" />
        <StatCard icon={<X size={22} />} tone="red" label="Vắng mặt" value="28" />
        <StatCard icon={<ShieldCheck size={22} />} tone="cyan" label="Face ID hợp lệ" value="124" />
      </div>

      <div className="dashboard-grid">
        <article className="card ai-card">
          <div className="section-title">
            <h3>AI &amp; Liveness</h3>
            <span>Hôm nay</span>
          </div>
          <div className="donut" aria-label="Tỷ lệ liveness hợp lệ 90%">
            <svg viewBox="0 0 120 120" role="img">
              <circle cx="60" cy="60" r="48" />
              <circle className="progress" cx="60" cy="60" r="48" />
            </svg>
            <div>
              <strong>90%</strong>
              <span>hợp lệ</span>
            </div>
          </div>
          <div className="bar-list">
            <label>
              <span>Nhận diện thành công</span>
              <b>124</b>
            </label>
            <div className="bar">
              <i style={{ width: "90%" }} />
            </div>
            <label>
              <span>Yêu cầu quét lại</span>
              <b>14</b>
            </label>
            <div className="bar warn">
              <i style={{ width: "28%" }} />
            </div>
          </div>
        </article>

        <article className="card spoof-card">
          <div className="section-title">
            <h3>Cảnh báo spoofing</h3>
            <span>3 mục cần xem</span>
          </div>
          <div className="alert-list">
            {spoofAlerts.map((alert) => (
              <div key={alert.title}>
                <span className={`capture ${alert.tone}`} />
                <strong>{alert.title}</strong>
                <em>{alert.time}</em>
              </div>
            ))}
          </div>
        </article>
      </div>
    </>
  );
}

function StatCard({ icon, tone, label, value }: { icon: ReactNode; tone: string; label: string; value: string }) {
  return (
    <article className="stat-card card">
      <span className={`stat-icon ${tone}`}>{icon}</span>
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}

function EmployeePanel() {
  return (
    <div className="admin-stack">
      <div className="action-strip">
        <button className="primary-action" type="button">
          <UserPlus size={18} />
          Thêm nhân viên
        </button>
        <button className="secondary-action" type="button">
          <Camera size={18} />
          Đăng ký khuôn mặt
        </button>
        <button className="secondary-action" type="button">
          <Download size={18} />
          Nhập danh sách
        </button>
      </div>

      <div className="employee-grid">
        <article className="id-card">
          <Fingerprint className="watermark" size={260} strokeWidth={1} />
          <div className="avatar employee-avatar">
            <UserRound size={58} />
          </div>
          <p className="eyebrow">Employee ID</p>
          <h3>Nguyễn Văn A</h3>
          <p>NV-0248 · Product Operations</p>
          <div className="face-status good">
            <ShieldCheck size={18} />
            Face embedding đã đồng bộ
          </div>
          <button className="primary-action" type="button">
            Đăng ký lại khuôn mặt
          </button>
        </article>

        <article className="card profile-detail">
          <div className="section-title">
            <h3>Danh sách nhân viên</h3>
            <span>{employees.length} hồ sơ</span>
          </div>
          <div className="employee-list">
            {employees.map((employee) => (
              <div key={employee.code} className="employee-row" tabIndex={0}>
                <div className="avatar mini-avatar">
                  <UserRound size={18} />
                </div>
                <div className="employee-identity">
                  <strong>{employee.name}</strong>
                  <div className="employee-hover-card" role="tooltip">
                    <div>
                      <span>Mã NV</span>
                      <strong>{employee.code}</strong>
                    </div>
                    <div>
                      <span>Vai trò</span>
                      <strong>{employee.department}</strong>
                    </div>
                    <div>
                      <span>Ca làm</span>
                      <strong>{employee.shift}</strong>
                    </div>
                  </div>
                </div>
                <StatusBadge status={employee.face === "Đã đăng ký" ? "Hợp lệ" : "Đi muộn"} label={employee.face} />
                <button className="icon-soft" aria-label={`Sửa ${employee.name}`} type="button">
                  <Edit3 size={16} />
                </button>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="card profile-detail">
        <div className="section-title">
          <h3>Lịch sử chi tiết</h3>
          <span>Tháng 6</span>
        </div>
        <div className="profile-stats">
          <div><strong>2</strong><span>Ngày đi muộn</span></div>
          <div><strong>0</strong><span>Về sớm</span></div>
          <div><strong>98%</strong><span>Liveness pass</span></div>
          <div><strong>4</strong><span>Lần cập nhật Face ID</span></div>
        </div>
        <div className="timeline">
          <TimelineItem title="Hôm nay" detail="Check-in 08:01 · Hợp lệ" />
          <TimelineItem title="Thứ 3" detail="Check-out 17:08 · Hợp lệ" />
          <TimelineItem title="Thứ 2" detail="Check-in 07:56 · Hợp lệ" />
        </div>
      </article>
    </div>
  );
}

function TimelineItem({ title, detail }: { title: string; detail: string }) {
  return (
    <div>
      <i />
      <strong>{title}</strong>
      <span>{detail}</span>
    </div>
  );
}

function ShiftPanel() {
  return (
    <div className="admin-stack">
      <div className="action-strip">
        <button className="primary-action" type="button">
          <CalendarClock size={18} />
          Tạo ca làm
        </button>
        <button className="secondary-action" type="button">
          <SlidersHorizontal size={18} />
          Quy tắc đi muộn
        </button>
      </div>
      <div className="management-grid">
        {shifts.map((shift) => (
          <article className="card management-card" key={shift.name}>
            <div className="section-title">
              <h3>{shift.name}</h3>
              <span>{shift.members} nhân viên</span>
            </div>
            <div className="rule-list">
              <div><span>Thời gian</span><strong>{shift.time}</strong></div>
              <div><span>Tính đi muộn</span><strong>{shift.late}</strong></div>
              <div><span>Tính về sớm</span><strong>{shift.early}</strong></div>
            </div>
            <button className="secondary-action" type="button">
              <Edit3 size={16} />
              Sửa ca
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

function ApprovalPanel() {
  return (
    <article className="card profile-detail">
      <div className="section-title">
        <h3>Yêu cầu chỉnh sửa công</h3>
        <span>Quên check-out, camera lỗi, đi công tác</span>
      </div>
      <div className="approval-list">
        {approvalRequests.map((item) => (
          <div className="approval-row" key={`${item.name}-${item.request}`}>
            <div>
              <strong>{item.name}</strong>
              <span>{item.reason} · {item.request}</span>
            </div>
            <StatusBadge status={item.status === "Đã duyệt" ? "Hợp lệ" : "Đi muộn"} label={item.status} />
            <div className="approval-actions">
              <button className="icon-soft accept" aria-label={`Duyệt ${item.name}`} type="button">
                <CheckCircle2 size={17} />
              </button>
              <button className="icon-soft reject" aria-label={`Từ chối ${item.name}`} type="button">
                <XCircle size={17} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function HistoryPanel() {
  return (
    <article className="dark-table">
      <div className="table-header">
        <div>
          <p className="eyebrow">Company Attendance History</p>
          <h3>Lịch sử chấm công</h3>
        </div>
        <div className="table-tools">
          <input type="date" aria-label="Từ ngày" />
          <input type="date" aria-label="Đến ngày" />
          <input type="search" placeholder="Tìm theo tên NV" />
          <select aria-label="Lọc trạng thái">
            <option>Tất cả trạng thái</option>
            <option>Hợp lệ</option>
            <option>Đi muộn</option>
          </select>
          <button className="table-button" type="button">
            Xuất Excel
          </button>
        </div>
      </div>
      <div className="attendance-table" role="table" aria-label="Bảng lịch sử chấm công">
        <div className="table-row table-head" role="row">
          <span>Tên NV</span>
          <span>Ngày</span>
          <span>Giờ vào</span>
          <span>Giờ ra</span>
          <span>Trạng thái</span>
          <span />
        </div>
        {historyRows.map((row) => (
          <div className="table-row" role="row" key={`${row.name}-${row.checkIn}`}>
            <span>{row.name}</span>
            <span>{row.date}</span>
            <span>{row.checkIn}</span>
            <span>{row.checkOut}</span>
            <StatusBadge status={row.status} />
            <span className="row-actions">
              <button aria-label={`Sửa ${row.name}`} type="button">
                <Edit3 size={16} />
              </button>
              <button aria-label={`Đánh dấu ${row.name}`} type="button">
                <Flag size={16} />
              </button>
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}

function ReportPanel() {
  return (
    <div className="admin-stack">
      <div className="report-grid">
        <article className="card report-card">
          <FileSpreadsheet size={28} />
          <h3>Bảng công tháng</h3>
          <p>138 nhân viên · 25 ngày công · 14 lượt đi muộn</p>
          <button className="primary-action" type="button">
            <Download size={18} />
            Xuất Excel
          </button>
        </article>
        <article className="card report-card">
          <ShieldAlert size={28} />
          <h3>Báo cáo AI/Liveness</h3>
          <p>124 lượt hợp lệ · 14 lượt quét lại · 3 cảnh báo spoofing</p>
          <button className="secondary-action" type="button">
            <Download size={18} />
            Tải PDF
          </button>
        </article>
      </div>
      <article className="card profile-detail">
        <div className="section-title">
          <h3>Tổng hợp theo phòng ban</h3>
          <span>Tháng này</span>
        </div>
        <div className="bar-list report-bars">
          <label><span>Product Operations</span><b>97%</b></label>
          <div className="bar"><i style={{ width: "97%" }} /></div>
          <label><span>Fulfillment</span><b>91%</b></label>
          <div className="bar warn"><i style={{ width: "91%" }} /></div>
          <label><span>Retail</span><b>88%</b></label>
          <div className="bar warn"><i style={{ width: "88%" }} /></div>
        </div>
      </article>
    </div>
  );
}

function DevicePanel() {
  return (
    <div className="management-grid">
      {devices.map((device) => (
        <article className="card management-card" key={device.camera}>
          <div className="section-title">
            <h3>{device.name}</h3>
            <StatusBadge status={device.status === "Online" ? "Hợp lệ" : "Đi muộn"} label={device.status} />
          </div>
          <div className="device-preview">
            <Monitor size={42} />
          </div>
          <div className="rule-list">
            <div><span>Camera</span><strong>{device.camera}</strong></div>
            <div><span>Lần cuối</span><strong>{device.lastSeen}</strong></div>
            <div><span>Cảnh báo</span><strong>{device.alerts}</strong></div>
          </div>
        </article>
      ))}
    </div>
  );
}

function AuditPanel() {
  return (
    <article className="card profile-detail">
      <div className="section-title">
        <h3>Audit log</h3>
        <span>Theo dõi thay đổi dữ liệu điểm danh</span>
      </div>
      <div className="timeline audit-timeline">
        {auditLogs.map((log) => (
          <TimelineItem key={`${log.actor}-${log.time}`} title={`${log.time} · ${log.actor}`} detail={`${log.action} · ${log.target}`} />
        ))}
      </div>
    </article>
  );
}

function SettingsPanel() {
  return (
    <div className="settings-grid">
      <article className="card settings-card">
        <h3>Cài đặt hệ thống</h3>
        <label>
          <span>Tự động chuyển Check-in/out theo giờ</span>
          <input type="checkbox" defaultChecked />
        </label>
        <label>
          <span>Yêu cầu liveness nâng cao</span>
          <input type="checkbox" defaultChecked />
        </label>
        <label>
          <span>Lưu ảnh nghi vấn spoofing</span>
          <input type="checkbox" defaultChecked />
        </label>
        <label>
          <span>Khóa sửa công sau khi chốt tháng</span>
          <input type="checkbox" defaultChecked />
        </label>
      </article>
      <article className="card settings-card">
        <h3>Phân quyền</h3>
        <label>
          <span>HR được duyệt chỉnh sửa công</span>
          <input type="checkbox" defaultChecked />
        </label>
        <label>
          <span>Quản lý chỉ xem nhân viên phòng ban</span>
          <input type="checkbox" defaultChecked />
        </label>
        <label>
          <span>Bắt buộc ghi lý do khi sửa dữ liệu</span>
          <input type="checkbox" defaultChecked />
        </label>
      </article>
    </div>
  );
}

function StatusBadge({ status, label }: { status: string; label?: string }) {
  const isLate = status === "Đi muộn";
  return (
    <span className={`badge ${isLate ? "late" : "good"}`}>
      <CircleDot size={10} fill="currentColor" />
      {label ?? status}
    </span>
  );
}

export default App;
