export type IppmsWorkType = 'DAILY_RATE' | 'PIECE_RATE' | 'LEAVE' | 'HOLIDAY' | 'ABSENT' | 'OFF';

export type IppmsAttendanceStatus =
  | 'PRESENT'
  | 'ABSENT'
  | 'OFF'
  | 'LEAVE'
  | 'UNPAID_LEAVE'
  | 'SICK'
  | 'PUBLIC_HOLIDAY';

export type IppmsRecordedSource = 'PROJECT_ADMIN' | 'EMPLOYEE_SELF' | 'UPLOAD' | 'SYSTEM_AUTO';
export type IppmsPieceRecordedSource = 'PROJECT_ADMIN' | 'UPLOAD' | 'SYSTEM_AUTO';
export type IppmsLeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface IppmsWorkDay {
  id: string;
  employee_id: string;
  project_id: string;
  work_date: string;
  work_type: IppmsWorkType;
  attendance_id?: string | null;
  piece_entry_id?: string | null;
  payrun_id?: string | null;
  is_locked: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface IppmsAttendanceRecord {
  id: string;
  employee_id: string;
  project_id: string;
  attendance_date: string;
  status: IppmsAttendanceStatus;
  shift_id?: string | null;
  hours_worked?: number | null;
  overtime_hours?: number | null;
  remarks?: string | null;
  daily_rate_snapshot?: number | null;
  recorded_by?: string | null;
  recorded_source?: IppmsRecordedSource;
  payrun_id?: string | null;
  is_locked: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface IppmsPieceWorkCatalogue {
  id: string;
  name: string;
  code: string;
  unit_name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface IppmsPieceWorkRate {
  id: string;
  employee_id: string;
  project_id: string;
  piece_id: string;
  rate: number;
  start_date: string;
  end_date?: string | null;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface IppmsPieceWorkEntry {
  id: string;
  employee_id: string;
  project_id: string;
  work_date: string;
  piece_id: string;
  quantity: number;
  rate_snapshot?: number | null;
  recorded_by?: string | null;
  recorded_source?: IppmsPieceRecordedSource;
  payrun_id?: string | null;
  is_locked: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface IppmsLeaveType {
  id: string;
  name: string;
  code: string;
  paid: boolean;
  requires_approval: boolean;
  max_days_per_year?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface IppmsLeaveRequest {
  id: string;
  employee_id: string;
  project_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  reason?: string | null;
  status: IppmsLeaveStatus;
  approved_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface IppmsHoliday {
  id: string;
  name: string;
  holiday_date: string;
  country?: string | null;
  project_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface IppmsShift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  is_default: boolean;
  project_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface IppmsEmployeeShift {
  id: string;
  employee_id: string;
  project_id: string;
  shift_id: string;
  start_date: string;
  end_date?: string | null;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

// RPC payloads
export interface IppmsAttendanceUpsertInput {
  employee_id: string;
  attendance_date: string;
  status: IppmsAttendanceStatus;
  shift_id?: string | null;
  hours_worked?: number | null;
  overtime_hours?: number | null;
  remarks?: string | null;
  daily_rate_snapshot?: number | null;
  recorded_source?: IppmsRecordedSource;
}

export interface IppmsPieceEntryInput {
  employee_id: string;
  work_date: string;
  piece_id: string;
  quantity: number;
  rate_snapshot?: number | null;
  recorded_source?: IppmsPieceRecordedSource;
}

export interface IppmsLeaveApplyInput {
  employee_id: string;
  project_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  reason?: string | null;
}

export interface IppmsHolidayApplyInput {
  project_id: string;
  holiday_date: string;
  name: string;
  country?: string | null;
}

export interface IppmsWorkDayRow extends IppmsWorkDay {
  attendance_status?: IppmsAttendanceStatus | null;
  piece_id?: string | null;
  quantity?: number | null;
  rate_snapshot?: number | null;
}

export type IppmsPayableAttendanceStatus = 'PRESENT' | 'PUBLIC_HOLIDAY' | 'LEAVE' | 'UNPAID_LEAVE';

export interface IppmsDailyPayrunRow {
  employee_id: string;
  work_date: string;
  status: IppmsAttendanceStatus;
  daily_rate_snapshot?: number | null;
  work_day_id: string;
  attendance_id: string;
}

export interface IppmsPiecePayrunRow {
  employee_id: string;
  work_date: string;
  piece_id: string;
  quantity: number;
  rate_snapshot?: number | null;
  piece_entry_id: string;
  work_day_id: string;
}



