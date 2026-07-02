import type { ReactNode } from "react";
import { Check, Flag, ShieldAlert, ShieldCheck, UsersRound, X } from "lucide-react";

import { spoofAlerts } from "../../../data/demoData";

export function DashboardPanel() {
  return (
    <>
      <div className="stats-grid">
        <StatCard icon={<UsersRound size={22} />} tone="blue" label="Tổng NV" value="138" />
        <StatCard icon={<Check size={22} />} tone="green" label="Check-in" value="110" />
        <StatCard icon={<X size={22} />} tone="red" label="Vắng mặt" value="28" />
        <StatCard icon={<ShieldCheck size={22} />} tone="cyan" label="Face ID hợp lệ" value="124" />
      </div>

      <div className="dashboard-grid">
        <article className="card ai-card">
          <div className="section-title">
            <h3>AI &amp; Liveness</h3>
            <span>Hôm nay</span>
          </div>
          <div className="donut" aria-label="Tỷ lệ liveness hợp lệ 90%">
            <svg viewBox="0 0 120 120" role="img">
              <circle cx="60" cy="60" r="48" />
              <circle className="progress" cx="60" cy="60" r="48" />
            </svg>
            <div>
              <strong>90%</strong>
              <span>hợp lệ</span>
            </div>
          </div>
          <div className="bar-list">
            <label>
              <span>Nhận diện thành công</span>
              <b>124</b>
            </label>
            <div className="bar">
              <i style={{ width: "90%" }} />
            </div>
            <label>
              <span>Yêu cầu quét lại</span>
              <b>14</b>
            </label>
            <div className="bar warn">
              <i style={{ width: "28%" }} />
            </div>
          </div>
        </article>

        <article className="card spoof-card">
          <div className="section-title">
            <h3>Cảnh báo spoofing</h3>
            <span>3 mục cần xem</span>
          </div>
          <div className="alert-list">
            {spoofAlerts.map((alert) => (
              <div className={`spoof-event ${alert.tone}`} key={alert.title}>
                <span className="event-signal">
                  <ShieldAlert size={20} />
                </span>
                <div className="event-copy">
                  <strong>{alert.title}</strong>
                  <em>
                    <span>{alert.time}</span>
                    <span>{alert.location}</span>
                  </em>
                </div>
                <span className="risk-pill">{alert.risk}</span>
                <button className="event-action" aria-label={`Xem cảnh báo ${alert.title}`} type="button">
                  <Flag size={16} />
                </button>
              </div>
            ))}
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
