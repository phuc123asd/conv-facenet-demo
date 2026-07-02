import { Camera, Download, Edit3, Fingerprint, ShieldCheck, UserPlus, UserRound } from "lucide-react";

import { employees } from "../../../data/demoData";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { TimelineItem } from "../../../components/ui/TimelineItem";

export function EmployeePanel() {
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
