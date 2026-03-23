// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";

export interface TimeLog {
  id?: string;
  organization_id: string;
  employee_id: string;
  project_id?: string | null;
  clock_in_utc: string;
  clock_out_utc?: string | null;
  timezone: string;
  local_clock_in: string;
  local_clock_out?: string | null;
  attendance_mode: string;
  latitude?: number | null;
  longitude?: number | null;
  geofence_id?: string | null;
  device_id?: string | null;
  photo_url?: string | null;
  recorded_source: string;
  recorded_by?: string | null;
  remarks?: string | null;
  is_valid?: boolean;
}

export interface AttendancePolicy {
  id?: string;
  organization_id: string;
  company_id?: string | null;
  grace_period_minutes: number;
  late_threshold_minutes: number;
  half_day_hours: number;
  max_late_per_month?: number | null;
  overtime_enabled: boolean;
  overtime_threshold_hours: number;
  regularization_enabled: boolean;
  regularization_auto_approve: boolean;
  require_geolocation: boolean;
  geofence_radius_meters: number;
  allow_self_checkin: boolean;
  work_start_time: string;
  work_end_time: string;
  default_timezone: string;
}

export interface Geofence {
  id?: string;
  organization_id: string;
  name: string;
  country?: string | null;
  latitude: number;
  longitude: number;
  radius_meters: number;
  type: string;
  is_active: boolean;
}

export interface Shift {
  id?: string;
  organization_id: string;
  name: string;
  start_time: string;
  end_time: string;
  timezone: string;
  grace_period_minutes: number;
  overtime_threshold: number;
  break_minutes: number;
  is_default: boolean;
  is_active: boolean;
}

export interface RegularizationRequest {
  id?: string;
  organization_id: string;
  employee_id: string;
  attendance_date: string;
  requested_clock_in: string;
  requested_clock_out: string;
  reason: string;
  status?: string;
}

export interface ProjectAttendancePolicy {
  id?: string;
  organization_id: string;
  project_id: string;
  attendance_required: boolean;
  allow_self_checkin: boolean;
  require_manager_checkin: boolean;
  require_geolocation: boolean;
  primary_geofence_id?: string | null;
}

export interface AttendanceQrCode {
  id?: string;
  organization_id: string;
  project_id: string;
  geofence_id?: string | null;
  token?: string;
  label?: string | null;
  is_active: boolean;
  expires_at?: string | null;
  created_by?: string | null;
  // joined
  geofences?: { id: string; name: string } | null;
  projects?: { id: string; name: string } | null;
}

// Haversine distance in meters
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export class AttendanceService {
  // ─── TIME LOGS ──────────────────────────────────────
  static async clockIn(data: Omit<TimeLog, 'id' | 'clock_out_utc' | 'local_clock_out'>) {
    const { data: result, error } = await supabase
      .from('attendance_time_logs')
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return result;
  }

  static async clockOut(logId: string, clockOutUtc: string, localClockOut: string) {
    const { data, error } = await supabase
      .from('attendance_time_logs')
      .update({ clock_out_utc: clockOutUtc, local_clock_out: localClockOut })
      .eq('id', logId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async getActiveClockIn(employeeId: string) {
    const { data, error } = await supabase
      .from('attendance_time_logs')
      .select('*')
      .eq('employee_id', employeeId)
      .is('clock_out_utc', null)
      .order('clock_in_utc', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  static async getTimeLogs(orgId: string, filters?: {
    employeeId?: string;
    projectId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    let query = supabase
      .from('attendance_time_logs')
      .select('*, employees(id, first_name, last_name, employee_number), projects(id, name)')
      .eq('organization_id', orgId)
      .order('clock_in_utc', { ascending: false });

    if (filters?.employeeId) query = query.eq('employee_id', filters.employeeId);
    if (filters?.projectId) query = query.eq('project_id', filters.projectId);
    if (filters?.dateFrom) query = query.gte('clock_in_utc', filters.dateFrom);
    if (filters?.dateTo) query = query.lte('clock_in_utc', filters.dateTo);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  // ─── DAILY SUMMARY ─────────────────────────────────
  static async getDailySummary(orgId: string, filters?: {
    employeeId?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
  }) {
    let query = supabase
      .from('attendance_daily_summary')
      .select('*, employees(id, first_name, last_name, employee_number), projects(id, name)')
      .eq('organization_id', orgId)
      .order('attendance_date', { ascending: false });

    if (filters?.employeeId) query = query.eq('employee_id', filters.employeeId);
    if (filters?.dateFrom) query = query.gte('attendance_date', filters.dateFrom);
    if (filters?.dateTo) query = query.lte('attendance_date', filters.dateTo);
    if (filters?.status) query = query.eq('status', filters.status);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  static async getMyDailySummary(employeeId: string, dateFrom?: string, dateTo?: string) {
    let query = supabase
      .from('attendance_daily_summary')
      .select('*')
      .eq('employee_id', employeeId)
      .order('attendance_date', { ascending: false });

    if (dateFrom) query = query.gte('attendance_date', dateFrom);
    if (dateTo) query = query.lte('attendance_date', dateTo);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  // Admin manual marking
  static async markAttendance(records: Array<{
    organization_id: string;
    employee_id: string;
    attendance_date: string;
    status: string;
    project_id?: string;
    remarks?: string;
  }>) {
    const { data, error } = await supabase
      .from('attendance_daily_summary')
      .upsert(
        records.map(r => ({
          ...r,
          first_clock_in: null,
          last_clock_out: null,
          total_hours: 0,
          overtime_hours: 0,
          is_late: false,
          late_minutes: 0,
        })),
        { onConflict: 'employee_id,attendance_date' }
      )
      .select();
    if (error) throw error;
    return data;
  }

  // ─── POLICIES ───────────────────────────────────────
  static async getPolicy(orgId: string) {
    const { data, error } = await supabase
      .from('attendance_policies')
      .select('*')
      .eq('organization_id', orgId)
      .order('company_id', { ascending: true, nullsFirst: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  static async upsertPolicy(policy: AttendancePolicy) {
    const { data, error } = await supabase
      .from('attendance_policies')
      .upsert(policy, { onConflict: 'organization_id,company_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // ─── GEOFENCES ──────────────────────────────────────
  static async getGeofences(orgId: string) {
    const { data, error } = await supabase
      .from('geofences')
      .select('*')
      .eq('organization_id', orgId)
      .order('name');
    if (error) throw error;
    return data;
  }

  static async createGeofence(geofence: Omit<Geofence, 'id'>) {
    const { data, error } = await supabase
      .from('geofences')
      .insert(geofence)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async updateGeofence(id: string, updates: Partial<Geofence>) {
    const { data, error } = await supabase
      .from('geofences')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async deleteGeofence(id: string) {
    const { error } = await supabase.from('geofences').delete().eq('id', id);
    if (error) throw error;
  }

  // ─── SHIFTS ─────────────────────────────────────────
  static async getShifts(orgId: string) {
    const { data, error } = await supabase
      .from('attendance_shifts')
      .select('*')
      .eq('organization_id', orgId)
      .order('name');
    if (error) throw error;
    return data;
  }

  static async createShift(shift: Omit<Shift, 'id'>) {
    const { data, error } = await supabase
      .from('attendance_shifts')
      .insert(shift)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async updateShift(id: string, updates: Partial<Shift>) {
    const { data, error } = await supabase
      .from('attendance_shifts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async deleteShift(id: string) {
    const { error } = await supabase.from('attendance_shifts').delete().eq('id', id);
    if (error) throw error;
  }

  // ─── REGULARIZATION ─────────────────────────────────
  static async getRegularizationRequests(orgId: string, status?: string) {
    let query = supabase
      .from('attendance_regularization_requests')
      .select('*, employees(id, first_name, last_name, employee_number)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  static async createRegularizationRequest(request: RegularizationRequest) {
    const { data, error } = await supabase
      .from('attendance_regularization_requests')
      .insert(request)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async approveRegularization(id: string, approvedBy: string, notes?: string) {
    const { data, error } = await supabase
      .from('attendance_regularization_requests')
      .update({
        status: 'APPROVED',
        approved_by: approvedBy,
        approval_date: new Date().toISOString(),
        approval_notes: notes,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async rejectRegularization(id: string, approvedBy: string, notes?: string) {
    const { data, error } = await supabase
      .from('attendance_regularization_requests')
      .update({
        status: 'REJECTED',
        approved_by: approvedBy,
        approval_date: new Date().toISOString(),
        approval_notes: notes,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // ─── GEOFENCE VALIDATION ───────────────────────────
  static async validateGeofence(
    employeeId: string,
    latitude: number,
    longitude: number,
    orgId: string
  ): Promise<{ valid: boolean; geofence?: any; distance?: number }> {
    // Get employee's assigned geofences
    const { data: assignments, error: aErr } = await supabase
      .from('employee_geofences')
      .select('*, geofences(*)')
      .eq('employee_id', employeeId)
      .eq('allowed', true);

    if (aErr) throw aErr;

    // If no assignments, get all org geofences
    let geofences: any[] = [];
    if (!assignments || assignments.length === 0) {
      const { data: orgGeo, error: oErr } = await supabase
        .from('geofences')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_active', true);
      if (oErr) throw oErr;
      geofences = orgGeo || [];
    } else {
      geofences = assignments.map((a: any) => a.geofences).filter(Boolean);
    }

    // Check if inside any geofence
    for (const geo of geofences) {
      const dist = haversineDistance(latitude, longitude, geo.latitude, geo.longitude);
      if (dist <= geo.radius_meters) {
        return { valid: true, geofence: geo, distance: Math.round(dist) };
      }
    }

    // Return closest geofence distance for error message
    if (geofences.length > 0) {
      const closest = geofences.reduce((min: any, geo: any) => {
        const dist = haversineDistance(latitude, longitude, geo.latitude, geo.longitude);
        return dist < min.dist ? { geo, dist } : min;
      }, { geo: null, dist: Infinity });
      return { valid: false, distance: Math.round(closest.dist) };
    }

    return { valid: true }; // No geofences configured = allow
  }

  // ─── PROJECT GEOFENCES ─────────────────────────────
  static async getProjectGeofences(projectId: string): Promise<Geofence[]> {
    const { data, error } = await supabase
      .from('project_geofences')
      .select('geofences(*)')
      .eq('project_id', projectId);
    if (error) throw error;
    return (data || []).map((r: any) => r.geofences).filter(Boolean);
  }

  static async setProjectGeofences(orgId: string, projectId: string, geofenceIds: string[]): Promise<void> {
    const { error: delErr } = await supabase
      .from('project_geofences')
      .delete()
      .eq('project_id', projectId);
    if (delErr) throw delErr;
    if (geofenceIds.length === 0) return;
    const rows = geofenceIds.map(gid => ({
      organization_id: orgId,
      project_id: projectId,
      geofence_id: gid,
    }));
    const { error: insErr } = await supabase.from('project_geofences').insert(rows);
    if (insErr) throw insErr;
  }

  static async validateAgainstProjectGeofences(
    projectId: string,
    latitude: number,
    longitude: number
  ): Promise<{ valid: boolean; geofence?: Geofence; distance?: number }> {
    const geofences = await AttendanceService.getProjectGeofences(projectId);
    if (geofences.length === 0) return { valid: true }; // No geofences = allow
    for (const geo of geofences) {
      const dist = haversineDistance(latitude, longitude, geo.latitude, geo.longitude);
      if (dist <= geo.radius_meters) {
        return { valid: true, geofence: geo, distance: Math.round(dist) };
      }
    }
    const closest = geofences.reduce((min: any, geo: any) => {
      const dist = haversineDistance(latitude, longitude, geo.latitude, geo.longitude);
      return dist < min.dist ? { geo, dist } : min;
    }, { geo: null, dist: Infinity });
    return { valid: false, distance: Math.round(closest.dist) };
  }

  // ─── PROJECT ATTENDANCE POLICY ─────────────────────
  static async getProjectPolicy(projectId: string): Promise<ProjectAttendancePolicy | null> {
    const { data, error } = await supabase
      .from('project_attendance_policy')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  static async upsertProjectPolicy(policy: ProjectAttendancePolicy): Promise<ProjectAttendancePolicy> {
    const { data, error } = await supabase
      .from('project_attendance_policy')
      .upsert(policy, { onConflict: 'project_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // ─── MANAGER CLOCK-IN / CLOCK-OUT ──────────────────
  static async managerClockIn(opts: {
    organizationId: string;
    employeeId: string;
    projectId: string;
    managerId: string;
    latitude?: number | null;
    longitude?: number | null;
    geofenceId?: string | null;
    remarks?: string | null;
  }): Promise<TimeLog> {
    const now = new Date();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const localNow = now.toLocaleString('sv-SE', { timeZone: timezone }).replace(' ', 'T');
    return AttendanceService.clockIn({
      organization_id: opts.organizationId,
      employee_id: opts.employeeId,
      project_id: opts.projectId,
      clock_in_utc: now.toISOString(),
      timezone,
      local_clock_in: localNow,
      attendance_mode: 'SUPERVISOR',
      recorded_source: 'MANAGER_CHECKIN',
      recorded_by: opts.managerId,
      latitude: opts.latitude ?? null,
      longitude: opts.longitude ?? null,
      geofence_id: opts.geofenceId ?? null,
      remarks: opts.remarks ?? null,
    });
  }

  static async managerClockOut(employeeId: string, projectId: string, _managerId: string): Promise<TimeLog> {
    const { data: active, error: findErr } = await supabase
      .from('attendance_time_logs')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('project_id', projectId)
      .is('clock_out_utc', null)
      .order('clock_in_utc', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (findErr) throw findErr;
    if (!active) throw new Error('No active clock-in found for this employee on this project');
    const now = new Date();
    const timezone = active.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const localNow = now.toLocaleString('sv-SE', { timeZone: timezone }).replace(' ', 'T');
    return AttendanceService.clockOut(active.id, now.toISOString(), localNow);
  }

  // ─── QR CODES ───────────────────────────────────────
  static async getProjectQrCodes(projectId: string): Promise<AttendanceQrCode[]> {
    const { data, error } = await supabase
      .from('attendance_qr_codes')
      .select('*, geofences(id, name)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async createQrCode(qr: Omit<AttendanceQrCode, 'id' | 'token'>): Promise<AttendanceQrCode> {
    const { data, error } = await supabase
      .from('attendance_qr_codes')
      .insert(qr)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async deactivateQrCode(id: string): Promise<void> {
    const { error } = await supabase
      .from('attendance_qr_codes')
      .update({ is_active: false })
      .eq('id', id);
    if (error) throw error;
  }

  static async resolveQrToken(token: string): Promise<AttendanceQrCode | null> {
    const { data, error } = await supabase
      .from('attendance_qr_codes')
      .select('*, projects(id, name), geofences(id, name)')
      .eq('token', token)
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  static async qrClockIn(opts: {
    organizationId: string;
    employeeId: string;
    projectId: string;
    geofenceId?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    qrCodeId: string;
  }): Promise<TimeLog> {
    const now = new Date();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const localNow = now.toLocaleString('sv-SE', { timeZone: timezone }).replace(' ', 'T');
    return AttendanceService.clockIn({
      organization_id: opts.organizationId,
      employee_id: opts.employeeId,
      project_id: opts.projectId,
      clock_in_utc: now.toISOString(),
      timezone,
      local_clock_in: localNow,
      attendance_mode: 'QR_CODE',
      recorded_source: 'QR_CHECKIN',
      recorded_by: opts.employeeId,
      latitude: opts.latitude ?? null,
      longitude: opts.longitude ?? null,
      geofence_id: opts.geofenceId ?? null,
      remarks: `QR check-in (code: ${opts.qrCodeId})`,
    });
  }

  // ─── DASHBOARD STATS ───────────────────────────────
  static async getTodayStats(orgId: string) {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('attendance_daily_summary')
      .select('status')
      .eq('organization_id', orgId)
      .eq('attendance_date', today);

    if (error) throw error;

    const stats = {
      present: 0, absent: 0, late: 0, halfDay: 0,
      leave: 0, sick: 0, remote: 0, total: data?.length || 0,
    };

    data?.forEach((r: any) => {
      switch (r.status) {
        case 'PRESENT': stats.present++; break;
        case 'ABSENT': stats.absent++; break;
        case 'LATE': stats.late++; break;
        case 'HALF_DAY': stats.halfDay++; break;
        case 'LEAVE': stats.leave++; break;
        case 'SICK': stats.sick++; break;
        case 'REMOTE': stats.remote++; break;
      }
    });

    return stats;
  }
}
