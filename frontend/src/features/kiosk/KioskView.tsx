import { useEffect, useState } from "react";
import { ImagePlus, UserRound } from "lucide-react";

import { statusSteps } from "../../data/demoData";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { verifyAttendanceImage, getAttendanceRecords } from "../../services/attendanceApi";
import type { AttendanceVerifyResult, AttendanceRecord } from "../../types/attendance";

export function KioskView() {
  const [mode, setMode] = useState<"check-in" | "check-out">("check-in");
  const [step, setStep] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [testImage, setTestImage] = useState<File | null>(null);
  const [testImageName, setTestImageName] = useState("");
  const [verifyResult, setVerifyResult] = useState<AttendanceVerifyResult | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [recentLogs, setRecentLogs] = useState<AttendanceRecord[]>([]);
  const [kioskAvatarBroken, setKioskAvatarBroken] = useState(false);

  const current = statusSteps[step];
  const statusTitle = verifyError
    ? "Không xác thực được"
    : verifyResult?.matched
      ? "Xác thực thành công"
      : verifyResult && !verifyResult.matched
        ? "Chưa đủ tin cậy"
        : testImageName
          ? "Đã chọn ảnh test"
          : current.title;
  const statusHint = verifyError
    ? verifyError
    : verifyResult?.matched
      ? verifyResult.employee?.full_name ?? "Đã ghi nhận điểm danh"
      : verifyResult && !verifyResult.matched
        ? verifyResult.reason ?? "Vui lòng thử ảnh rõ hơn"
        : testImageName
          ? testImageName
          : current.hint;

  useEffect(() => {
    if (isScanning) return;
    const id = window.setInterval(() => setStep((v) => (v >= 2 ? 0 : v + 1)), 3600);
    return () => window.clearInterval(id);
  }, [isScanning]);

  const runScan = async () => {
    if (testImage) {
      setIsScanning(true);
      setStep(2);
      setVerifyError(null);
      setVerifyResult(null);
      setKioskAvatarBroken(false);

      try {
        const result = await verifyAttendanceImage(testImage, mode);
        setVerifyResult(result);
        setStep(result.matched ? 3 : 1);
        
        if (result.matched && result.employee) {
          getAttendanceRecords({ employeeId: result.employee.id })
            .then((data) => {
              setRecentLogs(data.records.slice(0, 3));
            })
            .catch(() => {});
        }
      } catch (caught) {
        setVerifyError(caught instanceof Error ? caught.message : "Không chấm công được bằng ảnh.");
        setStep(1);
      } finally {
        setIsScanning(false);
      }
      return;
    }

    setIsScanning(true);
    statusSteps.forEach((_, i) => {
      window.setTimeout(() => setStep(i), i * 900);
    });
    window.setTimeout(() => setIsScanning(false), 3850);
  };

  const formatTimeOnly = (tStr: string | null) => {
    if (!tStr) return "--:--";
    return tStr.slice(0, 5);
  };

  const formatTimeISO = (isoString: string | null) => {
    if (!isoString) return "--:--";
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "--:--";
    }
  };

  const getDayOfWeekLabel = (dateStr: string) => {
    try {
      const days = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
      const date = new Date(dateStr);
      return days[date.getDay()];
    } catch {
      return dateStr;
    }
  };

  const mapStatusLabel = (status: string) => {
    switch (status) {
      case "valid":
        return "Đúng giờ";
      case "late":
        return "Đi muộn";
      case "early":
        return "Về sớm";
      default:
        return status;
      case "--":
        return "--";
    }
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
            <label className="test-image-picker" title="Chọn ảnh để test điểm danh">
              <ImagePlus size={18} />
              <input
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setTestImage(file);
                  setTestImageName(file?.name ?? "");
                  setVerifyResult(null);
                  setVerifyError(null);
                  setRecentLogs([]);
                }}
                type="file"
              />
            </label>

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
              <strong>{statusTitle}</strong>
              <small>{statusHint}</small>
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
              {isScanning ? "Đang xử lý..." : testImage ? "Chấm công bằng ảnh" : "Mô phỏng nhận diện"}
            </button>
          </div>
        </article>

        <aside className="person-panel">
          <article className={`greeting-card card ${verifyResult?.matched || step === 3 ? "active" : ""}`}>
            <div className="avatar avatar-large">
              {verifyResult?.matched && verifyResult.employee?.face_image_url && !kioskAvatarBroken ? (
                <img
                  src={verifyResult.employee.face_image_url}
                  alt={verifyResult.employee.full_name}
                  style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "28px" }}
                  onError={() => setKioskAvatarBroken(true)}
                />
              ) : (
                <UserRound size={50} />
              )}
            </div>
            <p className="eyebrow">{verifyResult?.matched || step === 3 ? "Xác thực thành công" : "Đang chờ xác thực"}</p>
            <h2>{verifyResult?.matched ? `Xin chào, ${verifyResult.employee?.full_name}!` : "Chọn ảnh để test"}</h2>
            <p className="muted">
              {verifyResult?.matched
                ? `${verifyResult.employee?.department ?? "Chưa cập nhật"} · ${verifyResult.employee?.employee_code}`
                : testImageName || "Chưa có ảnh điểm danh"}
            </p>
            {verifyResult && !verifyResult.matched && (
              <p className={`kiosk-match-note ${verifyResult.matched ? "success" : "error"}`}>
                {verifyResult.reason}
              </p>
            )}
          </article>

          <article className="shift-card card">
            <div>
              <p className="eyebrow">Ca làm việc hôm nay</p>
              {verifyResult?.record ? (
                <h3>
                  {formatTimeOnly(verifyResult.record.start_time)} - {formatTimeOnly(verifyResult.record.end_time)}
                </h3>
              ) : (
                <h3>--:-- - --:--</h3>
              )}
            </div>
            <StatusBadge 
              status={verifyResult?.record ? mapStatusLabel(verifyResult.record.status) : "--"} 
            />
          </article>

          <article className="history-card card">
            <div className="section-title">
              <h3>3 lần gần nhất</h3>
              <span>Tuần này</span>
            </div>
            <div className="mini-table">
              {recentLogs.length === 0 ? (
                <p className="muted" style={{ padding: "8px", fontStyle: "italic", fontSize: "12px" }}>
                  Chưa có lịch sử điểm danh.
                </p>
              ) : (
                recentLogs.map((log) => {
                  const day = getDayOfWeekLabel(log.attendance_date);
                  // Use check_out_at if check-out mode or check_in_at is empty, else check_in_at
                  const hasCheckOut = Boolean(log.check_out_at);
                  const displayTime = hasCheckOut ? formatTimeISO(log.check_out_at) : formatTimeISO(log.check_in_at);
                  const displayType = hasCheckOut ? "Check-out" : "Check-in";
                  
                  return (
                    <div key={log.id}>
                      <strong>{day}</strong>
                      <span>{displayTime}</span>
                      <em>{displayType}</em>
                    </div>
                  );
                })
              )}
            </div>
          </article>
        </aside>
      </section>
    </main>
  );
}
