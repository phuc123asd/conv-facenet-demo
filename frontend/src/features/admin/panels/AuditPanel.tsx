import { auditLogs } from "../../../data/demoData";
import { TimelineItem } from "../../../components/ui/TimelineItem";

export function AuditPanel() {
  return (
    <article className="card profile-detail">
      <div className="section-title">
        <h3>Audit log</h3>
        <span>Theo dõi thay đổi dữ liệu điểm danh</span>
      </div>
      <div className="timeline audit-timeline">
        {auditLogs.map((log) => (
          <TimelineItem key={`${log.actor}-${log.time}`} title={`${log.time} · ${log.actor}`} detail={`${log.action} · ${log.target}`} />
        ))}
      </div>
    </article>
  );
}
