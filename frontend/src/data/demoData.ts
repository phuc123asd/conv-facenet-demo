export const statusSteps = [
  { title: "Đang tìm khuôn mặt...", hint: "Vòng liveness đang quét chậm" },
  { title: "Đã phát hiện khuôn mặt", hint: "Vui lòng nhìn thẳng vào camera" },
  { title: "Đang kiểm tra liveness", hint: "Chớp mắt nhẹ để xác nhận người thật" },
  { title: "Xác thực thành công!", hint: "Thông tin nhân viên đã được ghi nhận" },
];

export const historyRows = [
  { name: "Nguyễn Văn A", date: "25/06", checkIn: "08:01", checkOut: "--", status: "Hợp lệ" },
  { name: "Trần Minh K", date: "25/06", checkIn: "08:24", checkOut: "--", status: "Đi muộn" },
  { name: "Lê Thu H", date: "25/06", checkIn: "07:52", checkOut: "--", status: "Hợp lệ" },
  { name: "Phạm Quốc B", date: "25/06", checkIn: "08:37", checkOut: "--", status: "Đi muộn" },
];

export const spoofAlerts = [
  { title: "Ảnh chụp trước camera", time: "08:42", location: "Cổng A", tone: "sunset", risk: "Cao" },
  { title: "Màn hình điện thoại", time: "09:17", location: "Cổng B", tone: "aqua", risk: "Trung bình" },
  { title: "Ánh sáng bất thường", time: "10:03", location: "Cổng A", tone: "rose", risk: "Thấp" },
];

export const employees = [
  { name: "Nguyễn Văn A", code: "NV-0248", department: "Product Operations", shift: "Hành chính", face: "Đã đăng ký", status: "Đang làm" },
  { name: "Trần Minh K", code: "NV-0312", department: "Fulfillment", shift: "Ca sáng", face: "Cần cập nhật", status: "Đang làm" },
  { name: "Lê Thu H", code: "NV-0186", department: "HR", shift: "Hành chính", face: "Đã đăng ký", status: "Đang làm" },
  { name: "Phạm Quốc B", code: "NV-0415", department: "Retail", shift: "Ca chiều", face: "Chưa đăng ký", status: "Thử việc" },
];

export const shifts = [
  { name: "Hành chính", time: "08:00 - 17:00", late: "Sau 08:10", early: "Trước 16:45", members: 86 },
  { name: "Ca sáng", time: "06:00 - 14:00", late: "Sau 06:05", early: "Trước 13:50", members: 24 },
  { name: "Ca chiều", time: "14:00 - 22:00", late: "Sau 14:05", early: "Trước 21:50", members: 28 },
];

export const approvalRequests = [
  { name: "Trần Minh K", reason: "Quên check-out", request: "Bổ sung giờ ra 17:12", status: "Chờ duyệt" },
  { name: "Phạm Quốc B", reason: "Camera cổng B lỗi", request: "Xác nhận check-in 08:04", status: "Chờ duyệt" },
  { name: "Lê Thu H", reason: "Đi công tác", request: "Miễn điểm danh buổi chiều", status: "Đã duyệt" },
];

export const devices = [
  { name: "Kiosk Cổng A", camera: "CAM-A01", status: "Online", lastSeen: "Vừa xong", alerts: 1 },
  { name: "Kiosk Cổng B", camera: "CAM-B02", status: "Online", lastSeen: "2 phút trước", alerts: 2 },
  { name: "Kiosk Sảnh HR", camera: "CAM-HR1", status: "Offline", lastSeen: "23 phút trước", alerts: 0 },
];

export const auditLogs = [
  { actor: "HR Admin", action: "Duyệt bổ sung công cho Trần Minh K", time: "10:42", target: "NV-0312" },
  { actor: "System", action: "Ghi nhận cảnh báo spoofing tại Cổng B", time: "09:17", target: "CAM-B02" },
  { actor: "HR Admin", action: "Cập nhật quy tắc đi muộn ca Hành chính", time: "08:30", target: "Ca làm" },
];
