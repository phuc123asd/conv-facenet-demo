export type Shift = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  late_after_minutes: number;
  early_before_minutes: number;
  created_at: string;
};

export type ShiftCreateInput = {
  name: string;
  start_time: string;
  end_time: string;
  late_after_minutes: number;
  early_before_minutes: number;
};

export type ShiftAssignInput = {
  employee_id: string;
  shift_id: string;
  effective_from: string;
  effective_to?: string | null;
};
