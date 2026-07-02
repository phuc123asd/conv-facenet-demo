import { Monitor } from "lucide-react";

import { devices } from "../../../data/demoData";
import { StatusBadge } from "../../../components/ui/StatusBadge";

export function DevicePanel() {
  return (
    <div className="management-grid">
      {devices.map((device) => (
        <article className="card management-card" key={device.camera}>
          <div className="section-title">
            <h3>{device.name}</h3>
            <StatusBadge status={device.status === "Online" ? "Hợp lệ" : "Đi muộn"} label={device.status} />
          </div>
          <div className="device-preview">
            <Monitor size={42} />
          </div>
          <div className="rule-list">
            <div><span>Camera</span><strong>{device.camera}</strong></div>
            <div><span>Lần cuối</span><strong>{device.lastSeen}</strong></div>
            <div><span>Cảnh báo</span><strong>{device.alerts}</strong></div>
          </div>
        </article>
      ))}
    </div>
  );
}
