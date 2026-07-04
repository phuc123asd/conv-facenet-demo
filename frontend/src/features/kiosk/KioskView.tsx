import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, CameraOff, CheckCircle2, RotateCcw, UserRound } from "lucide-react";

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
        await videoRef.current.play();
      }
      setCameraStatus("active");
      return true;
    } catch (caught) {
      setCameraStatus("denied");
      setVerifyError(caught instanceof Error ? caught.message : "Khong mo duoc camera.");
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

    try {
      const frames = sampleFramesRef.current.slice();
      if (frames.length < MIN_BATCH_FRAMES) {
        throw new Error("Khong nhan dien duoc. Vui long thu lai.");
      }

      const result = await recognizeAttendanceBatch(frames, mode);
      setBatchResult(result);
      setKioskAvatarBroken(false);
      setPhase(result.matched ? "ready" : "error");
      if (!result.matched) {
        setVerifyError("Khong nhan dien duoc khuon mat. Vui long thu lai.");
      }
    } catch (caught) {
      setPhase("error");
      setVerifyError(caught instanceof Error ? caught.message : "Khong phan tich duoc mau camera.");
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

    const sampleTimer = window.setInterval(() => {
      void captureFrame().then((frame) => {
        if (!frame) return;
        sampleFramesRef.current.push(frame);
      });
    }, SAMPLE_INTERVAL_MS);

    const finishTimer = window.setTimeout(() => {
      window.clearInterval(sampleTimer);
      void captureFrame().then((frame) => {
        if (frame) {
          sampleFramesRef.current.push(frame);
        }
        void analyzeSampleBatch();
      });
    }, SAMPLE_DURATION_MS);

    timersRef.current = [sampleTimer, finishTimer];
  }, [analyzeSampleBatch, cameraStatus, captureFrame, clearTimers, startCamera]);

  const confirmAttendance = useCallback(async () => {
    if (!batchResult?.matched || committedRef.current) return;

    const evidenceIndex = batchResult.best_frame_index ?? sampleFramesRef.current.length - 1;
    const evidenceFrame =
      sampleFramesRef.current[evidenceIndex] ?? sampleFramesRef.current[sampleFramesRef.current.length - 1];
    if (!evidenceFrame) {
      setVerifyError("Khong ghi nhan duoc. Vui long thu lai.");
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
        throw new Error(result.reason ?? "Khong xac nhan duoc khuon mat.");
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
      setVerifyError(caught instanceof Error ? caught.message : "Khong ghi nhan duoc diem danh.");
    }
  }, [batchResult, mode]);

  const displayEmployee = verifyResult?.employee ?? batchResult?.employee ?? null;
  const hasMatched = Boolean(displayEmployee);
  const isScanning = phase === "guiding" || phase === "analyzing" || phase === "committing";
  const frameStep = verifyError ? 1 : phase === "success" ? 3 : batchResult?.matched ? 2 : phase === "guiding" ? 2 : 0;

  const statusTitle = useMemo(() => {
    if (cameraStatus === "starting") return "Dang mo camera";
    if (cameraStatus === "denied") return "Chua co quyen camera";
    if (cameraStatus === "unsupported") return "Trinh duyet khong ho tro camera";
    if (cameraStatus === "stopped") return "Camera dang tat";
    if (phase === "guiding" || phase === "analyzing") return "Dang xac thuc";
    if (phase === "ready") return "Da nhan dien";
    if (phase === "committing") return "Dang ghi nhan";
    if (phase === "success") return "Da cham cong thanh cong";
    if (phase === "error") return "Khong nhan dien duoc";
    return "San sang diem danh";
  }, [cameraStatus, phase]);

  const statusHint = useMemo(() => {
    if (verifyError) return verifyError;
    if (phase === "guiding" || phase === "analyzing") return "Vui long nhin vao camera va giu khuon mat trong khung.";
    if (phase === "ready" && batchResult?.employee) {
      return `${batchResult.employee.full_name}. Vui long bam xac nhan de cham cong.`;
    }
    if (phase === "success") return verifyResult?.employee?.full_name ?? "Da ghi nhan diem danh";
    if (cameraStatus === "active") return "Bam bat dau de diem danh bang khuon mat.";
    if (cameraStatus === "denied") return "Hay cap quyen camera tren trinh duyet";
    return "Bat camera de diem danh bang khuon mat";
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
      const days = ["Chu nhat", "Thu 2", "Thu 3", "Thu 4", "Thu 5", "Thu 6", "Thu 7"];
      const date = new Date(dateStr);
      return days[date.getDay()];
    } catch {
      return dateStr;
    }
  };

  const mapStatusLabel = (status: string) => {
    switch (status) {
      case "valid":
        return "Dung gio";
      case "late":
        return "Di muon";
      case "early":
        return "Ve som";
      case "--":
        return "--";
      default:
        return status;
    }
  };

  return (
    <main className="view-space">
      <section className="kiosk-grid">
        <article className="camera-card card">
          <div className="camera-header">
            <div>
              <p className="eyebrow">User Check-in Kiosk</p>
              <h2>Diem danh khuon mat</h2>
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

            <div className="liveness-ring">
              <svg viewBox="0 0 120 120">
                <circle className="ring-track" cx="60" cy="60" r="54" />
                <circle className="ring-fill" cx="60" cy="60" r="54" />
              </svg>
            </div>

            <div className="camera-footer">
              <span className="status-dot" />
              <strong>{statusTitle}</strong>
              <small>{statusHint}</small>
            </div>
          </div>

          <div className="kiosk-actions">
            <div className="ios-toggle" role="group" aria-label="Chon trang thai cham cong">
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
                  {phase === "committing" ? "Dang ghi..." : "Xac nhan cham cong"}
                </button>
              ) : (
                <button
                  className="primary-action"
                  disabled={phase === "guiding" || phase === "analyzing" || phase === "committing"}
                  onClick={startSampling}
                  type="button"
                >
                  <Camera size={18} />
                  {phase === "success" ? "Diem danh tiep" : "Bat dau"}
                </button>
              )}
              <button className="secondary-action" onClick={cameraStatus === "active" ? stopCamera : startCamera} type="button">
                {cameraStatus === "active" ? <CameraOff size={18} /> : <Camera size={18} />}
                {cameraStatus === "active" ? "Tat camera" : "Bat camera"}
              </button>
              {(phase === "ready" || phase === "error" || phase === "success") && (
                <button className="secondary-action" onClick={resetSession} type="button">
                  <RotateCcw size={18} />
                  Thu lai
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
            <p className="eyebrow">{verifyResult?.matched ? "Da ghi nhan" : hasMatched ? "Cho nguoi dung xac nhan" : "Dang cho xac thuc"}</p>
            <h2>{displayEmployee ? `Xin chao, ${displayEmployee.full_name}!` : "Dung truoc camera"}</h2>
            <p className="muted">
              {displayEmployee
                ? `${displayEmployee.department ?? "Chua cap nhat"} - ${displayEmployee.employee_code}`
                : "Vui long dung truoc camera de diem danh"}
            </p>
            {batchResult?.matched && <p className="kiosk-match-note success">Da nhan dien khuon mat.</p>}
            {verifyError && <p className="kiosk-match-note error">{verifyError}</p>}
          </article>

          <article className="shift-card card">
            <div>
              <p className="eyebrow">Ca lam viec hom nay</p>
              {verifyResult?.record ? (
                <h3>
                  {formatTimeOnly(verifyResult.record.start_time)} - {formatTimeOnly(verifyResult.record.end_time)}
                </h3>
              ) : (
                <h3>--:-- - --:--</h3>
              )}
            </div>
            <StatusBadge status={verifyResult?.record ? mapStatusLabel(verifyResult.record.status) : "--"} />
          </article>

          <article className="history-card card">
            <div className="section-title">
              <h3>3 lan gan nhat</h3>
              <span>Tuan nay</span>
            </div>
            <div className="mini-table">
              {recentLogs.length === 0 ? (
                <p className="muted" style={{ padding: "8px", fontStyle: "italic", fontSize: "12px" }}>
                  Chua co lich su diem danh.
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
