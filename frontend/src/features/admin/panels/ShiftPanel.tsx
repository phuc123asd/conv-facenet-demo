import { useEffect, useState } from "react";
import { CalendarClock, Edit3, SlidersHorizontal, X } from "lucide-react";

import { getShifts, createShift, updateShift } from "../../../services/shiftApi";
import type { Shift } from "../../../types/shift";

export function ShiftPanel() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [lateMinutes, setLateMinutes] = useState(10);
  const [earlyMinutes, setEarlyMinutes] = useState(15);
  
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchShifts = () => {
    setIsLoading(true);
    getShifts()
      .then((data) => {
        setShifts(data.shifts);
        setError(null);
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : "Không tải được ca làm.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const resetForm = () => {
    setName("");
    setStartTime("08:00");
    setEndTime("17:00");
    setLateMinutes(10);
    setEarlyMinutes(15);
    setEditingShiftId(null);
    setFormError(null);
  };

  const handleCreateOrUpdateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Vui lòng nhập tên ca làm.");
      return;
    }
    
    setIsSubmitting(true);
    setFormError(null);
    try {
      const payload = {
        name: name.trim(),
        start_time: startTime.length === 5 ? startTime + ":00" : startTime,
        end_time: endTime.length === 5 ? endTime + ":00" : endTime,
        late_after_minutes: Number(lateMinutes),
        early_before_minutes: Number(earlyMinutes)
      };

      if (editingShiftId) {
        await updateShift(editingShiftId, payload);
      } else {
        await createShift(payload);
      }

      resetForm();
      setIsFormOpen(false);
      fetchShifts();
    } catch (caught: unknown) {
      setFormError(caught instanceof Error ? caught.message : "Lỗi khi lưu ca làm.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimeString = (timeStr: string) => {
    try {
      const parts = timeStr.split(":");
      return `${parts[0]}:${parts[1]}`;
    } catch {
      return timeStr;
    }
  };

  const handleOpenEditShift = (shift: Shift) => {
    setEditingShiftId(shift.id);
    setName(shift.name);
    setStartTime(formatTimeString(shift.start_time));
    setEndTime(formatTimeString(shift.end_time));
    setLateMinutes(shift.late_after_minutes);
    setEarlyMinutes(shift.early_before_minutes);
    setFormError(null);
    setIsFormOpen(true);
  };

  return (
    <div className="admin-stack">
      <div className="action-strip">
        <button 
          className="primary-action" 
          type="button" 
          onClick={() => {
            if (isFormOpen) {
              setIsFormOpen(false);
              resetForm();
            } else {
              resetForm();
              setIsFormOpen(true);
            }
          }}
        >
          {isFormOpen ? <X size={18} /> : <CalendarClock size={18} />}
          {isFormOpen ? "Hủy bỏ" : "Tạo ca làm"}
        </button>
      </div>

      {isFormOpen && (
        <form className="card employee-create-form" onSubmit={handleCreateOrUpdateShift}>
          <div className="section-title">
            <h3>{editingShiftId ? "Cập nhật ca làm việc" : "Tạo ca làm việc mới"}</h3>
          </div>
          <div className="employee-form-grid">
            <label>
              <span>Tên ca làm</span>
              <input 
                type="text" 
                placeholder="Ví dụ: Ca hành chính, Ca sáng" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </label>
            <label>
              <span>Giờ bắt đầu</span>
              <input 
                type="time" 
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </label>
            <label>
              <span>Giờ kết thúc</span>
              <input 
                type="time" 
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </label>
            <label>
              <span>Đi muộn tối đa (phút)</span>
              <input 
                type="number" 
                min="0"
                value={lateMinutes}
                onChange={(e) => setLateMinutes(Number(e.target.value))}
              />
            </label>
            <label>
              <span>Về sớm tối đa (phút)</span>
              <input 
                type="number" 
                min="0"
                value={earlyMinutes}
                onChange={(e) => setEarlyMinutes(Number(e.target.value))}
              />
            </label>
          </div>
          {formError && <p className="registration-note error">{formError}</p>}
          <div className="employee-form-actions">
            <button 
              className="secondary-action" 
              type="button" 
              onClick={() => {
                setIsFormOpen(false);
                resetForm();
              }}
            >
              Hủy
            </button>
            <button className="primary-action" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Đang lưu..." : editingShiftId ? "Cập nhật ca" : "Lưu ca làm"}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="employee-empty">Đang tải danh sách ca làm...</div>
      ) : error ? (
        <div className="employee-empty error">{error}</div>
      ) : shifts.length === 0 ? (
        <div className="employee-empty">Chưa có ca làm việc nào được định nghĩa.</div>
      ) : (
        <div className="management-grid">
          {shifts.map((shift) => (
            <article className="card management-card" key={shift.id}>
              <div className="section-title">
                <h3>{shift.name}</h3>
              </div>
              <div className="rule-list">
                <div>
                  <span>Thời gian</span>
                  <strong>{formatTimeString(shift.start_time)} - {formatTimeString(shift.end_time)}</strong>
                </div>
                <div>
                  <span>Tính đi muộn</span>
                  <strong>Sau {shift.late_after_minutes} phút</strong>
                </div>
                <div>
                  <span>Tính về sớm</span>
                  <strong>Trước {shift.early_before_minutes} phút</strong>
                </div>
              </div>
              <button 
                className="secondary-action" 
                type="button"
                onClick={() => handleOpenEditShift(shift)}
              >
                <Edit3 size={16} />
                Sửa ca
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
