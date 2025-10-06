import { ZohoPeopleAPI } from './api-client';
import { ZohoAuthService } from './auth';
import { 
  ZohoEmployee, 
  ZohoAttendanceRecord, 
  ZohoLeaveRequest, 
  ZohoSalaryRevision,
  SyncStatus,
  SyncConfiguration,
  DataMapping
} from './types';
import { supabase } from '../supabase/client';

export class ZohoSyncService {
  private apiClient: ZohoPeopleAPI;
  private authService: ZohoAuthService;
  private syncConfigurations: Map<string, SyncConfiguration> = new Map();

  constructor(apiClient: ZohoPeopleAPI, authService: ZohoAuthService) {
    this.apiClient = apiClient;
    this.authService = authService;
  }

  /**
   * Initialize sync configurations from database
   */
  async initializeConfigurations(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('sync_configurations')
        .select('*')
        .eq('integration_name', 'zoho_people');

      if (error) {
        throw new Error(`Failed to load sync configurations: ${error.message}`);
      }

      if (data) {
        data.forEach(config => {
          this.syncConfigurations.set(config.id, config as SyncConfiguration);
        });
      }
    } catch (error) {
      console.error('Error initializing sync configurations:', error);
      throw error;
    }
  }

  /**
   * Sync employees from Zoho People to Payroll App
   */
  async syncEmployeesFromZoho(params?: {
    department?: string;
    status?: string;
    lastSyncDate?: string;
  }): Promise<SyncStatus> {
    const syncId = `employee_sync_${Date.now()}`;
    const syncStatus: SyncStatus = {
      id: syncId,
      type: 'employee',
      direction: 'inbound',
      status: 'processing',
      startedAt: new Date().toISOString(),
      recordsProcessed: 0,
      recordsFailed: 0,
      retryCount: 0
    };

    try {
      await this.logSyncStart(syncStatus);

      // Get employees from Zoho People
      const zohoEmployees = await this.apiClient.getEmployees({
        department: params?.department,
        status: params?.status
      });

      let processed = 0;
      let failed = 0;

      // Process each employee
      for (const zohoEmployee of zohoEmployees.employees) {
        try {
          await this.syncEmployeeToPayroll(zohoEmployee);
          processed++;
        } catch (error) {
          console.error(`Failed to sync employee ${zohoEmployee.employeeId}:`, error);
          failed++;
        }
      }

      syncStatus.status = 'completed';
      syncStatus.completedAt = new Date().toISOString();
      syncStatus.recordsProcessed = processed;
      syncStatus.recordsFailed = failed;

      await this.logSyncComplete(syncStatus);
      return syncStatus;

    } catch (error) {
      syncStatus.status = 'failed';
      syncStatus.completedAt = new Date().toISOString();
      syncStatus.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await this.logSyncComplete(syncStatus);
      throw error;
    }
  }

  /**
   * Sync attendance records from Zoho People to Payroll App
   */
  async syncAttendanceFromZoho(params: {
    startDate: string;
    endDate: string;
    employeeId?: string;
  }): Promise<SyncStatus> {
    const syncId = `attendance_sync_${Date.now()}`;
    const syncStatus: SyncStatus = {
      id: syncId,
      type: 'attendance',
      direction: 'inbound',
      status: 'processing',
      startedAt: new Date().toISOString(),
      recordsProcessed: 0,
      recordsFailed: 0,
      retryCount: 0
    };

    try {
      await this.logSyncStart(syncStatus);

      const attendanceData = await this.apiClient.getAttendanceRecords({
        startDate: params.startDate,
        endDate: params.endDate,
        employeeId: params.employeeId
      });

      let processed = 0;
      let failed = 0;

      for (const record of attendanceData.records) {
        try {
          await this.syncAttendanceToPayroll(record);
          processed++;
        } catch (error) {
          console.error(`Failed to sync attendance record for ${record.employeeId}:`, error);
          failed++;
        }
      }

      syncStatus.status = 'completed';
      syncStatus.completedAt = new Date().toISOString();
      syncStatus.recordsProcessed = processed;
      syncStatus.recordsFailed = failed;

      await this.logSyncComplete(syncStatus);
      return syncStatus;

    } catch (error) {
      syncStatus.status = 'failed';
      syncStatus.completedAt = new Date().toISOString();
      syncStatus.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await this.logSyncComplete(syncStatus);
      throw error;
    }
  }

  /**
   * Sync payroll results from Payroll App to Zoho People
   */
  async syncPayrollToZoho(payRunId: string): Promise<SyncStatus> {
    const syncId = `payroll_sync_${Date.now()}`;
    const syncStatus: SyncStatus = {
      id: syncId,
      type: 'payroll',
      direction: 'outbound',
      status: 'processing',
      startedAt: new Date().toISOString(),
      recordsProcessed: 0,
      recordsFailed: 0,
      retryCount: 0
    };

    try {
      await this.logSyncStart(syncStatus);

      // Get payroll data from our system
      const { data: payRun, error: payRunError } = await supabase
        .from('pay_runs')
        .select(`
          *,
          pay_items (
            *,
            employees (
              *
            )
          )
        `)
        .eq('id', payRunId)
        .single();

      if (payRunError) {
        throw new Error(`Failed to fetch pay run: ${payRunError.message}`);
      }

      let processed = 0;
      let failed = 0;

      // Sync each pay item to Zoho People
      for (const payItem of payRun.pay_items) {
        try {
          await this.syncPayItemToZoho(payItem);
          processed++;
        } catch (error) {
          console.error(`Failed to sync pay item for employee ${payItem.employee_id}:`, error);
          failed++;
        }
      }

      syncStatus.status = 'completed';
      syncStatus.completedAt = new Date().toISOString();
      syncStatus.recordsProcessed = processed;
      syncStatus.recordsFailed = failed;

      await this.logSyncComplete(syncStatus);
      return syncStatus;

    } catch (error) {
      syncStatus.status = 'failed';
      syncStatus.completedAt = new Date().toISOString();
      syncStatus.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await this.logSyncComplete(syncStatus);
      throw error;
    }
  }

  /**
   * Sync individual employee from Zoho to Payroll
   */
  private async syncEmployeeToPayroll(zohoEmployee: ZohoEmployee): Promise<void> {
    try {
      // Check if employee exists in our system
      const { data: existingEmployee, error: fetchError } = await supabase
        .from('employees')
        .select('id')
        .eq('email', zohoEmployee.email)
        .single();

      const employeeData = {
        first_name: zohoEmployee.firstName,
        last_name: zohoEmployee.lastName,
        email: zohoEmployee.email,
        phone: zohoEmployee.phoneNumber || null,
        status: zohoEmployee.employmentStatus === 'active' ? 'active' : 'inactive',
        employee_type: 'local', // Default, can be mapped from Zoho data
        pay_rate: zohoEmployee.basicSalary,
        country: 'Uganda', // Default, can be mapped from Zoho data
        currency: 'UGX',
        // Map additional fields as needed
        ...(zohoEmployee.bankAccountNumber && {
          bank_account: zohoEmployee.bankAccountNumber
        }),
        ...(zohoEmployee.panNumber && {
          tax_id: zohoEmployee.panNumber
        })
      };

      if (existingEmployee) {
        // Update existing employee
        const { error: updateError } = await supabase
          .from('employees')
          .update(employeeData)
          .eq('id', existingEmployee.id);

        if (updateError) {
          throw new Error(`Failed to update employee: ${updateError.message}`);
        }
      } else {
        // Create new employee
        const { error: insertError } = await supabase
          .from('employees')
          .insert(employeeData);

        if (insertError) {
          throw new Error(`Failed to create employee: ${insertError.message}`);
        }
      }
    } catch (error) {
      console.error('Error syncing employee to payroll:', error);
      throw error;
    }
  }

  /**
   * Sync attendance record to payroll
   */
  private async syncAttendanceToPayroll(record: ZohoAttendanceRecord): Promise<void> {
    try {
      // Find employee by email or ID
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('id')
        .eq('email', record.employeeId) // Assuming employeeId is email in this context
        .single();

      if (employeeError || !employee) {
        throw new Error(`Employee not found: ${record.employeeId}`);
      }

      // Store attendance record
      const { error: insertError } = await supabase
        .from('attendance_records')
        .insert({
          employee_id: employee.id,
          date: record.date,
          check_in: record.checkIn,
          check_out: record.checkOut,
          total_hours: record.totalHours,
          overtime_hours: record.overtimeHours,
          status: record.status,
          leave_type: record.leaveType,
          remarks: record.remarks
        });

      if (insertError) {
        throw new Error(`Failed to insert attendance record: ${insertError.message}`);
      }
    } catch (error) {
      console.error('Error syncing attendance record:', error);
      throw error;
    }
  }

  /**
   * Sync pay item to Zoho People
   */
  private async syncPayItemToZoho(payItem: any): Promise<void> {
    try {
      // This would typically involve creating a record in Zoho People
      // that represents the payroll result for this employee
      // The exact implementation depends on Zoho People's API structure
      
      // For now, we'll log the sync action
      console.log(`Syncing pay item for employee ${payItem.employee_id} to Zoho People`);
      
      // TODO: Implement actual Zoho People API call for payroll data
      // This might involve creating a custom record or updating employee data
      
    } catch (error) {
      console.error('Error syncing pay item to Zoho:', error);
      throw error;
    }
  }

  /**
   * Log sync start
   */
  private async logSyncStart(syncStatus: SyncStatus): Promise<void> {
    try {
      const { error } = await supabase
        .from('sync_logs')
        .insert({
          sync_id: syncStatus.id,
          type: syncStatus.type,
          direction: syncStatus.direction,
          status: syncStatus.status,
          started_at: syncStatus.startedAt,
          records_processed: syncStatus.recordsProcessed,
          records_failed: syncStatus.recordsFailed,
          retry_count: syncStatus.retryCount
        });

      if (error) {
        console.error('Failed to log sync start:', error);
      }
    } catch (error) {
      console.error('Error logging sync start:', error);
    }
  }

  /**
   * Log sync completion
   */
  private async logSyncComplete(syncStatus: SyncStatus): Promise<void> {
    try {
      const { error } = await supabase
        .from('sync_logs')
        .update({
          status: syncStatus.status,
          completed_at: syncStatus.completedAt,
          records_processed: syncStatus.recordsProcessed,
          records_failed: syncStatus.recordsFailed,
          error_message: syncStatus.errorMessage
        })
        .eq('sync_id', syncStatus.id);

      if (error) {
        console.error('Failed to log sync completion:', error);
      }
    } catch (error) {
      console.error('Error logging sync completion:', error);
    }
  }

  /**
   * Get sync status for monitoring
   */
  async getSyncStatus(): Promise<{
    lastSync: string | null;
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    averageResponseTime: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('sync_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(100);

      if (error) {
        throw new Error(`Failed to fetch sync status: ${error.message}`);
      }

      const totalSyncs = data?.length || 0;
      const successfulSyncs = data?.filter(log => log.status === 'completed').length || 0;
      const failedSyncs = data?.filter(log => log.status === 'failed').length || 0;
      const lastSync = data?.[0]?.started_at || null;

      // Calculate average response time (simplified)
      const averageResponseTime = data?.reduce((acc, log) => {
        if (log.completed_at && log.started_at) {
          const duration = new Date(log.completed_at).getTime() - new Date(log.started_at).getTime();
          return acc + duration;
        }
        return acc;
      }, 0) / (data?.length || 1) || 0;

      return {
        lastSync,
        totalSyncs,
        successfulSyncs,
        failedSyncs,
        averageResponseTime
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      throw error;
    }
  }
}
