import { supabase } from '@/integrations/supabase/client';
import { queryClient } from './query-client';
import { queryKeys } from './query-client';

export class RealtimeService {
  private static subscriptions: Map<string, any> = new Map();
  private static initialized = false;

  /**
   * Initialize realtime subscriptions for all data
   */
  static async initializeRealtimeSubscriptions() {
    if (this.initialized) {
      return;
    }

    console.log('🔄 Initializing realtime subscriptions...');
    
    // Subscribe to employees table changes
    this.subscribeToEmployees();
    
    // Subscribe to pay groups table changes
    this.subscribeToPayGroups();
    
    // Subscribe to paygroup_employees table changes
    this.subscribeToPayGroupEmployees();
    
    // Subscribe to pay runs table changes
    this.subscribeToPayRuns();
    
    this.initialized = true;
    console.log('✅ Realtime subscriptions initialized');
  }

  /**
   * Subscribe to employees table changes
   */
  private static subscribeToEmployees() {
    const channel = supabase
      .channel('employees-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employees'
        },
        (payload) => {
          console.log('📊 Employees table changed:', payload);
          
          // Invalidate all employee-related queries
          queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
          
          // If it's an insert/update, we might want to update specific queries
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const employeeId = payload.new?.id;
            if (employeeId) {
              queryClient.invalidateQueries({ queryKey: queryKeys.employees.detail(employeeId) });
            }
          }
        }
      )
      .subscribe();

    this.subscriptions.set('employees', channel);
  }

  /**
   * Subscribe to pay groups table changes (both regular and expatriate)
   */
  private static subscribeToPayGroups() {
    // Subscribe to regular pay groups
    const regularChannel = supabase
      .channel('pay-groups-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pay_groups'
        },
        (payload) => {
          console.log('📊 Regular pay groups table changed:', payload);
          
          // Invalidate all pay group queries
          queryClient.invalidateQueries({ queryKey: queryKeys.payGroups.all });
          
          // Update specific pay group if it's an insert/update
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const payGroupId = payload.new?.id;
            if (payGroupId) {
              queryClient.invalidateQueries({ queryKey: queryKeys.payGroups.detail(payGroupId, 'regular') });
            }
          }
        }
      )
      .subscribe();

    // Subscribe to expatriate pay groups
    const expatriateChannel = supabase
      .channel('expatriate-pay-groups-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expatriate_pay_groups'
        },
        (payload) => {
          console.log('📊 Expatriate pay groups table changed:', payload);
          
          // Invalidate all pay group queries
          queryClient.invalidateQueries({ queryKey: queryKeys.payGroups.all });
          
          // Update specific pay group if it's an insert/update
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const payGroupId = payload.new?.id;
            if (payGroupId) {
              queryClient.invalidateQueries({ queryKey: queryKeys.payGroups.detail(payGroupId, 'expatriate') });
            }
          }
        }
      )
      .subscribe();

    this.subscriptions.set('pay-groups-regular', regularChannel);
    this.subscriptions.set('pay-groups-expatriate', expatriateChannel);
  }

  /**
   * Subscribe to paygroup_employees table changes
   */
  private static subscribeToPayGroupEmployees() {
    const channel = supabase
      .channel('paygroup-employees-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'paygroup_employees'
        },
        (payload) => {
          console.log('📊 PayGroup employees table changed:', payload);
          
          // Invalidate all pay group employee queries
          queryClient.invalidateQueries({ queryKey: queryKeys.payGroupEmployees.all });
          
          // Update specific queries based on the change
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
            const employeeId = (payload.new as any)?.employee_id || (payload.old as any)?.employee_id;
            const payGroupId = (payload.new as any)?.pay_group_id || (payload.old as any)?.pay_group_id;
            
            if (employeeId) {
              queryClient.invalidateQueries({ queryKey: queryKeys.payGroupEmployees.byEmployee(employeeId) });
              queryClient.invalidateQueries({ queryKey: queryKeys.payGroupEmployees.currentPayGroup(employeeId) });
            }
            
            if (payGroupId) {
              queryClient.invalidateQueries({ queryKey: queryKeys.payGroupEmployees.byPayGroup(payGroupId) });
            }
          }
          
          // Also invalidate pay group queries since employee counts changed
          queryClient.invalidateQueries({ queryKey: queryKeys.payGroups.all });
        }
      )
      .subscribe();

    this.subscriptions.set('paygroup-employees', channel);
  }

  /**
   * Subscribe to pay runs table changes
   */
  private static subscribeToPayRuns() {
    const channel = supabase
      .channel('pay-runs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pay_runs'
        },
        (payload) => {
          console.log('📊 Pay runs table changed:', payload);
          
          // Invalidate all pay run queries
          queryClient.invalidateQueries({ queryKey: queryKeys.payRuns.all });
          
          // Update specific pay run if it's an insert/update
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const payRunId = payload.new?.id;
            if (payRunId) {
              queryClient.invalidateQueries({ queryKey: queryKeys.payRuns.detail(payRunId) });
            }
          }
        }
      )
      .subscribe();

    this.subscriptions.set('pay-runs', channel);
  }

  /**
   * Clean up all subscriptions
   */
  static async cleanupSubscriptions() {
    if (!this.initialized && this.subscriptions.size === 0) {
      return;
    }

    console.log('🧹 Cleaning up realtime subscriptions...');
    
    for (const [name, channel] of this.subscriptions) {
      await supabase.removeChannel(channel);
      console.log(`✅ Removed subscription: ${name}`);
    }
    
    this.subscriptions.clear();
    this.initialized = false;
  }

  /**
   * Get subscription status
   */
  static getSubscriptionStatus() {
    return {
      totalSubscriptions: this.subscriptions.size,
      subscriptions: Array.from(this.subscriptions.keys())
    };
  }
}
