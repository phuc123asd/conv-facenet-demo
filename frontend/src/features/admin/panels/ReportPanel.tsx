import { Download, FileSpreadsheet, ShieldAlert } from "lucide-react";

export function ReportPanel() {
  return (
    <div className="admin-stack">
      <div className="report-grid">
        <article className="card report-card">
          <FileSpreadsheet size={28} />
          <h3>Bảng công tháng</h3>
          <p>138 nhân viên · 25 ngày công · 14 lượt đi muộn</p>
          <button className="primary-action" type="button">
            <Download size={18} />
            Xuất Excel
          </button>
        </article>
        <article className="card report-card">
          <ShieldAlert size={28} />
          <h3>Báo cáo AI/Liveness</h3>
          <p>124 lượt hợp lệ · 14 lượt quét lại · 3 cảnh báo spoofing</p>
          <button className="secondary-action" type="button">
            <Download size={18} />
            Tải PDF
          </button>
        </article>
      </div>
      <article className="card profile-detail">
        <div className="section-title">
          <h3>Tổng hợp theo phòng ban</h3>
          <span>Tháng này</span>
        </div>
        <div className="bar-list report-bars">
          <label><span>Product Operations</span><b>97%</b></label>
          <div className="bar"><i style={{ width: "97%" }} /></div>
          <label><span>Fulfillment</span><b>91%</b></label>
          <div className="bar warn"><i style={{ width: "91%" }} /></div>
          <label><span>Retail</span><b>88%</b></label>
          <div className="bar warn"><i style={{ width: "88%" }} /></div>
        </div>
      </article>
    </div>
  );
}
