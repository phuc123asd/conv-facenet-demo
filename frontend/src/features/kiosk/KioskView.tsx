import { useEffect, useState } from "react";
import { ImagePlus, UserRound } from "lucide-react";

import { statusSteps } from "../../data/demoData";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { verifyAttendanceImage } from "../../services/attendanceApi";
import type { AttendanceVerifyResult } from "../../types/attendance";

export function KioskView() {
  const [mode, setMode] = useState<"check-in" | "check-out">("check-in");
  const [step, setStep] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [testImage, setTestImage] = useState<File | null>(null);
  const [testImageName, setTestImageName] = useState("");
  const [verifyResult, setVerifyResult] = useState<AttendanceVerifyResult | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
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

      try {
        const result = await verifyAttendanceImage(testImage, mode);
        setVerifyResult(result);
        setStep(result.matched ? 3 : 1);
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
              <UserRound size={50} />
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
