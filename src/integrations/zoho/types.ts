// Zoho People Integration Types

export interface ZohoConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string;
  apiBaseUrl: string;
  environment: 'sandbox' | 'production';
}

export interface ZohoAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType: 'Bearer';
}

export interface ZohoEmployee {
  employeeId: string;
  email: string;
  firstName: string;
  lastName: string;
  department: string;
  position: string;
  employmentStatus: 'active' | 'inactive' | 'terminated';
  dateOfJoining: string;
  basicSalary: number;
  bankAccountNumber?: string;
  bankName?: string;
  ifscCode?: string;
  panNumber?: string;
  aadharNumber?: string;
  phoneNumber?: string;
  address?: string;
  costCenter?: string;
  managerId?: string;
  customFields?: Record<string, any>;
}

export interface ZohoAttendanceRecord {
  employeeId: string;
  date: string;
  checkIn: string;
  checkOut: string;
  totalHours: number;
  overtimeHours: number;
  status: 'present' | 'absent' | 'half-day' | 'holiday';
  leaveType?: string;
  remarks?: string;
}

export interface ZohoLeaveRequest {
  employeeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  appliedDate: string;
}

export interface ZohoSalaryRevision {
  employeeId: string;
  effectiveDate: string;
  newSalary: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface SyncStatus {
  id: string;
  type: 'employee' | 'attendance' | 'leave' | 'salary' | 'payroll';
  direction: 'inbound' | 'outbound';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  recordsProcessed: number;
  recordsFailed: number;
  errorMessage?: string;
  retryCount: number;
}

export interface IntegrationHealth {
  status: 'healthy' | 'warning' | 'critical';
  lastSync: string;
  uptime: number;
  apiResponseTime: number;
  errorRate: number;
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
}

export interface DataMapping {
  zohoField: string;
  payrollField: string;
  transformation?: string;
  required: boolean;
  defaultValue?: any;
}

export interface SyncConfiguration {
  id: string;
  name: string;
  enabled: boolean;
  frequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  direction: 'inbound' | 'outbound' | 'bidirectional';
  dataMapping: DataMapping[];
  filters?: Record<string, any>;
  retryAttempts: number;
  timeout: number;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  userId: string;
  resource: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  enabled: boolean;
  notificationChannels: string[];
  escalationLevel: number;
}

export interface NotificationChannel {
  id: string;
  type: 'email' | 'sms' | 'webhook' | 'slack';
  name: string;
  configuration: Record<string, any>;
  enabled: boolean;
}
