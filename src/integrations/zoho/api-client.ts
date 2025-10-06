import { ZohoAuthService } from './auth';
import { ZohoEmployee, ZohoAttendanceRecord, ZohoLeaveRequest, ZohoSalaryRevision } from './types';

export class ZohoPeopleAPI {
  private authService: ZohoAuthService;
  private baseUrl: string;
  private rateLimitDelay: number = 1000; // 1 second between requests
  private lastRequestTime: number = 0;

  constructor(authService: ZohoAuthService, environment: 'sandbox' | 'production' = 'production') {
    this.authService = authService;
    this.baseUrl = environment === 'sandbox' 
      ? 'https://people.zoho.com/people/api' 
      : 'https://people.zoho.com/people/api';
  }

  /**
   * Make authenticated API request with rate limiting
   */
  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise(resolve => 
        setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest)
      );
    }
    this.lastRequestTime = Date.now();

    const accessToken = await this.authService.getValidAccessToken();
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token might be expired, try to refresh
        await this.authService.refreshAccessToken();
        const newAccessToken = await this.authService.getValidAccessToken();
        
        // Retry the request with new token
        const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, {
          ...options,
          headers: {
            'Authorization': `Bearer ${newAccessToken}`,
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        if (!retryResponse.ok) {
          throw new Error(`API request failed: ${retryResponse.statusText}`);
        }

        return await retryResponse.json();
      }
      
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Employee Management APIs
   */
  async getEmployees(params?: {
    page?: number;
    limit?: number;
    department?: string;
    status?: string;
  }): Promise<{ employees: ZohoEmployee[]; total: number }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.department) queryParams.append('department', params.department);
    if (params?.status) queryParams.append('status', params.status);

    const endpoint = `/employees/v1/employees${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await this.makeRequest<{ employees: ZohoEmployee[]; total: number }>(endpoint);
  }

  async getEmployee(employeeId: string): Promise<ZohoEmployee> {
    return await this.makeRequest<ZohoEmployee>(`/employees/v1/employees/${employeeId}`);
  }

  async createEmployee(employee: Partial<ZohoEmployee>): Promise<ZohoEmployee> {
    return await this.makeRequest<ZohoEmployee>('/employees/v1/employees', {
      method: 'POST',
      body: JSON.stringify(employee),
    });
  }

  async updateEmployee(employeeId: string, updates: Partial<ZohoEmployee>): Promise<ZohoEmployee> {
    return await this.makeRequest<ZohoEmployee>(`/employees/v1/employees/${employeeId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteEmployee(employeeId: string): Promise<void> {
    await this.makeRequest<void>(`/employees/v1/employees/${employeeId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Attendance Management APIs
   */
  async getAttendanceRecords(params: {
    employeeId?: string;
    startDate: string;
    endDate: string;
    page?: number;
    limit?: number;
  }): Promise<{ records: ZohoAttendanceRecord[]; total: number }> {
    const queryParams = new URLSearchParams();
    queryParams.append('startDate', params.startDate);
    queryParams.append('endDate', params.endDate);
    if (params.employeeId) queryParams.append('employeeId', params.employeeId);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    const endpoint = `/attendance/v1/records?${queryParams.toString()}`;
    return await this.makeRequest<{ records: ZohoAttendanceRecord[]; total: number }>(endpoint);
  }

  async createAttendanceRecord(record: Omit<ZohoAttendanceRecord, 'employeeId'> & { employeeId: string }): Promise<ZohoAttendanceRecord> {
    return await this.makeRequest<ZohoAttendanceRecord>('/attendance/v1/records', {
      method: 'POST',
      body: JSON.stringify(record),
    });
  }

  async updateAttendanceRecord(recordId: string, updates: Partial<ZohoAttendanceRecord>): Promise<ZohoAttendanceRecord> {
    return await this.makeRequest<ZohoAttendanceRecord>(`/attendance/v1/records/${recordId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Leave Management APIs
   */
  async getLeaveRequests(params: {
    employeeId?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ requests: ZohoLeaveRequest[]; total: number }> {
    const queryParams = new URLSearchParams();
    if (params.employeeId) queryParams.append('employeeId', params.employeeId);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.status) queryParams.append('status', params.status);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    const endpoint = `/leave/v1/requests?${queryParams.toString()}`;
    return await this.makeRequest<{ requests: ZohoLeaveRequest[]; total: number }>(endpoint);
  }

  async createLeaveRequest(request: Omit<ZohoLeaveRequest, 'employeeId'> & { employeeId: string }): Promise<ZohoLeaveRequest> {
    return await this.makeRequest<ZohoLeaveRequest>('/leave/v1/requests', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async updateLeaveRequest(requestId: string, updates: Partial<ZohoLeaveRequest>): Promise<ZohoLeaveRequest> {
    return await this.makeRequest<ZohoLeaveRequest>(`/leave/v1/requests/${requestId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Salary Management APIs
   */
  async getSalaryRevisions(params: {
    employeeId?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ revisions: ZohoSalaryRevision[]; total: number }> {
    const queryParams = new URLSearchParams();
    if (params.employeeId) queryParams.append('employeeId', params.employeeId);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.status) queryParams.append('status', params.status);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    const endpoint = `/payroll/v1/salary?${queryParams.toString()}`;
    return await this.makeRequest<{ revisions: ZohoSalaryRevision[]; total: number }>(endpoint);
  }

  async createSalaryRevision(revision: Omit<ZohoSalaryRevision, 'employeeId'> & { employeeId: string }): Promise<ZohoSalaryRevision> {
    return await this.makeRequest<ZohoSalaryRevision>('/payroll/v1/salary', {
      method: 'POST',
      body: JSON.stringify(revision),
    });
  }

  async updateSalaryRevision(revisionId: string, updates: Partial<ZohoSalaryRevision>): Promise<ZohoSalaryRevision> {
    return await this.makeRequest<ZohoSalaryRevision>(`/payroll/v1/salary/${revisionId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Utility Methods
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.makeRequest('/employees/v1/employees?limit=1');
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  async getAPIStatus(): Promise<{
    status: 'online' | 'offline';
    responseTime: number;
    lastChecked: string;
  }> {
    const startTime = Date.now();
    try {
      await this.makeRequest('/employees/v1/employees?limit=1');
      return {
        status: 'online',
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'offline',
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString()
      };
    }
  }
}
