import { CheckCircle2, XCircle } from "lucide-react";

import { approvalRequests } from "../../../data/demoData";
import { StatusBadge } from "../../../components/ui/StatusBadge";

export function ApprovalPanel() {
  return (
    <article className="card profile-detail">
      <div className="section-title">
        <h3>Yêu cầu chỉnh sửa công</h3>
        <span>Quên check-out, camera lỗi, đi công tác</span>
      </div>
      <div className="approval-list">
        {approvalRequests.map((item) => (
          <div className="approval-row" key={`${item.name}-${item.request}`}>
            <div>
              <strong>{item.name}</strong>
              <span>{item.reason} · {item.request}</span>
            </div>
            <StatusBadge status={item.status === "Đã duyệt" ? "Hợp lệ" : "Đi muộn"} label={item.status} />
            <div className="approval-actions">
              <button className="icon-soft accept" aria-label={`Duyệt ${item.name}`} type="button">
                <CheckCircle2 size={17} />
              </button>
              <button className="icon-soft reject" aria-label={`Từ chối ${item.name}`} type="button">
                <XCircle size={17} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
