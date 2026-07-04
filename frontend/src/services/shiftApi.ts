import type { Shift, ShiftAssignInput, ShiftCreateInput } from "../types/shift";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export async function getShifts(): Promise<{ shifts: Shift[] }> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/shifts`);
  } catch (caught) {
    throw new Error("Không kết nối được backend. Vui lòng kiểm tra server API.");
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail ?? "Không lấy được danh sách ca làm.");
  }

  return data as { shifts: Shift[] };
}

export async function createShift(payload: ShiftCreateInput): Promise<{ shift: Shift }> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/shifts`, {
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
  } catch (caught) {
    throw new Error("Không kết nối được backend. Vui lòng kiểm tra server API.");
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail ?? "Không tạo được ca làm.");
  }

  return data as { shift: Shift };
}

export async function updateShift(shiftId: string, payload: Partial<ShiftCreateInput>): Promise<{ shift: Shift }> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/shifts/${shiftId}`, {
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
      },
      method: "PATCH",
    });
  } catch (caught) {
    throw new Error("Không kết nối được backend. Vui lòng kiểm tra server API.");
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail ?? "Không cập nhật được ca làm.");
  }

  return data as { shift: Shift };
}

export async function deleteShift(shiftId: string): Promise<{ success: boolean; deleted_id: string }> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/shifts/${shiftId}`, {
      method: "DELETE",
    });
  } catch (caught) {
    throw new Error("Không kết nối được backend. Vui lòng kiểm tra server API.");
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail ?? "Không xóa được ca làm.");
  }

  return data as { success: boolean; deleted_id: string };
}

export async function assignShift(payload: ShiftAssignInput): Promise<{ assignment: any }> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/shifts/assign`, {
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
  } catch (caught) {
    throw new Error("Không kết nối được backend. Vui lòng kiểm tra server API.");
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail ?? "Không gán được ca làm.");
  }

  return data as { assignment: any };
}

export async function deleteAssignment(assignId: string): Promise<{ success: boolean; deleted_id: string }> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/shifts/assign/${assignId}`, {
      method: "DELETE",
    });
  } catch (caught) {
    throw new Error("Không kết nối được backend. Vui lòng kiểm tra server API.");
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail ?? "Không xóa được phân ca.");
  }

  return data as { success: boolean; deleted_id: string };
}
