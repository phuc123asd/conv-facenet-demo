import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, FilePenLine, Plus, X, XCircle } from "lucide-react";

import { StatusBadge } from "../../../components/ui/StatusBadge";
import {
  createAttendanceAdjustment,
  getAttendanceAdjustments,
  reviewAttendanceAdjustment,
} from "../../../services/adjustmentApi";
import { getAttendanceRecords } from "../../../services/attendanceApi";
import { getEmployees } from "../../../services/employeeApi";
import type {
  AttendanceAdjustmentRequest,
  AttendanceAdjustmentStatus,
  AttendanceRecord,
} from "../../../types/attendance";
import type { Employee } from "../../../types/employee";

type AdjustmentDraft = {
  record: AttendanceRecord;
  suggestedReason?: string;
};

type ApprovalPanelProps = {
  initialDraft?: AdjustmentDraft | null;
  onDraftConsumed?: () => void;
  reviewerId?: string;
};

type StatusFilter = "all" | AttendanceAdjustmentStatus;

function toDateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIso(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatTime(value: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(value: string | null) {
  if (!value) return "Chưa có ngày công";
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("vi-VN");
}

function statusLabel(status: AttendanceAdjustmentStatus) {
  if (status === "approved") return "Đã duyệt";
  if (status === "rejected") return "Đã từ chối";
  return "Chờ duyệt";
}

export function ApprovalPanel({ initialDraft, onDraftConsumed, reviewerId }: ApprovalPanelProps) {
  const [requests, setRequests] = useState<AttendanceAdjustmentRequest[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReferenceLoading, setIsReferenceLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAttendanceId, setSelectedAttendanceId] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [requestedCheckIn, setRequestedCheckIn] = useState("");
  const [requestedCheckOut, setRequestedCheckOut] = useState("");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedRecord = useMemo(
    () => records.find((record) => record.id === selectedAttendanceId) ?? null,
    [records, selectedAttendanceId],
  );

  const filteredRequests = useMemo(
    () => requests.filter((request) => statusFilter === "all" || request.status === statusFilter),
    [requests, statusFilter],
  );

  const pendingCount = useMemo(
    () => requests.filter((request) => request.status === "pending").length,
    [requests],
  );

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const data = await getAttendanceAdjustments();
      setRequests(data.requests);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không tải được yêu cầu chỉnh sửa công.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadRequests();
    setIsReferenceLoading(true);
    Promise.all([getAttendanceRecords(), getEmployees()])
      .then(([attendanceData, employeeData]) => {
        setRecords(attendanceData.records);
        setEmployees(employeeData.employees);
        setSelectedEmployeeId((current) => current || employeeData.employees[0]?.id || "");
      })
      .catch((caught) => {
        setError(caught instanceof Error ? caught.message : "Không tải được dữ liệu tạo yêu cầu.");
      })
      .finally(() => setIsReferenceLoading(false));
  }, []);

  useEffect(() => {
    if (!initialDraft) return;
    const { record, suggestedReason = "" } = initialDraft;
    setRecords((current) => current.some((item) => item.id === record.id) ? current : [record, ...current]);
    setSelectedAttendanceId(record.id);
    setSelectedEmployeeId(record.employee_id);
    setRequestedCheckIn(toDateTimeLocal(record.check_in_at));
    setRequestedCheckOut(toDateTimeLocal(record.check_out_at));
    setReason(suggestedReason);
    setFormError(null);
    setMessage(null);
    setIsFormOpen(true);
    onDraftConsumed?.();
  }, [initialDraft]);

  const resetForm = () => {
    setSelectedAttendanceId("");
    setSelectedEmployeeId(employees[0]?.id ?? "");
    setRequestedCheckIn("");
    setRequestedCheckOut("");
    setReason("");
    setFormError(null);
  };

  const handleSelectRecord = (recordId: string) => {
    setSelectedAttendanceId(recordId);
    const record = records.find((item) => item.id === recordId);
    if (!record) {
      setRequestedCheckIn("");
      setRequestedCheckOut("");
      return;
    }
    setSelectedEmployeeId(record.employee_id);
    setRequestedCheckIn(toDateTimeLocal(record.check_in_at));
    setRequestedCheckOut(toDateTimeLocal(record.check_out_at));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const employeeId = selectedRecord?.employee_id ?? selectedEmployeeId;
    if (!employeeId) {
      setFormError("Vui lòng chọn nhân viên.");
      return;
    }
    if (!requestedCheckIn && !requestedCheckOut) {
      setFormError("Cần nhập ít nhất giờ vào hoặc giờ ra đề nghị.");
      return;
    }
    if (reason.trim().length < 3) {
      setFormError("Vui lòng nhập lý do chỉnh sửa công.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const response = await createAttendanceAdjustment({
        attendance_id: selectedRecord?.id ?? null,
        employee_id: employeeId,
        reason: reason.trim(),
        requested_check_in_at: toIso(requestedCheckIn),
        requested_check_out_at: toIso(requestedCheckOut),
      });
      setRequests((current) => [response.request, ...current]);
      setMessage("Đã gửi yêu cầu chỉnh sửa công và chuyển sang trạng thái chờ duyệt.");
      setIsFormOpen(false);
      resetForm();
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Không tạo được yêu cầu chỉnh sửa công.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReview = async (request: AttendanceAdjustmentRequest, action: "approved" | "rejected") => {
    setReviewingId(request.id);
    setError(null);
    setMessage(null);
    try {
      const response = await reviewAttendanceAdjustment(request.id, action, reviewerId);
      setRequests((current) => current.map((item) => item.id === request.id ? response.request : item));
      setMessage(action === "approved" ? "Đã duyệt và cập nhật bản ghi chấm công." : "Đã từ chối yêu cầu chỉnh sửa công.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không xử lý được yêu cầu chỉnh sửa công.");
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <div className="admin-stack">
      <div className="action-strip approval-toolbar">
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
          {isFormOpen ? <X size={18} /> : <Plus size={18} />}
          {isFormOpen ? "Đóng form" : "Tạo yêu cầu"}
        </button>
        <label>
          <span>Lọc trạng thái</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
            <option value="all">Tất cả ({requests.length})</option>
            <option value="pending">Chờ duyệt ({pendingCount})</option>
            <option value="approved">Đã duyệt</option>
            <option value="rejected">Đã từ chối</option>
          </select>
        </label>
      </div>

      {isFormOpen && (
        <form className="card employee-create-form" onSubmit={handleSubmit}>
          <div className="section-title">
            <div>
              <p className="eyebrow">Attendance Adjustment</p>
              <h3>Gửi yêu cầu chỉnh sửa công</h3>
            </div>
            <FilePenLine size={22} />
          </div>
          <div className="employee-form-grid adjustment-form-grid">
            <label className="adjustment-record-field">
              <span>Bản ghi cần sửa</span>
              <select
                disabled={isReferenceLoading}
                value={selectedAttendanceId}
                onChange={(event) => handleSelectRecord(event.target.value)}
              >
                <option value="">Chưa có bản ghi (camera lỗi/quên điểm danh)</option>
                {records.map((record) => (
                  <option key={record.id} value={record.id}>
                    {record.employees?.full_name ?? "Nhân viên"} · {formatDate(record.attendance_date)} · {formatTime(record.check_in_at)}–{formatTime(record.check_out_at)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Nhân viên</span>
              <select
                disabled={Boolean(selectedRecord) || isReferenceLoading}
                value={selectedEmployeeId}
                onChange={(event) => setSelectedEmployeeId(event.target.value)}
              >
                <option value="">Chọn nhân viên</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>{employee.name} · {employee.code}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Giờ vào đề nghị</span>
              <input type="datetime-local" value={requestedCheckIn} onChange={(event) => setRequestedCheckIn(event.target.value)} />
            </label>
            <label>
              <span>Giờ ra đề nghị</span>
              <input type="datetime-local" value={requestedCheckOut} onChange={(event) => setRequestedCheckOut(event.target.value)} />
            </label>
            <label className="adjustment-reason-field">
              <span>Lý do</span>
              <input
                autoFocus={Boolean(initialDraft)}
                placeholder="Ví dụ: quên check-out, camera lỗi, đi công tác..."
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
          </div>
          {formError && <p className="registration-note error">{formError}</p>}
          <div className="employee-form-actions">
            <button className="secondary-action" type="button" onClick={() => { setIsFormOpen(false); resetForm(); }}>
              Hủy
            </button>
            <button className="primary-action" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Đang gửi..." : "Gửi yêu cầu"}
            </button>
          </div>
        </form>
      )}

      {message && <p className="employee-create-toast">{message}</p>}

      <article className="card profile-detail">
        <div className="section-title">
          <div>
            <h3>Yêu cầu chỉnh sửa công</h3>
            <span>Quên check-out, camera lỗi, đi công tác</span>
          </div>
          <strong>{pendingCount} chờ duyệt</strong>
        </div>

        {isLoading ? (
          <div className="employee-empty">Đang tải yêu cầu chỉnh sửa công...</div>
        ) : error ? (
          <div className="employee-empty error">{error}</div>
        ) : filteredRequests.length === 0 ? (
          <div className="employee-empty">Không có yêu cầu phù hợp bộ lọc.</div>
        ) : (
          <div className="approval-list">
            {filteredRequests.map((item) => {
              const currentRecord = item.attendance_records;
              const requestDate = currentRecord?.attendance_date ?? item.requested_check_in_at ?? item.requested_check_out_at;
              const isReviewing = reviewingId === item.id;
              return (
                <div className="approval-row" key={item.id}>
                  <div>
                    <strong>{item.employees?.full_name ?? "Nhân viên"} · {formatDate(requestDate)}</strong>
                    <span>{item.reason}</span>
                    <small className="approval-change">
                      Hiện tại {formatTime(currentRecord?.check_in_at ?? null)}–{formatTime(currentRecord?.check_out_at ?? null)}
                      <b>→</b>
                      Đề nghị {formatTime(item.requested_check_in_at)}–{formatTime(item.requested_check_out_at)}
                    </small>
                  </div>
                  <StatusBadge status={item.status} label={statusLabel(item.status)} />
                  <div className="approval-actions">
                    {item.status === "pending" ? (
                      <>
                        <button
                          className="icon-soft accept"
                          aria-label={`Duyệt ${item.employees?.full_name ?? "yêu cầu"}`}
                          disabled={isReviewing}
                          onClick={() => void handleReview(item, "approved")}
                          type="button"
                        >
                          <CheckCircle2 size={17} />
                        </button>
                        <button
                          className="icon-soft reject"
                          aria-label={`Từ chối ${item.employees?.full_name ?? "yêu cầu"}`}
                          disabled={isReviewing}
                          onClick={() => void handleReview(item, "rejected")}
                          type="button"
                        >
                          <XCircle size={17} />
                        </button>
                      </>
                    ) : (
                      <span className="approval-reviewed-at">{formatDate(item.reviewed_at)}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </article>
    </div>
  );
}
