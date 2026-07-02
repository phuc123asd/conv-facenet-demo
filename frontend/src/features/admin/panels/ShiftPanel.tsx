import { CalendarClock, Edit3, SlidersHorizontal } from "lucide-react";

import { shifts } from "../../../data/demoData";

export function ShiftPanel() {
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
