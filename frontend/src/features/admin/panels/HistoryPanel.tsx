import { Edit3, Flag } from "lucide-react";

import { historyRows } from "../../../data/demoData";
import { StatusBadge } from "../../../components/ui/StatusBadge";

export function HistoryPanel() {
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
