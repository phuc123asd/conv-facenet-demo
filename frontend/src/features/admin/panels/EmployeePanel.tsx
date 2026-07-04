import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  CalendarRange,
} from "lucide-react";

import { StatusBadge } from "../../../components/ui/StatusBadge";
import { TimelineItem } from "../../../components/ui/TimelineItem";
import { createEmployee, getEmployees, registerFaceProfile, updateEmployee } from "../../../services/employeeApi";
import { getShifts, assignShift, deleteAssignment } from "../../../services/shiftApi";
import type { Employee } from "../../../types/employee";
import type { Shift } from "../../../types/shift";

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
const ENROLLMENT_STEPS = [
  "Nhin thang vao camera",
  "Quay dau sang trai nhe",
  "Quay dau sang phai nhe",
  "Chop mat mot lan",
  "Nguoc hoac cui nhe",
];
const ENROLLMENT_STEP_MS = 1600;
const ENROLLMENT_FRAME_WIDTH = 640;
const ENROLLMENT_FRAME_QUALITY = 0.78;

type EnrollmentFrame = {
  file: File;
  objectUrl: string;
  step: string;
};

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

// ─── Avatar helpers ────────────────────────────────────────────────────────────

function FaceProfileAvatar({
  alt,
  className,
  fallbackSize,
  imageClassName,
  imageUrl,
}: {
  alt: string;
  className: string;
  fallbackSize: number;
  imageClassName: string;
  imageUrl: string | null;
}) {
  const [isBroken, setIsBroken] = useState(false);
  const normalizedImageUrl = imageUrl?.trim() || null;

  useEffect(() => {
    setIsBroken(false);
  }, [normalizedImageUrl]);

  return (
    <div className={className}>
      {normalizedImageUrl && !isBroken ? (
        <img
          src={normalizedImageUrl}
          alt={alt}
          className={imageClassName}
          onError={() => setIsBroken(true)}
        />
      ) : (
        <UserRound size={fallbackSize} />
      )}
    </div>
  );
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
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [selectedFaceImage, setSelectedFaceImage] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [registrationMessage, setRegistrationMessage] = useState<string | null>(null);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [isRegisteringFace, setIsRegisteringFace] = useState(false);
  const [isEnrollmentCameraActive, setIsEnrollmentCameraActive] = useState(false);
  const [isEnrollmentCapturing, setIsEnrollmentCapturing] = useState(false);
  const [enrollmentStepIndex, setEnrollmentStepIndex] = useState(0);
  const [enrollmentFrames, setEnrollmentFrames] = useState<EnrollmentFrame[]>([]);

  const enrollmentVideoRef = useRef<HTMLVideoElement | null>(null);
  const enrollmentCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const enrollmentStreamRef = useRef<MediaStream | null>(null);
  const enrollmentTimeoutsRef = useRef<number[]>([]);

  // Shift assignment states
  const [allShifts, setAllShifts] = useState<Shift[]>([]);
  const [assignShiftId, setAssignShiftId] = useState("");
  const [assignFromDate, setAssignFromDate] = useState(() => new Date().toLocaleDateString("sv-SE"));
  const [assignToDate, setAssignToDate] = useState("");
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  const clearEnrollmentTimeouts = useCallback(() => {
    enrollmentTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    enrollmentTimeoutsRef.current = [];
  }, []);

  const revokeEnrollmentFrames = useCallback((frames: EnrollmentFrame[]) => {
    frames.forEach((frame) => URL.revokeObjectURL(frame.objectUrl));
  }, []);

  const stopEnrollmentCamera = useCallback(() => {
    clearEnrollmentTimeouts();
    enrollmentStreamRef.current?.getTracks().forEach((track) => track.stop());
    enrollmentStreamRef.current = null;
    if (enrollmentVideoRef.current) {
      enrollmentVideoRef.current.srcObject = null;
    }
    setIsEnrollmentCameraActive(false);
    setIsEnrollmentCapturing(false);
  }, [clearEnrollmentTimeouts]);

  const startEnrollmentCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setRegistrationError("Trinh duyet khong ho tro camera.");
      return false;
    }

    setRegistrationError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      enrollmentStreamRef.current = stream;
      if (enrollmentVideoRef.current) {
        enrollmentVideoRef.current.srcObject = stream;
        await enrollmentVideoRef.current.play();
      }
      setIsEnrollmentCameraActive(true);
      return true;
    } catch (caught) {
      setRegistrationError(caught instanceof Error ? caught.message : "Khong mo duoc camera.");
      return false;
    }
  }, []);

  const captureEnrollmentFrame = useCallback(
    (step: string, index: number) =>
      new Promise<EnrollmentFrame | null>((resolve) => {
        const video = enrollmentVideoRef.current;
        const canvas = enrollmentCanvasRef.current;
        if (!video || !canvas || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
          resolve(null);
          return;
        }

        const sourceWidth = video.videoWidth || 640;
        const sourceHeight = video.videoHeight || 480;
        const scale = Math.min(1, ENROLLMENT_FRAME_WIDTH / sourceWidth);
        canvas.width = Math.round(sourceWidth * scale);
        canvas.height = Math.round(sourceHeight * scale);

        const context = canvas.getContext("2d");
        if (!context) {
          resolve(null);
          return;
        }

        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(null);
            return;
          }
          const file = new File([blob], `enrollment-${index + 1}.jpg`, { type: "image/jpeg" });
          resolve({
            file,
            objectUrl: URL.createObjectURL(blob),
            step,
          });
        }, "image/jpeg", ENROLLMENT_FRAME_QUALITY);
      }),
    [],
  );

  useEffect(() => {
    getShifts()
      .then((data) => setAllShifts(data.shifts))
      .catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      stopEnrollmentCamera();
      setEnrollmentFrames((current) => {
        revokeEnrollmentFrames(current);
        return [];
      });
      setLocalPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
    };
  }, [revokeEnrollmentFrames, stopEnrollmentCamera]);

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
  const rawFaceImageUrl = selectedEmployee?.face_image_url ?? null;
  const profileFaceImageUrl = rawFaceImageUrl && rawFaceImageUrl.trim() !== "" ? rawFaceImageUrl : null;
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

  const handleAssignShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    if (!assignShiftId) {
      setAssignError("Vui lòng chọn ca làm việc.");
      return;
    }
    if (!assignFromDate) {
      setAssignError("Vui lòng chọn ngày hiệu lực.");
      return;
    }

    setIsAssigning(true);
    setAssignError(null);
    setAssignSuccess(null);

    try {
      await assignShift({
        employee_id: selectedEmployee.id,
        shift_id: assignShiftId,
        effective_from: assignFromDate,
        effective_to: assignToDate || null,
      });
      setAssignSuccess("Phân ca làm việc thành công!");
      const data = await getEmployees();
      setEmployees(data.employees);
      setAssignShiftId("");
      setAssignToDate("");
    } catch (caught: unknown) {
      setAssignError(caught instanceof Error ? caught.message : "Lỗi khi phân ca làm việc.");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleDeleteAssignment = async (assignId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa lượt phân ca này không?")) return;
    try {
      await deleteAssignment(assignId);
      const data = await getEmployees();
      setEmployees(data.employees);
    } catch (caught: unknown) {
      alert(caught instanceof Error ? caught.message : "Không xóa được phân ca.");
    }
  };

  const todayStr = useMemo(() => new Date().toLocaleDateString("sv-SE"), []);
  const activeShift = useMemo(() => {
    if (!selectedEmployee?.shift_assignments) return null;
    return selectedEmployee.shift_assignments.find((assign) => {
      const from = assign.effective_from;
      const to = assign.effective_to;
      return from <= todayStr && (to === null || to >= todayStr);
    });
  }, [selectedEmployee, todayStr]);

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
    stopEnrollmentCamera();
    setEnrollmentStepIndex(0);
    setEnrollmentFrames((current) => {
      revokeEnrollmentFrames(current);
      return [];
    });
    // revoke any previous local preview
    setLocalPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
  };

  const selectEmployee = (employee: Employee) => {
    setSelectedEmployeeId(employee.id);
    setIsRegistrationOpen(false);
    setSelectedFaceImage(null);
    setSelectedFileName("");
    setRegistrationMessage(null);
    setRegistrationError(null);
    stopEnrollmentCamera();
    setEnrollmentStepIndex(0);
    setEnrollmentFrames((current) => {
      revokeEnrollmentFrames(current);
      return [];
    });
    setLocalPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
  };

  const startEnrollmentCapture = async () => {
    setRegistrationError(null);
    setRegistrationMessage(null);
    setEnrollmentStepIndex(0);
    setEnrollmentFrames((current) => {
      revokeEnrollmentFrames(current);
      return [];
    });

    const cameraReady = isEnrollmentCameraActive || (await startEnrollmentCamera());
    if (!cameraReady) return;

    setIsEnrollmentCapturing(true);

    ENROLLMENT_STEPS.forEach((step, index) => {
      const timeoutId = window.setTimeout(() => {
        setEnrollmentStepIndex(index);
        void captureEnrollmentFrame(step, index).then((frame) => {
          if (!frame) return;
          setEnrollmentFrames((current) => [...current, frame]);
          if (index === ENROLLMENT_STEPS.length - 1) {
            setIsEnrollmentCapturing(false);
            setRegistrationMessage("Da lay mau eKYC. Kiem tra anh va bam hoan tat dang ky.");
            setLocalPreviewUrl((prev) => {
              if (prev) URL.revokeObjectURL(prev);
              return frame.objectUrl;
            });
          }
        });
      }, (index + 1) * ENROLLMENT_STEP_MS);
      enrollmentTimeoutsRef.current.push(timeoutId);
    });
  };

  const submitFaceRegistration = async () => {
    if (!selectedEmployee) return;
    const uploadFiles = registerMode === "video"
      ? enrollmentFrames.map((frame) => frame.file)
      : selectedFaceImage
        ? [selectedFaceImage]
        : [];
    if (registerMode === "image" && !selectedFaceImage) {
      setRegistrationError("Vui lòng chọn một ảnh khuôn mặt.");
      return;
    }

    if (registerMode === "video" && uploadFiles.length < ENROLLMENT_STEPS.length) {
      setRegistrationError("Vui long hoan thanh day du cac buoc eKYC truoc khi luu.");
      return;
    }

    setIsRegisteringFace(true);
    setRegistrationError(null);
    setRegistrationMessage(null);

    try {
      let newImageUrl: string | null = null;

      for (const file of uploadFiles) {
        const result = await registerFaceProfile(selectedEmployee.id, file);
        newImageUrl = result.face_profile?.image_path ?? newImageUrl;
      }
      setEmployees((current) =>
        current.map((employee) =>
          employee.id === selectedEmployee.id ? { ...employee, face: "Đã đăng ký", face_image_url: newImageUrl } : employee,
        ),
      );
      setRegistrationMessage("Đã lưu ảnh lên Supabase Storage và tạo face profile.");
      setSelectedFaceImage(null);
      setSelectedFileName("");
      setEnrollmentStepIndex(0);
      setEnrollmentFrames((current) => {
        revokeEnrollmentFrames(current);
        return [];
      });
      setLocalPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      if (registerMode === "video") {
        stopEnrollmentCamera();
      }
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
          <FaceProfileAvatar
            alt={profileName}
            className="avatar employee-avatar"
            fallbackSize={64}
            imageClassName="avatar-face-img"
            imageUrl={localPreviewUrl ?? profileFaceImageUrl}
          />
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
                <button
                  className={registerMode === "image" ? "active" : ""}
                  onClick={() => {
                    setRegisterMode("image");
                    stopEnrollmentCamera();
                  }}
                  type="button"
                >
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
                      // Show instant local preview in the avatar card
                      setLocalPreviewUrl((prev) => {
                        if (prev) URL.revokeObjectURL(prev);
                        return file ? URL.createObjectURL(file) : null;
                      });
                    }}
                    type="file"
                  />
                </label>
              ) : (
                <div className={`registration-video ${enrollmentFrames.length >= ENROLLMENT_STEPS.length ? "active" : ""}`}>
                  <video
                    ref={enrollmentVideoRef}
                    className="enrollment-video-preview"
                    autoPlay
                    muted
                    playsInline
                  />
                  <canvas ref={enrollmentCanvasRef} className="enrollment-canvas" aria-hidden="true" />
                  <div className="enrollment-guide">
                    {enrollmentFrames.length >= ENROLLMENT_STEPS.length ? <CheckCircle2 size={34} /> : <PlayCircle size={34} />}
                    <strong>
                      {isEnrollmentCapturing
                        ? ENROLLMENT_STEPS[enrollmentStepIndex]
                        : enrollmentFrames.length >= ENROLLMENT_STEPS.length
                          ? "Da lay du mau eKYC"
                          : "Quay eKYC 5 buoc"}
                    </strong>
                    <span>{`Mau ${enrollmentFrames.length}/${ENROLLMENT_STEPS.length}`}</span>
                  </div>
                  <div className="enrollment-actions">
                    <button
                      className="secondary-action"
                      onClick={isEnrollmentCameraActive ? stopEnrollmentCamera : startEnrollmentCamera}
                      type="button"
                    >
                      <Video size={16} />
                      {isEnrollmentCameraActive ? "Tat camera" : "Bat camera"}
                    </button>
                    <button
                      className="secondary-action"
                      disabled={isEnrollmentCapturing}
                      onClick={startEnrollmentCapture}
                      type="button"
                    >
                      <PlayCircle size={16} />
                      {isEnrollmentCapturing ? "Dang lay mau..." : "Bat dau eKYC"}
                    </button>
                  </div>
                  {enrollmentFrames.length > 0 && (
                    <div className="enrollment-thumbs">
                      {enrollmentFrames.map((frame) => (
                        <figure key={`${frame.step}-${frame.objectUrl}`}>
                          <img src={frame.objectUrl} alt={frame.step} />
                          <figcaption>{frame.step}</figcaption>
                        </figure>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {registrationError && <p className="registration-note error">{registrationError}</p>}
              {registrationMessage && <p className="registration-note success">{registrationMessage}</p>}
              <button
                className="primary-action registration-submit"
                disabled={
                  isRegisteringFace ||
                  (registerMode === "image" && !selectedFaceImage) ||
                  (registerMode === "video" && enrollmentFrames.length < ENROLLMENT_STEPS.length)
                }
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
                <FaceProfileAvatar
                  alt={employee.name}
                  className="avatar mini-avatar"
                  fallbackSize={18}
                  imageClassName="mini-avatar-face-img"
                  imageUrl={employee.face_image_url}
                />
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

      <div className="employee-grid" style={{ marginTop: "24px" }}>
        <article className="card profile-detail">
          <div className="section-title">
            <h3>Phân ca &amp; Lịch làm việc</h3>
            <span>{selectedEmployee?.name}</span>
          </div>

          <div style={{ marginTop: "16px" }}>
            <p className="eyebrow" style={{ marginBottom: "6px" }}>Ca làm hiện tại</p>
            {activeShift ? (
              <div className="face-status good" style={{ display: "inline-flex", margin: "0 0 16px 0" }}>
                <ShieldCheck size={18} />
                <span>{activeShift.shift_name} (Hiệu lực: {activeShift.effective_from} {activeShift.effective_to ? `đến ${activeShift.effective_to}` : "vô thời hạn"})</span>
              </div>
            ) : (
              <div className="face-status pending" style={{ display: "inline-flex", margin: "0 0 16px 0" }}>
                <X size={18} />
                <span>Chưa được phân ca làm việc</span>
              </div>
            )}
          </div>

          {/* Form phân ca mới */}
          <form onSubmit={handleAssignShift} style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "16px" }}>
            <h4 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px", color: "var(--icon-accent)" }}>Phân ca mới</h4>
            <div className="employee-form-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)", gap: "10px", margin: "0 0 12px 0" }}>
              <label style={{ gridColumn: "1 / -1" }}>
                <span>Chọn ca làm</span>
                <select value={assignShiftId} onChange={(e) => setAssignShiftId(e.target.value)}>
                  <option value="">-- Chọn ca làm --</option>
                  {allShifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Từ ngày</span>
                <input type="date" value={assignFromDate} onChange={(e) => setAssignFromDate(e.target.value)} />
              </label>
              <label>
                <span>Đến ngày (tùy chọn)</span>
                <input type="date" value={assignToDate} onChange={(e) => setAssignToDate(e.target.value)} />
              </label>
            </div>
            
            {assignError && <p className="registration-note error">{assignError}</p>}
            {assignSuccess && <p className="registration-note success">{assignSuccess}</p>}

            <button className="primary-action" type="submit" disabled={isAssigning || !selectedEmployee} style={{ width: "100%", justifyContent: "center", marginTop: "8px" }}>
              Xác nhận phân ca
            </button>
          </form>

          {/* Lịch sử phân ca */}
          <div style={{ marginTop: "24px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "16px" }}>
            <h4 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px" }}>Lịch sử phân ca</h4>
            {selectedEmployee?.shift_assignments && selectedEmployee.shift_assignments.length > 0 ? (
              <div className="attendance-table" role="table" aria-label="Bảng lịch sử phân ca" style={{ marginTop: "8px", fontSize: "12px" }}>
                <div className="table-row table-head" role="row" style={{ gridTemplateColumns: "1fr 1.8fr 0.4fr" }}>
                  <span>Tên ca</span>
                  <span>Thời gian hiệu lực</span>
                  <span />
                </div>
                {selectedEmployee.shift_assignments.map((assign) => (
                  <div className="table-row" role="row" key={assign.id} style={{ gridTemplateColumns: "1fr 1.8fr 0.4fr", padding: "8px 12px" }}>
                    <strong>{assign.shift_name}</strong>
                    <span>
                      {assign.effective_from} → {assign.effective_to || "vô hạn"}
                    </span>
                    <button 
                      aria-label="Xóa phân ca" 
                      onClick={() => handleDeleteAssignment(assign.id)}
                      className="icon-soft reject"
                      style={{ background: "transparent", border: "none", cursor: "pointer", padding: "4px" }}
                      type="button"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted" style={{ fontSize: "12px", fontStyle: "italic" }}>Chưa có lịch sử phân ca.</p>
            )}
          </div>
        </article>

        <article className="card profile-detail">
          <div className="section-title">
            <h3>Lịch sử chi tiết</h3>
            <span>Tháng {new Date().getMonth() + 1}</span>
          </div>
          <div className="profile-stats">
            <div>
              <strong>{selectedEmployee?.stats?.late_count ?? 0}</strong>
              <span>Ngày đi muộn</span>
            </div>
            <div>
              <strong>{selectedEmployee?.stats?.early_count ?? 0}</strong>
              <span>Về sớm</span>
            </div>
            <div>
              <strong>{selectedEmployee?.stats?.liveness_pass_pct ?? 100}%</strong>
              <span>Liveness pass</span>
            </div>
            <div>
              <strong>{selectedEmployee?.stats?.face_id_updates ?? 0}</strong>
              <span>Lần cập nhật Face ID</span>
            </div>
          </div>
          <div className="timeline">
            {!selectedEmployee?.attendance_records || selectedEmployee.attendance_records.length === 0 ? (
              <p className="muted" style={{ padding: "8px", fontStyle: "italic", fontSize: "12px" }}>
                Chưa có dữ liệu chấm công.
              </p>
            ) : (
              selectedEmployee.attendance_records.slice(0, 5).map((r) => {
                // Format date (e.g. "03/07")
                let displayTitle = r.attendance_date;
                try {
                  const [year, month, day] = r.attendance_date.split("-");
                  displayTitle = `${day}/${month}`;
                } catch {}

                let detail = "";
                if (r.check_in_at) {
                  detail += `Check-in: ${new Date(r.check_in_at).toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`;
                }
                if (r.check_out_at) {
                  if (detail) detail += " · ";
                  detail += `Check-out: ${new Date(r.check_out_at).toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`;
                }
                
                let statusText = "Hợp lệ";
                if (r.status === "late") statusText = "Đi muộn";
                else if (r.status === "early") statusText = "Về sớm";
                
                if (detail) {
                  detail += ` · ${statusText}`;
                } else {
                  detail = statusText;
                }

                return <TimelineItem key={r.id} title={displayTitle} detail={detail} />;
              })
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
