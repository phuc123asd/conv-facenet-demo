import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, CameraOff, CheckCircle2, Clock, RotateCcw, UserRound } from "lucide-react";

import { StatusBadge } from "../../components/ui/StatusBadge";
import { getAttendanceRecords, recognizeAttendanceBatch, verifyAttendanceImage } from "../../services/attendanceApi";
import type { AttendanceBatchRecognitionResult, AttendanceRecord, AttendanceVerifyResult } from "../../types/attendance";

const SAMPLE_DURATION_MS = 5_000;
const SAMPLE_INTERVAL_MS = 700;
const MAX_FRAME_WIDTH = 640;
const FRAME_QUALITY = 0.75;
const MIN_BATCH_FRAMES = 5;

type CameraStatus = "starting" | "active" | "stopped" | "denied" | "unsupported";
type KioskPhase = "idle" | "guiding" | "analyzing" | "ready" | "committing" | "success" | "error";

export function KioskView() {
  const [mode, setMode] = useState<"check-in" | "check-out">("check-in");
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("stopped");
  const [phase, setPhase] = useState<KioskPhase>("idle");
  const [batchResult, setBatchResult] = useState<AttendanceBatchRecognitionResult | null>(null);
  const [verifyResult, setVerifyResult] = useState<AttendanceVerifyResult | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [recentLogs, setRecentLogs] = useState<AttendanceRecord[]>([]);
  const [kioskAvatarBroken, setKioskAvatarBroken] = useState(false);
  const [progress, setProgress] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sampleFramesRef = useRef<Blob[]>([]);
  const timersRef = useRef<number[]>([]);
  const committedRef = useRef(false);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timersRef.current = [];
  }, []);

  const resetSession = useCallback(() => {
    clearTimers();
    sampleFramesRef.current = [];
    committedRef.current = false;
    setBatchResult(null);
    setVerifyResult(null);
    setVerifyError(null);
    setKioskAvatarBroken(false);
    setProgress(0);
    setPhase("idle");
  }, [clearTimers]);

  const stopCamera = useCallback(() => {
    clearTimers();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    sampleFramesRef.current = [];
    setProgress(0);
    setCameraStatus("stopped");
    setPhase("idle");
  }, [clearTimers]);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus("unsupported");
      return false;
    }

    setCameraStatus("starting");
    setVerifyError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (error: any) {
          if (error.name !== "AbortError") {
            throw error;
          }
        }
      }
      setCameraStatus("active");
      return true;
    } catch (caught) {
      setCameraStatus("denied");
      setVerifyError(caught instanceof Error ? caught.message : "Không mở được camera.");
      return false;
    }
  }, []);

  useEffect(() => {
    void startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  useEffect(() => {
    resetSession();
  }, [mode, resetSession]);

  const captureFrame = useCallback(
    () =>
      new Promise<Blob | null>((resolve) => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
          resolve(null);
          return;
        }

        const sourceWidth = video.videoWidth || 640;
        const sourceHeight = video.videoHeight || 480;
        const scale = Math.min(1, MAX_FRAME_WIDTH / sourceWidth);
        canvas.width = Math.round(sourceWidth * scale);
        canvas.height = Math.round(sourceHeight * scale);

        const context = canvas.getContext("2d");
        if (!context) {
          resolve(null);
          return;
        }

        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", FRAME_QUALITY);
      }),
    [],
  );

  const analyzeSampleBatch = useCallback(async () => {
    setPhase("analyzing");
    setVerifyError(null);

    // Crawl progress slowly from the current progress (approx 90) to 98% while waiting for backend
    const crawlTimer = window.setInterval(() => {
      setProgress((prev) => {
        if (prev < 98) {
          return prev + 0.8;
        }
        return prev;
      });
    }, 100);
    timersRef.current.push(crawlTimer);

    try {
      const frames = sampleFramesRef.current.slice();
      if (frames.length < MIN_BATCH_FRAMES) {
        throw new Error("Không nhận diện được. Vui lòng thử lại.");
      }

      const result = await recognizeAttendanceBatch(frames, mode);
      setBatchResult(result);
      setKioskAvatarBroken(false);

      window.clearInterval(crawlTimer);
      if (result.matched) {
        setProgress(100);
        setPhase("ready");
      } else {
        setProgress(0);
        setPhase("error");
        setVerifyError("Không nhận diện được khuôn mặt. Vui lòng thử lại.");
      }
    } catch (caught) {
      window.clearInterval(crawlTimer);
      setProgress(0);
      setPhase("error");
      setVerifyError(caught instanceof Error ? caught.message : "Không phân tích được mẫu camera.");
    }
  }, [mode]);

  const startSampling = useCallback(async () => {
    const cameraReady = cameraStatus === "active" || (await startCamera());
    if (!cameraReady) return;

    clearTimers();
    sampleFramesRef.current = [];
    committedRef.current = false;
    setBatchResult(null);
    setVerifyResult(null);
    setVerifyError(null);
    setKioskAvatarBroken(false);
    setPhase("guiding");
    setProgress(0);

    const startTime = Date.now();
    const progressTimer = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed < SAMPLE_DURATION_MS) {
        const currentProgress = (elapsed / SAMPLE_DURATION_MS) * 90;
        setProgress(currentProgress);
      } else {
        setProgress(90);
      }
    }, 30);

    const sampleTimer = window.setInterval(() => {
      void captureFrame().then((frame) => {
        if (!frame) return;
        sampleFramesRef.current.push(frame);
      });
    }, SAMPLE_INTERVAL_MS);

    const finishTimer = window.setTimeout(() => {
      window.clearInterval(sampleTimer);
      window.clearInterval(progressTimer);
      void captureFrame().then((frame) => {
        if (frame) {
          sampleFramesRef.current.push(frame);
        }
        void analyzeSampleBatch();
      });
    }, SAMPLE_DURATION_MS);

    timersRef.current = [sampleTimer, finishTimer, progressTimer];
  }, [analyzeSampleBatch, cameraStatus, captureFrame, clearTimers, startCamera]);

  const confirmAttendance = useCallback(async () => {
    if (!batchResult?.matched || committedRef.current) return;

    const evidenceIndex = batchResult.best_frame_index ?? sampleFramesRef.current.length - 1;
    const evidenceFrame =
      sampleFramesRef.current[evidenceIndex] ?? sampleFramesRef.current[sampleFramesRef.current.length - 1];
    if (!evidenceFrame) {
      setVerifyError("Không ghi nhận được. Vui lòng thử lại.");
      setPhase("error");
      return;
    }

    committedRef.current = true;
    setPhase("committing");
    setVerifyError(null);

    try {
      const file = new File([evidenceFrame], "camera-confirmed.jpg", { type: "image/jpeg" });
      const result = await verifyAttendanceImage(file, mode);
      if (!result.matched) {
        throw new Error(result.reason ?? "Không xác nhận được khuôn mặt.");
      }

      setVerifyResult(result);
      setPhase("success");

      if (result.employee) {
        getAttendanceRecords({ employeeId: result.employee.id })
          .then((data) => setRecentLogs(data.records.slice(0, 3)))
          .catch(() => {});
      }
    } catch (caught) {
      committedRef.current = false;
      setPhase("ready");
      setVerifyError(caught instanceof Error ? caught.message : "Không ghi nhận được điểm danh.");
    }
  }, [batchResult, mode]);

  const displayEmployee = verifyResult?.employee ?? batchResult?.employee ?? null;
  const hasMatched = Boolean(displayEmployee);
  const isScanning = phase === "guiding" || phase === "analyzing" || phase === "committing";
  const frameStep = verifyError ? 1 : phase === "success" ? 3 : batchResult?.matched ? 2 : phase === "guiding" ? 2 : 0;

  const statusTitle = useMemo(() => {
    if (cameraStatus === "starting") return "Đang mở camera";
    if (cameraStatus === "denied") return "Chưa có quyền camera";
    if (cameraStatus === "unsupported") return "Trình duyệt không hỗ trợ camera";
    if (cameraStatus === "stopped") return "Camera đang tắt";
    if (phase === "guiding" || phase === "analyzing") return "Đang xác thực";
    if (phase === "ready") return "Đã nhận diện";
    if (phase === "committing") return "Đang ghi nhận";
    if (phase === "success") return "Đã chấm công thành công";
    if (phase === "error") return "Không nhận diện được";
    return "Sẵn sàng điểm danh";
  }, [cameraStatus, phase]);

  const statusHint = useMemo(() => {
    if (verifyError) return verifyError;
    if (phase === "guiding" || phase === "analyzing") return "Vui lòng nhìn vào camera và giữ khuôn mặt trong khung.";
    if (phase === "ready" && batchResult?.employee) {
      return `${batchResult.employee.full_name}. Vui lòng bấm xác nhận để chấm công.`;
    }
    if (phase === "success") return verifyResult?.employee?.full_name ?? "Đã ghi nhận điểm danh";
    if (cameraStatus === "active") return "Bấm bắt đầu để điểm danh bằng khuôn mặt.";
    if (cameraStatus === "denied") return "Hãy cấp quyền camera trên trình duyệt";
    return "Bật camera để điểm danh bằng khuôn mặt";
  }, [batchResult, cameraStatus, phase, verifyError, verifyResult]);

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
      case "no-shift":
        return "Không có ca";
      case "--":
        return "--";
      default:
        return status;
    }
  };

  const formatLateness = (totalSeconds: number) => {
    if (totalSeconds <= 0) return null;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0 && minutes > 0) return `Muộn ${hours} giờ ${minutes} phút`;
    if (hours > 0) return `Muộn ${hours} giờ`;
    if (minutes > 0) return `Muộn ${minutes} phút`;
    return "Muộn dưới 1 phút";
  };

  const formatEarlyLeaving = (totalSeconds: number) => {
    if (totalSeconds <= 0) return null;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0 && minutes > 0) return `Về sớm ${hours} giờ ${minutes} phút`;
    if (hours > 0) return `Về sớm ${hours} giờ`;
    if (minutes > 0) return `Về sớm ${minutes} phút`;
    return "Về sớm dưới 1 phút";
  };

  const activeShiftName = verifyResult?.record?.shift_name ?? batchResult?.shift_info?.shift_name ?? null;
  const activeStartTime = verifyResult?.record?.start_time ?? batchResult?.shift_info?.start_time ?? null;
  const activeEndTime = verifyResult?.record?.end_time ?? batchResult?.shift_info?.end_time ?? null;
  const activeStatus = verifyResult?.record
    ? verifyResult.record.status
    : (batchResult?.shift_info
        ? (mode === "check-in"
            ? (batchResult.shift_info.late_seconds > 0 ? "late" : "valid")
            : (batchResult.shift_info.early_seconds > 0 ? "early" : "valid"))
        : (hasMatched ? "no-shift" : "--"));
  const deviationLabel = mode === "check-in"
    ? (batchResult?.shift_info?.late_seconds ? formatLateness(batchResult.shift_info.late_seconds) : null)
    : (batchResult?.shift_info?.early_seconds ? formatEarlyLeaving(batchResult.shift_info.early_seconds) : null);

  return (
    <main className="view-space">
      <section className="kiosk-grid">
        <article className="camera-card card">
          <div className="camera-header">
            <div>
              <p className="eyebrow">User Check-in Kiosk</p>
              <h2>Điểm danh khuôn mặt</h2>
            </div>
            <div className={`live-pill ${cameraStatus === "active" ? "active" : ""}`}>
              <span />
              {cameraStatus === "active" ? "Live" : "Offline"}
            </div>
          </div>

          <div className={`camera-frame ${isScanning ? "scanning" : ""}`} data-step={frameStep}>
            <video ref={videoRef} className="camera-video" autoPlay muted playsInline />
            <canvas ref={canvasRef} className="camera-canvas" aria-hidden="true" />

            {cameraStatus !== "active" && (
              <div className="camera-placeholder">
                <CameraOff size={44} />
                <strong>{statusTitle}</strong>
                <span>{statusHint}</span>
              </div>
            )}

            <div className="scan-line" />

            <div className="liveness-ring" />


            {(phase === "ready" || phase === "success") && (
              <div className="faceid-success-overlay">
                <svg className="faceid-svg" viewBox="0 0 100 100" fill="none">
                  {/* ── T+0ms: 4 corner brackets draw (stagger 80ms) ── */}
                  <path className="face-corner corner-tl" d="M 18 32 V 24 C 18 20.7 20.7 18 24 18 H 32" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path className="face-corner corner-tr" d="M 68 18 H 76 C 79.3 18 82 20.7 82 24 V 32" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path className="face-corner corner-bl" d="M 18 68 V 76 C 18 79.3 20.7 82 24 82 H 32" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path className="face-corner corner-br" d="M 82 68 V 76 C 82 79.3 79.3 82 76 82 H 68" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />

                  {/* ── T+150ms: Eyes scale in, T+550ms: squint (Duchenne) ── */}
                  {/* All values use M C structure for valid SMIL interpolation */}
                  <path className="face-eye eye-l" d="M 35 44 C 36 36 40 36 41 44" stroke="#fff" strokeWidth="4.5" strokeLinecap="round">
                    <animate attributeName="d"
                      values="M 35 44 C 36 36 40 36 41 44;M 35 44 C 36 36 40 36 41 44;M 35 44 C 36 40 40 40 41 44;M 35 44 C 36.5 39 39.5 39 41 44"
                      keyTimes="0;0.4;0.85;1"
                      keySplines="0.25 0.1 0.25 1;0.34 1.56 0.64 1;0.25 0.1 0.25 1"
                      calcMode="spline" dur="0.9s" begin="0.15s" fill="freeze" />
                  </path>
                  <path className="face-eye eye-r" d="M 59 44 C 60 36 64 36 65 44" stroke="#fff" strokeWidth="4.5" strokeLinecap="round">
                    <animate attributeName="d"
                      values="M 59 44 C 60 36 64 36 65 44;M 59 44 C 60 36 64 36 65 44;M 59 44 C 60 40 64 40 65 44;M 59 44 C 60.5 39 63.5 39 65 44"
                      keyTimes="0;0.4;0.85;1"
                      keySplines="0.25 0.1 0.25 1;0.34 1.56 0.64 1;0.25 0.1 0.25 1"
                      calcMode="spline" dur="0.9s" begin="0.15s" fill="freeze" />
                  </path>

                  {/* ── T+150ms: Nose draw ── */}
                  <path className="face-nose" d="M 50 38 V 52 C 50 55 48 56 46 56" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />

                  {/* ── T+350ms: Mouth draw neutral, T+550ms: morph to smile ── */}
                  {/* All values use M C C structure for valid SMIL interpolation */}
                  <path className="face-mouth" d="M 40 66 C 43 66 47 66 50 66 C 53 66 57 66 60 66" stroke="#fff" strokeWidth="4.5" strokeLinecap="round">
                    <animate attributeName="d"
                      values="M 40 66 C 43 66 47 66 50 66 C 53 66 57 66 60 66;M 40 66 C 43 66 47 66 50 66 C 53 66 57 66 60 66;M 39 65 C 42 65 44 70 50 70 C 56 70 58 65 61 65;M 38 64 C 42 64 44 73 50 73 C 56 73 58 64 62 64;M 38 64 C 42 64 44 73 50 73 C 56 73 58 64 62 64"
                      keyTimes="0;0.3;0.65;0.88;1"
                      keySplines="0.25 0.1 0.25 1;0.34 1.56 0.64 1;0.34 1.56 0.64 1;0.25 0.1 0.25 1"
                      calcMode="spline" dur="0.85s" begin="0.35s" fill="freeze" />
                  </path>
                </svg>
              </div>
            )}
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
            <div className="kiosk-command-group">
              {batchResult?.matched && phase !== "success" ? (
                <button className="primary-action" disabled={phase === "committing"} onClick={confirmAttendance} type="button">
                  <CheckCircle2 size={18} />
                  {phase === "committing" ? "Đang ghi..." : "Xác nhận chấm công"}
                </button>
              ) : (
                <button
                  className="primary-action"
                  disabled={phase === "guiding" || phase === "analyzing" || phase === "committing"}
                  onClick={startSampling}
                  type="button"
                >
                  <Camera size={18} />
                  {phase === "success" ? "Điểm danh tiếp" : "Bắt đầu"}
                </button>
              )}
              <button className="secondary-action" onClick={cameraStatus === "active" ? stopCamera : startCamera} type="button">
                {cameraStatus === "active" ? <CameraOff size={18} /> : <Camera size={18} />}
                {cameraStatus === "active" ? "Tắt camera" : "Bật camera"}
              </button>
              {(phase === "ready" || phase === "error" || phase === "success") && (
                <button className="secondary-action" onClick={resetSession} type="button">
                  <RotateCcw size={18} />
                  Thử lại
                </button>
              )}
            </div>
          </div>
        </article>

        <aside className="person-panel">
          <article className={`greeting-card card ${hasMatched ? "active" : ""}`}>
            <div className="avatar avatar-large">
              {displayEmployee?.face_image_url && !kioskAvatarBroken ? (
                <img
                  src={displayEmployee.face_image_url}
                  alt={displayEmployee.full_name}
                  style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "28px" }}
                  onError={() => setKioskAvatarBroken(true)}
                />
              ) : (
                <UserRound size={50} />
              )}
            </div>
            <p className="eyebrow">{verifyResult?.matched ? "Đã ghi nhận" : hasMatched ? "Chờ người dùng xác nhận" : "Đang chờ xác thực"}</p>
            <h2>{displayEmployee ? `Xin chào, ${displayEmployee.full_name}!` : "Đứng trước camera"}</h2>
            <p className="muted">
              {displayEmployee
                ? `${displayEmployee.department ?? "Chưa cập nhật"} - ${displayEmployee.employee_code}`
                : "Vui lòng đứng trước camera để điểm danh"}
            </p>
            {batchResult?.matched && <p className="kiosk-match-note success">Đã nhận diện khuôn mặt.</p>}
            {verifyError && <p className="kiosk-match-note error">{verifyError}</p>}
          </article>

          <article className="shift-card card">
            <div>
              <p className="eyebrow">{activeShiftName ? `Ca: ${activeShiftName}` : "Ca làm việc hôm nay"}</p>
              {activeStartTime ? (
                <h3>
                  {formatTimeOnly(activeStartTime)} - {formatTimeOnly(activeEndTime)}
                </h3>
              ) : (
                <h3>{hasMatched ? "Không có ca trực" : "--:-- - --:--"}</h3>
              )}
              {deviationLabel && !verifyResult?.record && (
                <p className="kiosk-match-note error" style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <Clock size={14} />
                  {deviationLabel}
                </p>
              )}
            </div>
            <StatusBadge status={mapStatusLabel(activeStatus)} />
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
