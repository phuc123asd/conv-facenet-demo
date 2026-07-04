import { type ReactNode, useEffect, useState } from "react";
import { Check, Flag, ShieldAlert, ShieldCheck, UsersRound, X } from "lucide-react";

import { getAttendanceStats } from "../../../services/attendanceApi";
import type { AttendanceStats } from "../../../types/attendance";

export function DashboardPanel() {
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    getAttendanceStats()
      .then((data) => {
        if (isMounted) {
          setStats(data);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (isMounted) {
          setError(caught instanceof Error ? caught.message : "Không tải được thống kê.");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return <div className="employee-empty">Đang tải dữ liệu thống kê...</div>;
  }

  if (error) {
    return <div className="employee-empty error">{error}</div>;
  }

  const s = stats ?? {
    total_employees: 0,
    present_count: 0,
    absent_count: 0,
    late_count: 0,
    early_count: 0,
    liveness_rate: 98.0,
    alert_count: 0,
    recent_alerts: []
  };

  const livenessPct = Math.round(s.liveness_rate);

  return (
    <>
      <div className="stats-grid">
        <StatCard icon={<UsersRound size={22} />} tone="blue" label="Tổng NV" value={String(s.total_employees)} />
        <StatCard icon={<Check size={22} />} tone="green" label="Hiện diện" value={String(s.present_count)} />
        <StatCard icon={<X size={22} />} tone="red" label="Vắng mặt" value={String(s.absent_count)} />
        <StatCard icon={<ShieldCheck size={22} />} tone="cyan" label="Đi muộn" value={String(s.late_count)} />
      </div>

      <div className="dashboard-grid">
        <article className="card ai-card">
          <div className="section-title">
            <h3>AI &amp; Liveness</h3>
            <span>Hôm nay</span>
          </div>
          <div className="donut" aria-label={`Tỷ lệ liveness hợp lệ ${livenessPct}%`}>
            <svg viewBox="0 0 120 120" role="img">
              <circle cx="60" cy="60" r="48" />
              <circle 
                className="progress" 
                cx="60" 
                cy="60" 
                r="48" 
                style={{ strokeDashoffset: 301.6 - (301.6 * livenessPct) / 100 }}
              />
            </svg>
            <div>
              <strong>{livenessPct}%</strong>
              <span>hợp lệ</span>
            </div>
          </div>
          <div className="bar-list">
            <label>
              <span>Nhận diện thành công</span>
              <b>{s.present_count}</b>
            </label>
            <div className="bar">
              <i style={{ width: s.present_count > 0 ? `${Math.round((s.present_count / s.total_employees) * 100)}%` : "0%" }} />
            </div>
            <label>
              <span>Về sớm</span>
              <b>{s.early_count}</b>
            </label>
            <div className="bar warn">
              <i style={{ width: s.present_count > 0 ? `${Math.round((s.early_count / s.present_count) * 100)}%` : "0%" }} />
            </div>
          </div>
        </article>

        <article className="card spoof-card">
          <div className="section-title">
            <h3>Cảnh báo spoofing</h3>
            <span>{s.alert_count} mục cần xem</span>
          </div>
          <div className="alert-list">
            {s.recent_alerts.length === 0 ? (
              <div className="employee-empty" style={{ minHeight: "150px" }}>
                Chưa phát hiện hành vi giả mạo hôm nay.
              </div>
            ) : (
              s.recent_alerts.map((alert) => {
                const timeStr = new Date(alert.created_at).toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit"
                });
                
                let tone = "sunset"; // Low
                let riskLabel = "Thấp";
                if (alert.risk_level === "high" || alert.risk_level === "Cao") {
                  tone = "rose";
                  riskLabel = "Cao";
                } else if (alert.risk_level === "medium" || alert.risk_level === "Trung bình") {
                  tone = "aqua";
                  riskLabel = "Trung bình";
                }

                return (
                  <div className={`spoof-event ${tone}`} key={alert.id}>
                    <span className="event-signal">
                      <ShieldAlert size={20} />
                    </span>
                    <div className="event-copy">
                      <strong>{alert.alert_type}</strong>
                      <em>
                        <span>{timeStr}</span>
                        <span>{alert.employees?.full_name || "Khách lạ"}</span>
                      </em>
                    </div>
                    <span className="risk-pill">{riskLabel}</span>
                    <button className="event-action" aria-label={`Xem cảnh báo ${alert.alert_type}`} type="button">
                      <Flag size={16} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </article>
      </div>
    </>
  );
}

function StatCard({ icon, tone, label, value }: { icon: ReactNode; tone: string; label: string; value: string }) {
  return (
    <article className="stat-card card">
      <span className={`stat-icon ${tone}`}>{icon}</span>
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}
