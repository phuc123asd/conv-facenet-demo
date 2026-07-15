# Hướng Dẫn Cài Đặt Dự Án (Developer Setup Guide)

Tài liệu này hướng dẫn chi tiết các bước thiết lập và khởi chạy dự án **Hệ Thống Điểm Danh Bằng Khuôn Mặt (Face Attendance System)** sau khi clone từ repository.

*Để xem thông tin chi tiết về cấu trúc thư mục, sơ đồ luồng dữ liệu và thiết kế hệ thống, vui lòng tham khảo tài liệu [ARCHITECTURE.md](file:///Users/cps/Documents/build-web-data-visualization-plugin-build-2/ARCHITECTURE.md).*

---

## 🚀 Các Bước Thiết Lập (Step-by-step Setup)

### Bước 1: Yêu Cầu Hệ Thống (Prerequisites)
Đảm bảo máy tính của bạn đã được cài đặt sẵn:
- **Node.js**: Phiên bản `>= 18.x` trở lên.
- **Python**: Phiên bản `3.10` đến `3.13` (Khuyến nghị dùng `Python 3.10+`).
- **Git** để clone mã nguồn.

---

### Bước 2: Thiết Lập Cơ Sở Dữ Liệu & Storage (Supabase)
Hệ thống sử dụng Supabase làm cơ sở dữ liệu chính và lưu trữ hình ảnh.

1. **Tạo tài khoản và dự án mới:**
   - Truy cập [Supabase](https://supabase.com/) và tạo một project mới.
   - Nhớ lưu lại **Project URL** và **service_role API key** (dùng cho backend).

2. **Khởi tạo Schema cơ sở dữ liệu:**
   - Truy cập vào mục **SQL Editor** trên Supabase Dashboard.
   - Mở file [001_initial_schema.sql](file:///Users/cps/Documents/build-web-data-visualization-plugin-build-2/database/supabase/001_initial_schema.sql), sao chép toàn bộ nội dung và chạy (Run) trên SQL Editor để khởi tạo các bảng, quan hệ khóa ngoại và index.
   - *(Tùy chọn)* Nếu muốn nạp dữ liệu ca làm việc và nhân viên mẫu để test nhanh, hãy chạy tiếp nội dung trong file [002_seed_demo_data.sql](file:///Users/cps/Documents/build-web-data-visualization-plugin-build-2/database/supabase/002_seed_demo_data.sql).

3. **Cấu hình Storage Buckets:**
   - Đi tới mục **Storage** trên Supabase Dashboard.
   - Tạo mới 2 buckets với quyền truy cập công khai (**Public**):
     - `face-images` (Lưu ảnh đăng ký khuôn mặt gốc của nhân viên)
     - `attendance-evidence` (Lưu ảnh minh chứng lúc chụp điểm danh)

---

### Bước 3: Thiết Lập & Khởi Chạy Backend
Backend FastAPI chịu trách nhiệm giao tiếp giữa Frontend, cơ sở dữ liệu Supabase, và chạy mô hình nhận diện khuôn mặt Conv-FaceNet.

1. **Di chuyển vào thư mục backend:**
   ```bash
   cd backend
   ```

2. **Tạo và kích hoạt môi trường ảo Python (Venv):**
   ```bash
   # macOS / Linux
   python -m venv .venv
   source .venv/bin/activate

   # Windows (CMD)
   python -m venv .venv
   .venv\Scripts\activate
   ```

3. **Cài đặt thư viện phụ thuộc:**
   Cài đặt cả các thư viện của backend và module nhận diện khuôn mặt:
   ```bash
   pip install -r requirements.txt
   pip install -r ../face-service/conv-facenet/requirements.txt
   ```

4. **Cấu hình file môi trường (.env):**
   - Tạo file `.env` từ file ví dụ:
     ```bash
     cp .env.example .env
     ```
   - Mở tệp `.env` vừa tạo và cập nhật các thông số tương ứng của dự án Supabase của bạn:
     ```env
     SUPABASE_URL=https://your-project-ref.supabase.co
     SUPABASE_SERVICE_ROLE_KEY=replace-with-your-service-role-key
     SUPABASE_FACE_IMAGES_BUCKET=face-images
     ```

5. **Tải trọng số mô hình (Model Weights):**
   - Bạn **không cần tải thủ công** các tệp mô hình lớn (tránh phình to Git repo).
   - Ở lần chạy đầu tiên (chạy test hoặc khởi động server), module `convfacenet` sẽ tự động phát hiện nếu thiếu trọng số và tải trực tiếp các tệp `face_detector.pt` và `face_descriptor.pt` từ Google Drive về đúng thư mục cục bộ `face-service/conv-facenet/model_weights/final_weights/`.

6. **Khởi chạy Backend API Server:**
   ```bash
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```
   Kiểm tra backend đã hoạt động thành công tại: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health) (kết quả hiển thị `{"status":"ok"}`).

---

### Bước 4: Thiết Lập & Khởi Chạy Frontend
Frontend được viết bằng React, TypeScript và Vite, giao tiếp mặc định tới Backend tại địa chỉ `http://127.0.0.1:8000`.

1. **Di chuyển vào thư mục frontend:**
   ```bash
   cd ../frontend
   ```

2. **Cài đặt các gói Node.js:**
   ```bash
   npm install
   ```

3. **Khởi chạy Vite Development Server:**
   ```bash
   npm run dev
   ```

4. **Trực quan hóa ứng dụng:**
   - Ứng dụng Web sẽ được khởi chạy tại: [http://127.0.0.1:5173/](http://127.0.0.1:5173/)
   - Bạn có thể chuyển đổi linh hoạt giữa giao diện **Kiosk điểm danh** và **Admin Portal** bằng thanh điều hướng góc trên màn hình.

---

## 🔍 Kiểm Tra Hệ Thống Sau Khi Cài Đặt (Verification)
- Truy cập trang Kiosk, bấm **Bật camera** để hệ thống kết nối với webcam của bạn.
- Bấm **Bắt đầu** để trải nghiệm quá trình tự động trích xuất khuôn mặt, so khớp và ghi nhận điểm danh.
- Truy cập mục **Quản lý nhân viên** trong Admin Portal để thêm mới, sửa thông tin nhân viên, hoặc đăng ký khuôn mặt mới (eKYC 5 bước quay camera).
