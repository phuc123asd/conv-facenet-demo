export function SettingsPanel() {
  return (
    <div className="settings-grid">
      <article className="card settings-card">
        <h3>Cài đặt hệ thống</h3>
        <label>
          <span>Tự động chuyển Check-in/out theo giờ</span>
          <input type="checkbox" defaultChecked />
        </label>
        <label>
          <span>Yêu cầu liveness nâng cao</span>
          <input type="checkbox" defaultChecked />
        </label>
        <label>
          <span>Lưu ảnh nghi vấn spoofing</span>
          <input type="checkbox" defaultChecked />
        </label>
        <label>
          <span>Khóa sửa công sau khi chốt tháng</span>
          <input type="checkbox" defaultChecked />
        </label>
      </article>
      <article className="card settings-card">
        <h3>Phân quyền</h3>
        <label>
          <span>HR được duyệt chỉnh sửa công</span>
          <input type="checkbox" defaultChecked />
        </label>
        <label>
          <span>Quản lý chỉ xem nhân viên phòng ban</span>
          <input type="checkbox" defaultChecked />
        </label>
        <label>
          <span>Bắt buộc ghi lý do khi sửa dữ liệu</span>
          <input type="checkbox" defaultChecked />
        </label>
      </article>
    </div>
  );
}
