import { useEffect, useState, useMemo } from "react";
import { Edit3, Flag } from "lucide-react";

import { getAttendanceRecords } from "../../../services/attendanceApi";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import type { AttendanceRecord } from "../../../types/attendance";

type HistoryPanelProps = {
  onRequestAdjustment: (record: AttendanceRecord, suggestedReason?: string) => void;
};

export function HistoryPanel({ onRequestAdjustment }: HistoryPanelProps) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchName, setSearchName] = useState("");

  const fetchRecords = () => {
    setIsLoading(true);
    getAttendanceRecords({
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      status: statusFilter || undefined,
    })
      .then((data) => {
        setRecords(data.records);
        setError(null);
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : "Không tải được lịch sử.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchRecords();
  }, [fromDate, toDate, statusFilter]);

  // Client-side search filter
  const filteredRecords = useMemo(() => {
    if (!searchName.trim()) return records;
    const lowerSearch = searchName.toLowerCase();
    return records.filter((rec) =>
      rec.employees?.full_name.toLowerCase().includes(lowerSearch) ||
      rec.employees?.employee_code.toLowerCase().includes(lowerSearch)
    );
  }, [records, searchName]);

  const mapStatusLabel = (status: string) => {
    switch (status) {
      case "valid":
        return "Hợp lệ";
      case "late":
        return "Đi muộn";
      case "early":
        return "Về sớm";
      default:
        return status;
    }
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return "--";
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "--";
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split("-");
      return `${day}/${month}`;
    } catch {
      return dateStr;
    }
  };

  const exportCSV = () => {
    if (filteredRecords.length === 0) return;
    
    // Create CSV content
    const headers = ["Nhân viên", "Mã NV", "Ngày", "Giờ vào", "Giờ ra", "Trạng thái"];
    const rows = filteredRecords.map((r) => [
      r.employees?.full_name || "",
      r.employees?.employee_code || "",
      r.attendance_date,
      formatTime(r.check_in_at),
      formatTime(r.check_out_at),
      mapStatusLabel(r.status)
    ]);
    
    const csvContent = 
      "data:text/csv;charset=utf-8,\uFEFF" + 
      [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `lich_su_cham_cong_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <article className="dark-table">
      <div className="table-header">
        <div>
          <p className="eyebrow">Company Attendance History</p>
          <h3>Lịch sử chấm công</h3>
        </div>
        <div className="table-tools">
          <input 
            type="date" 
            aria-label="Từ ngày" 
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
          <input 
            type="date" 
            aria-label="Đến ngày" 
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
          <input 
            type="search" 
            placeholder="Tìm theo tên/mã NV" 
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
          />
          <select 
            aria-label="Lọc trạng thái"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="valid">Hợp lệ</option>
            <option value="late">Đi muộn</option>
            <option value="early">Về sớm</option>
          </select>
          <button className="table-button" type="button" onClick={exportCSV} disabled={filteredRecords.length === 0}>
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
        
        {isLoading && (
          <div className="employee-empty" style={{ gridColumn: "1 / -1", padding: "40px" }}>
            Đang tải lịch sử chấm công...
          </div>
        )}
        
        {!isLoading && error && (
          <div className="employee-empty error" style={{ gridColumn: "1 / -1", padding: "40px" }}>
            {error}
          </div>
        )}
        
        {!isLoading && !error && filteredRecords.length === 0 && (
          <div className="employee-empty" style={{ gridColumn: "1 / -1", padding: "40px" }}>
            Không có bản ghi điểm danh nào.
          </div>
        )}
        
        {!isLoading && !error && filteredRecords.map((row) => (
          <div className="table-row" role="row" key={row.id}>
            <span>{row.employees?.full_name || "N/A"}</span>
            <span>{formatDate(row.attendance_date)}</span>
            <span>{formatTime(row.check_in_at)}</span>
            <span>{formatTime(row.check_out_at)}</span>
            <StatusBadge status={mapStatusLabel(row.status)} />
            <span className="row-actions">
              <button
                aria-label={`Sửa ${row.employees?.full_name}`}
                onClick={() => onRequestAdjustment(row)}
                title="Tạo yêu cầu sửa công"
                type="button"
              >
                <Edit3 size={16} />
              </button>
              <button
                aria-label={`Đánh dấu ${row.employees?.full_name}`}
                onClick={() => onRequestAdjustment(row, "Bản ghi cần kiểm tra lại")}
                title="Đánh dấu để duyệt lại"
                type="button"
              >
                <Flag size={16} />
              </button>
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}
