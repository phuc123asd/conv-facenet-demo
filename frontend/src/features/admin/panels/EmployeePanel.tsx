import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Edit3,
  Fingerprint,
  Image,
  PlayCircle,
  ShieldCheck,
  Upload,
  UserPlus,
  UserRound,
  Video,
  X,
} from "lucide-react";

import { StatusBadge } from "../../../components/ui/StatusBadge";
import { TimelineItem } from "../../../components/ui/TimelineItem";
import { createEmployee, getEmployees, registerFaceProfile, updateEmployee } from "../../../services/employeeApi";
import type { Employee } from "../../../types/employee";

type EmployeeFormState = {
  code: string;
  department: string;
  name: string;
  roleTitle: "employee" | "admin";
  status: "active" | "probation" | "inactive";
};

const DEPARTMENT_OPTIONS = [
  "Vận hành",
  "Quản trị hệ thống",
  "Nhân sự",
  "Kinh doanh",
  "Kỹ thuật",
  "Tài chính",
];

const ROLE_TITLE_OPTIONS: Array<EmployeeFormState["roleTitle"]> = ["employee", "admin"];

function generateEmployeeCode(existingEmployees: Employee[] = []) {
  const currentNumbers = existingEmployees
    .map((employee) => employee.code.match(/^NV-(\d{4})$/)?.[1])
    .filter((value): value is string => Boolean(value))
    .map((value) => Number(value));
  const nextNumber = Math.max(0, ...currentNumbers) + 1;

  return `NV-${String(nextNumber).padStart(4, "0")}`;
}

function createEmptyEmployeeForm(existingEmployees: Employee[] = []): EmployeeFormState {
  return {
    code: generateEmployeeCode(existingEmployees),
    department: DEPARTMENT_OPTIONS[0],
    name: "",
    roleTitle: ROLE_TITLE_OPTIONS[0],
    status: "active",
  };
}

function createEmployeeFormFromRecord(employee: Employee): EmployeeFormState {
  return {
    code: employee.code,
    department: employee.department,
    name: employee.name,
    roleTitle: employee.role_title,
    status: employee.status,
  };
}

export function EmployeePanel() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [employeeForm, setEmployeeForm] = useState<EmployeeFormState>(() => createEmptyEmployeeForm());
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreatingEmployee, setIsCreatingEmployee] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [registerMode, setRegisterMode] = useState<"image" | "video">("image");
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [selectedFaceImage, setSelectedFaceImage] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [registrationMessage, setRegistrationMessage] = useState<string | null>(null);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [isRegisteringFace, setIsRegisteringFace] = useState(false);
  const [videoDemoStarted, setVideoDemoStarted] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getEmployees()
      .then((data) => {
        if (!isMounted) return;
        setEmployees(data.employees);
        setEmployeeForm(createEmptyEmployeeForm(data.employees));
        setSelectedEmployeeId((current) => current ?? data.employees[0]?.id ?? null);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (!isMounted) return;
        setError(caught instanceof Error ? caught.message : "Không lấy được danh sách nhân viên.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === selectedEmployeeId) ?? employees[0],
    [employees, selectedEmployeeId],
  );
  const profileName = selectedEmployee?.name ?? "Chưa có nhân viên";
  const profileCode = selectedEmployee?.code ?? "N/A";
  const profileDepartment = selectedEmployee?.department ?? "Chưa cập nhật";
  const profileFaceStatus = selectedEmployee?.face ?? "Chưa đăng ký";
  const profileFaceImageUrl = selectedEmployee?.face_image_url ?? null;
  const isEditingEmployee = editingEmployeeId !== null;

  const updateEmployeeForm = (field: keyof EmployeeFormState, value: string) => {
    setEmployeeForm((current) => ({ ...current, [field]: value }));
    setCreateError(null);
    setCreateMessage(null);
  };

  const closeCreateForm = () => {
    setIsCreateFormOpen(false);
    setEditingEmployeeId(null);
    setEmployeeForm(createEmptyEmployeeForm(employees));
    setCreateError(null);
  };

  const openCreateForm = () => {
    setIsCreateFormOpen(true);
    setEditingEmployeeId(null);
    setEmployeeForm(createEmptyEmployeeForm(employees));
    setCreateError(null);
    setCreateMessage(null);
  };

  const openEditForm = (employee: Employee) => {
    setSelectedEmployeeId(employee.id);
    setIsRegistrationOpen(false);
    setIsCreateFormOpen(true);
    setEditingEmployeeId(employee.id);
    setEmployeeForm(createEmployeeFormFromRecord(employee));
    setCreateError(null);
    setCreateMessage(null);
  };

  const submitEmployeeForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!employeeForm.name.trim()) {
      setCreateError("Vui lòng nhập họ tên nhân viên.");
      return;
    }

    setIsCreatingEmployee(true);
    setCreateError(null);
    setCreateMessage(null);

    try {
      if (editingEmployeeId) {
        const response = await updateEmployee(editingEmployeeId, {
          department: employeeForm.department,
          employment_status: employeeForm.status,
          full_name: employeeForm.name.trim(),
          role_title: employeeForm.roleTitle,
        });
        const nextEmployees = employees
          .map((employee) => (employee.id === response.employee.id ? response.employee : employee))
          .sort((first, second) => first.code.localeCompare(second.code));
        setEmployees(nextEmployees);
        setSelectedEmployeeId(response.employee.id);
        setEmployeeForm(createEmptyEmployeeForm(nextEmployees));
        setEditingEmployeeId(null);
        setIsCreateFormOpen(false);
        setCreateMessage(`Đã cập nhật ${response.employee.name}.`);
      } else {
        const response = await createEmployee({
          department: employeeForm.department,
          employment_status: employeeForm.status,
          full_name: employeeForm.name.trim(),
          role_title: employeeForm.roleTitle,
        });

        const nextEmployees = [...employees, response.employee].sort((first, second) => first.code.localeCompare(second.code));
        setEmployees(nextEmployees);
        setSelectedEmployeeId(response.employee.id);
        setIsRegistrationOpen(false);
        setEmployeeForm(createEmptyEmployeeForm(nextEmployees));
        setIsCreateFormOpen(false);
        setCreateMessage(`Đã thêm ${response.employee.name} với mã ${response.employee.code}.`);
      }
    } catch (caught) {
      setCreateError(caught instanceof Error ? caught.message : "Không lưu được nhân viên.");
    } finally {
      setIsCreatingEmployee(false);
    }
  };

  const openRegistration = (employee: Employee | undefined = selectedEmployee) => {
    if (!employee) return;
    setSelectedEmployeeId(employee.id);
    setIsRegistrationOpen(true);
    setRegisterMode("image");
    setSelectedFaceImage(null);
    setSelectedFileName("");
    setRegistrationMessage(null);
    setRegistrationError(null);
    setVideoDemoStarted(false);
  };

  const selectEmployee = (employee: Employee) => {
    setSelectedEmployeeId(employee.id);
    setIsRegistrationOpen(false);
    setSelectedFaceImage(null);
    setSelectedFileName("");
    setRegistrationMessage(null);
    setRegistrationError(null);
    setVideoDemoStarted(false);
  };

  const submitFaceRegistration = async () => {
    if (!selectedEmployee) return;
    if (registerMode !== "image") {
      setRegistrationError("Đăng ký bằng video sẽ làm ở bước sau. Vui lòng chọn ảnh trước.");
      return;
    }
    if (!selectedFaceImage) {
      setRegistrationError("Vui lòng chọn một ảnh khuôn mặt.");
      return;
    }

    setIsRegisteringFace(true);
    setRegistrationError(null);
    setRegistrationMessage(null);

    try {
      const result = await registerFaceProfile(selectedEmployee.id, selectedFaceImage);
      const newImageUrl = result.face_profile?.image_path ?? null;
      setEmployees((current) =>
        current.map((employee) =>
          employee.id === selectedEmployee.id ? { ...employee, face: "Đã đăng ký", face_image_url: newImageUrl } : employee,
        ),
      );
      setRegistrationMessage("Đã lưu ảnh lên Supabase Storage và tạo face profile.");
      setSelectedFaceImage(null);
      setSelectedFileName("");
      setIsRegistrationOpen(false);
    } catch (caught) {
      setRegistrationError(caught instanceof Error ? caught.message : "Không đăng ký được khuôn mặt.");
    } finally {
      setIsRegisteringFace(false);
    }
  };

  return (
    <div className="admin-stack">
      <div className="action-strip">
        <button
          className="primary-action"
          onClick={() => {
            if (isCreateFormOpen && !isEditingEmployee) {
              closeCreateForm();
            } else {
              openCreateForm();
            }
          }}
          type="button"
        >
          {isCreateFormOpen ? <X size={18} /> : <UserPlus size={18} />}
          {isCreateFormOpen && !isEditingEmployee ? "Đóng form" : "Thêm nhân viên"}
        </button>
      </div>

      {isCreateFormOpen && (
        <form className="card employee-create-form" onSubmit={submitEmployeeForm}>
          <div className="section-title">
            <h3>{isEditingEmployee ? "Sửa nhân viên" : "Thêm nhân viên"}</h3>
          </div>
          <div className="employee-form-grid">
            <label>
              <span>Mã nhân viên</span>
              <input
                readOnly
                aria-readonly="true"
                title="Mã dự kiến. Backend sẽ cấp mã cuối cùng khi lưu để tránh trùng."
                type="text"
                value={employeeForm.code}
              />
            </label>
            <label>
              <span>Họ tên</span>
              <input
                autoFocus
                onChange={(event) => updateEmployeeForm("name", event.target.value)}
                placeholder="Nguyễn Văn A"
                type="text"
                value={employeeForm.name}
              />
            </label>
            <label>
              <span>Bộ phận</span>
              <select
                onChange={(event) => updateEmployeeForm("department", event.target.value)}
                value={employeeForm.department}
              >
                {DEPARTMENT_OPTIONS.map((department) => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Vai trò</span>
              <select
                onChange={(event) => updateEmployeeForm("roleTitle", event.target.value as EmployeeFormState["roleTitle"])}
                value={employeeForm.roleTitle}
              >
                {ROLE_TITLE_OPTIONS.map((roleTitle) => (
                  <option key={roleTitle} value={roleTitle}>{roleTitle}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Trạng thái</span>
              <select
                onChange={(event) => updateEmployeeForm("status", event.target.value as EmployeeFormState["status"])}
                value={employeeForm.status}
              >
                <option value="active">Đang làm</option>
                <option value="probation">Thử việc</option>
                <option value="inactive">Tạm nghỉ</option>
              </select>
            </label>
          </div>
          {createError && <p className="registration-note error">{createError}</p>}
          {createMessage && <p className="registration-note success">{createMessage}</p>}
          <div className="employee-form-actions">
            <button className="secondary-action" onClick={closeCreateForm} type="button">
              Hủy
            </button>
            <button className="primary-action" disabled={isCreatingEmployee} type="submit">
              {isCreatingEmployee ? "Đang lưu..." : isEditingEmployee ? "Cập nhật nhân viên" : "Lưu nhân viên"}
            </button>
          </div>
        </form>
      )}

      {!isCreateFormOpen && createMessage && <p className="employee-create-toast">{createMessage}</p>}

      <div className="employee-grid">
        <article className="id-card">
          <Fingerprint className="watermark" size={260} strokeWidth={1} />
          <div className="avatar employee-avatar">
            {profileFaceImageUrl ? (
              <img src={profileFaceImageUrl} alt={profileName} className="avatar-face-img" />
            ) : (
              <UserRound size={58} />
            )}
          </div>
          <p className="eyebrow">Employee ID</p>
          <h3>{profileName}</h3>
          <p>{profileCode} · {profileDepartment}</p>
          <div className={`face-status ${profileFaceStatus === "Đã đăng ký" ? "good" : "pending"}`}>
            <ShieldCheck size={18} />
            {profileFaceStatus === "Đã đăng ký" ? "Face embedding đã đồng bộ" : "Chưa có face embedding"}
          </div>
          {!isRegistrationOpen && (
            <button
              aria-label={profileFaceStatus === "Đã đăng ký" ? "Sửa đăng ký khuôn mặt" : "Đăng ký khuôn mặt"}
              className="face-registration-trigger"
              onClick={() => openRegistration()}
              title={profileFaceStatus === "Đã đăng ký" ? "Sửa đăng ký khuôn mặt" : "Đăng ký khuôn mặt"}
              type="button"
            >
              {profileFaceStatus === "Đã đăng ký" ? <Edit3 size={20} /> : <Fingerprint size={20} />}
            </button>
          )}
          {isRegistrationOpen && (
            <div className="face-registration-form">
              <div className="registration-header">
                <div>
                  <p className="eyebrow">{profileFaceStatus === "Đã đăng ký" ? "Edit Face ID" : "Face registration"}</p>
                  <strong>{profileName}</strong>
                </div>
                <span>{profileCode}</span>
              </div>
              <div className="registration-mode" role="group" aria-label="Chọn kiểu đăng ký khuôn mặt">
                <button className={registerMode === "image" ? "active" : ""} onClick={() => setRegisterMode("image")} type="button">
                  <Image size={16} />
                  Ảnh
                </button>
                <button className={registerMode === "video" ? "active" : ""} onClick={() => setRegisterMode("video")} type="button">
                  <Video size={16} />
                  Video
                </button>
              </div>
              {registerMode === "image" ? (
                <label className="registration-dropzone">
                  <Upload size={22} />
                  <strong>{selectedFileName || "Chọn ảnh khuôn mặt"}</strong>
                  <span>JPG, PNG hoặc WebP</span>
                  <input
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      setSelectedFaceImage(file);
                      setSelectedFileName(file?.name ?? "");
                      setRegistrationMessage(null);
                      setRegistrationError(null);
                    }}
                    type="file"
                  />
                </label>
              ) : (
                <div className={`registration-video ${videoDemoStarted ? "active" : ""}`}>
                  {videoDemoStarted ? <CheckCircle2 size={34} /> : <PlayCircle size={34} />}
                  <strong>{videoDemoStarted ? "Đã ghi nhận video demo" : "Quay video demo"}</strong>
                  <button className="secondary-action" onClick={() => setVideoDemoStarted(true)} type="button">
                    <Video size={16} />
                    {videoDemoStarted ? "Quay lại" : "Bắt đầu quay"}
                  </button>
                </div>
              )}
              {registrationError && <p className="registration-note error">{registrationError}</p>}
              {registrationMessage && <p className="registration-note success">{registrationMessage}</p>}
              <button
                className="primary-action registration-submit"
                disabled={isRegisteringFace || registerMode !== "image" || !selectedFaceImage}
                onClick={submitFaceRegistration}
                type="button"
              >
                {isRegisteringFace ? "Đang lưu..." : profileFaceStatus === "Đã đăng ký" ? "Lưu thay đổi" : "Hoàn tất đăng ký"}
              </button>
            </div>
          )}
        </article>

        <article className="card profile-detail">
          <div className="section-title">
            <h3>Danh sách nhân viên</h3>
            <span>{isLoading ? "Đang tải" : `${employees.length} hồ sơ`}</span>
          </div>
          <div className="employee-list">
            {isLoading && <div className="employee-empty">Đang tải dữ liệu nhân viên...</div>}
            {error && <div className="employee-empty error">{error}</div>}
            {!isLoading && !error && employees.length === 0 && <div className="employee-empty">Chưa có hồ sơ nhân viên.</div>}
            {!isLoading && !error && employees.map((employee) => (
              <div
                key={employee.id}
                className={`employee-row ${selectedEmployee?.id === employee.id ? "selected" : ""}`}
                onClick={() => selectEmployee(employee)}
                tabIndex={0}
              >
                <div className="avatar mini-avatar">
                  <UserRound size={18} />
                </div>
                <div className="employee-identity">
                  <strong>{employee.name}</strong>
                </div>
                <button
                  className="employee-face-action"
                  onClick={(event) => {
                    event.stopPropagation();
                    openRegistration(employee);
                  }}
                  type="button"
                >
                  <StatusBadge status={employee.face === "Đã đăng ký" ? "Hợp lệ" : "Đi muộn"} label={employee.face} />
                </button>
                <button
                  className="icon-soft"
                  aria-label={`Sửa ${employee.name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    openEditForm(employee);
                  }}
                  type="button"
                >
                  <Edit3 size={16} />
                </button>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="card profile-detail">
        <div className="section-title">
          <h3>Lịch sử chi tiết</h3>
          <span>Tháng 6</span>
        </div>
        <div className="profile-stats">
          <div><strong>2</strong><span>Ngày đi muộn</span></div>
          <div><strong>0</strong><span>Về sớm</span></div>
          <div><strong>98%</strong><span>Liveness pass</span></div>
          <div><strong>4</strong><span>Lần cập nhật Face ID</span></div>
        </div>
        <div className="timeline">
          <TimelineItem title="Hôm nay" detail="Check-in 08:01 · Hợp lệ" />
          <TimelineItem title="Thứ 3" detail="Check-out 17:08 · Hợp lệ" />
          <TimelineItem title="Thứ 2" detail="Check-in 07:56 · Hợp lệ" />
        </div>
      </article>
    </div>
  );
}
