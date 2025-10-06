import { ZohoPeopleAPI } from './api-client';
import { ZohoAuthService } from './auth';
import { IntegrationHealth, AlertRule, NotificationChannel, AuditLog } from './types';
import { supabase } from '../supabase/client';

export class ZohoMonitoringService {
  private apiClient: ZohoPeopleAPI;
  private authService: ZohoAuthService;
  private alertRules: Map<string, AlertRule> = new Map();
  private notificationChannels: Map<string, NotificationChannel> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(apiClient: ZohoPeopleAPI, authService: ZohoAuthService) {
    this.apiClient = apiClient;
    this.authService = authService;
  }

  /**
   * Start continuous health monitoring
   */
  startHealthMonitoring(intervalMs: number = 15 * 60 * 1000): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('Health check failed:', error);
      }
    }, intervalMs);

    // Perform initial health check
    this.performHealthCheck();
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<IntegrationHealth> {
    const startTime = Date.now();
    
    try {
      // Test API connection
      const apiStatus = await this.apiClient.getAPIStatus();
      
      // Check authentication status
      const authStatus = await this.authService.getAuthStatus();
      
      // Get sync statistics
      const syncStats = await this.getSyncStatistics();
      
      // Calculate health metrics
      const health: IntegrationHealth = {
        status: this.determineHealthStatus(apiStatus, authStatus, syncStats),
        lastSync: syncStats.lastSync,
        uptime: this.calculateUptime(),
        apiResponseTime: apiStatus.responseTime,
        errorRate: syncStats.errorRate,
        totalSyncs: syncStats.totalSyncs,
        successfulSyncs: syncStats.successfulSyncs,
        failedSyncs: syncStats.failedSyncs
      };

      // Store health check result
      await this.storeHealthCheckResult(health);
      
      // Check alert conditions
      await this.checkAlertConditions(health);
      
      return health;
    } catch (error) {
      console.error('Health check error:', error);
      
      const errorHealth: IntegrationHealth = {
        status: 'critical',
        lastSync: null,
        uptime: 0,
        apiResponseTime: Date.now() - startTime,
        errorRate: 100,
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 1
      };

      await this.storeHealthCheckResult(errorHealth);
      return errorHealth;
    }
  }

  /**
   * Get current integration health
   */
  async getCurrentHealth(): Promise<IntegrationHealth> {
    try {
      const { data, error } = await supabase
        .from('integration_health')
        .select('*')
        .eq('integration_name', 'zoho_people')
        .order('checked_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return await this.performHealthCheck();
      }

      return {
        status: data.status,
        lastSync: data.last_sync,
        uptime: data.uptime,
        apiResponseTime: data.api_response_time,
        errorRate: data.error_rate,
        totalSyncs: data.total_syncs,
        successfulSyncs: data.successful_syncs,
        failedSyncs: data.failed_syncs
      };
    } catch (error) {
      console.error('Error getting current health:', error);
      return await this.performHealthCheck();
    }
  }

  /**
   * Get sync statistics
   */
  private async getSyncStatistics(): Promise<{
    lastSync: string | null;
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    errorRate: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('sync_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(100);

      if (error) {
        throw new Error(`Failed to fetch sync statistics: ${error.message}`);
      }

      const totalSyncs = data?.length || 0;
      const successfulSyncs = data?.filter(log => log.status === 'completed').length || 0;
      const failedSyncs = data?.filter(log => log.status === 'failed').length || 0;
      const errorRate = totalSyncs > 0 ? (failedSyncs / totalSyncs) * 100 : 0;
      const lastSync = data?.[0]?.started_at || null;

      return {
        lastSync,
        totalSyncs,
        successfulSyncs,
        failedSyncs,
        errorRate
      };
    } catch (error) {
      console.error('Error getting sync statistics:', error);
      return {
        lastSync: null,
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        errorRate: 0
      };
    }
  }

  /**
   * Determine overall health status
   */
  private determineHealthStatus(
    apiStatus: any,
    authStatus: any,
    syncStats: any
  ): 'healthy' | 'warning' | 'critical' {
    // Critical conditions
    if (apiStatus.status === 'offline' || !authStatus.authenticated) {
      return 'critical';
    }

    if (syncStats.errorRate > 50) {
      return 'critical';
    }

    // Warning conditions
    if (apiStatus.responseTime > 5000) { // 5 seconds
      return 'warning';
    }

    if (syncStats.errorRate > 20) {
      return 'warning';
    }

    if (syncStats.failedSyncs > 0 && syncStats.totalSyncs > 10) {
      return 'warning';
    }

    return 'healthy';
  }

  /**
   * Calculate uptime percentage
   */
  private calculateUptime(): number {
    // This would typically calculate uptime based on historical data
    // For now, return a simplified calculation
    return 99.9; // Placeholder
  }

  /**
   * Store health check result
   */
  private async storeHealthCheckResult(health: IntegrationHealth): Promise<void> {
    try {
      const { error } = await supabase
        .from('integration_health')
        .insert({
          integration_name: 'zoho_people',
          status: health.status,
          last_sync: health.lastSync,
          uptime: health.uptime,
          api_response_time: health.apiResponseTime,
          error_rate: health.errorRate,
          total_syncs: health.totalSyncs,
          successful_syncs: health.successfulSyncs,
          failed_syncs: health.failedSyncs,
          checked_at: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to store health check result:', error);
      }
    } catch (error) {
      console.error('Error storing health check result:', error);
    }
  }

  /**
   * Check alert conditions and trigger notifications
   */
  private async checkAlertConditions(health: IntegrationHealth): Promise<void> {
    try {
      // Load alert rules
      await this.loadAlertRules();
      
      for (const [ruleId, rule] of this.alertRules) {
        if (!rule.enabled) continue;

        let shouldTrigger = false;

        switch (rule.condition) {
          case 'error_rate_high':
            shouldTrigger = health.errorRate > rule.threshold;
            break;
          case 'api_response_slow':
            shouldTrigger = health.apiResponseTime > rule.threshold;
            break;
          case 'sync_failed':
            shouldTrigger = health.failedSyncs > rule.threshold;
            break;
          case 'status_critical':
            shouldTrigger = health.status === 'critical';
            break;
          case 'no_recent_sync':
            const lastSyncTime = health.lastSync ? new Date(health.lastSync).getTime() : 0;
            const hoursSinceLastSync = (Date.now() - lastSyncTime) / (1000 * 60 * 60);
            shouldTrigger = hoursSinceLastSync > rule.threshold;
            break;
        }

        if (shouldTrigger) {
          await this.triggerAlert(rule, health);
        }
      }
    } catch (error) {
      console.error('Error checking alert conditions:', error);
    }
  }

  /**
   * Load alert rules from database
   */
  private async loadAlertRules(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('alert_rules')
        .select('*')
        .eq('integration_name', 'zoho_people')
        .eq('enabled', true);

      if (error) {
        console.error('Failed to load alert rules:', error);
        return;
      }

      if (data) {
        data.forEach(rule => {
          this.alertRules.set(rule.id, rule as AlertRule);
        });
      }
    } catch (error) {
      console.error('Error loading alert rules:', error);
    }
  }

  /**
   * Trigger alert notification
   */
  private async triggerAlert(rule: AlertRule, health: IntegrationHealth): Promise<void> {
    try {
      // Load notification channels
      await this.loadNotificationChannels();

      const alertMessage = this.generateAlertMessage(rule, health);

      // Send notifications to configured channels
      for (const channelId of rule.notificationChannels) {
        const channel = this.notificationChannels.get(channelId);
        if (channel && channel.enabled) {
          await this.sendNotification(channel, alertMessage);
        }
      }

      // Log alert
      await this.logAlert(rule, health, alertMessage);
    } catch (error) {
      console.error('Error triggering alert:', error);
    }
  }

  /**
   * Load notification channels from database
   */
  private async loadNotificationChannels(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('notification_channels')
        .select('*')
        .eq('enabled', true);

      if (error) {
        console.error('Failed to load notification channels:', error);
        return;
      }

      if (data) {
        data.forEach(channel => {
          this.notificationChannels.set(channel.id, channel as NotificationChannel);
        });
      }
    } catch (error) {
      console.error('Error loading notification channels:', error);
    }
  }

  /**
   * Send notification via channel
   */
  private async sendNotification(channel: NotificationChannel, message: string): Promise<void> {
    try {
      switch (channel.type) {
        case 'email':
          await this.sendEmailNotification(channel, message);
          break;
        case 'sms':
          await this.sendSMSNotification(channel, message);
          break;
        case 'webhook':
          await this.sendWebhookNotification(channel, message);
          break;
        case 'slack':
          await this.sendSlackNotification(channel, message);
          break;
        default:
          console.warn(`Unknown notification channel type: ${channel.type}`);
      }
    } catch (error) {
      console.error(`Error sending notification via ${channel.type}:`, error);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(channel: NotificationChannel, message: string): Promise<void> {
    // Implement email sending logic
    console.log(`Sending email notification to ${channel.configuration.email}: ${message}`);
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(channel: NotificationChannel, message: string): Promise<void> {
    // Implement SMS sending logic
    console.log(`Sending SMS notification to ${channel.configuration.phone}: ${message}`);
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(channel: NotificationChannel, message: string): Promise<void> {
    try {
      await fetch(channel.configuration.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(channel.configuration.headers || {})
        },
        body: JSON.stringify({
          message,
          timestamp: new Date().toISOString(),
          integration: 'zoho_people'
        })
      });
    } catch (error) {
      console.error('Error sending webhook notification:', error);
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(channel: NotificationChannel, message: string): Promise<void> {
    try {
      await fetch('https://hooks.slack.com/services/' + channel.configuration.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: message,
          channel: channel.configuration.channel || '#alerts'
        })
      });
    } catch (error) {
      console.error('Error sending Slack notification:', error);
    }
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(rule: AlertRule, health: IntegrationHealth): string {
    const timestamp = new Date().toISOString();
    return `🚨 Zoho People Integration Alert

Rule: ${rule.name}
Status: ${health.status.toUpperCase()}
Time: ${timestamp}

Health Metrics:
- API Response Time: ${health.apiResponseTime}ms
- Error Rate: ${health.errorRate.toFixed(2)}%
- Total Syncs: ${health.totalSyncs}
- Successful: ${health.successfulSyncs}
- Failed: ${health.failedSyncs}
- Last Sync: ${health.lastSync || 'Never'}

Please check the integration dashboard for more details.`;
  }

  /**
   * Log alert
   */
  private async logAlert(rule: AlertRule, health: IntegrationHealth, message: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('alert_logs')
        .insert({
          rule_id: rule.id,
          rule_name: rule.name,
          integration_name: 'zoho_people',
          status: health.status,
          message,
          triggered_at: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to log alert:', error);
      }
    } catch (error) {
      console.error('Error logging alert:', error);
    }
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(params?: {
    startDate?: string;
    endDate?: string;
    action?: string;
    userId?: string;
    limit?: number;
  }): Promise<AuditLog[]> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('integration_name', 'zoho_people')
        .order('timestamp', { ascending: false });

      if (params?.startDate) {
        query = query.gte('timestamp', params.startDate);
      }
      if (params?.endDate) {
        query = query.lte('timestamp', params.endDate);
      }
      if (params?.action) {
        query = query.eq('action', params.action);
      }
      if (params?.userId) {
        query = query.eq('user_id', params.userId);
      }
      if (params?.limit) {
        query = query.limit(params.limit);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch audit logs: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error getting audit logs:', error);
      throw error;
    }
  }

  /**
   * Log audit event
   */
  async logAuditEvent(event: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    try {
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          ...event,
          timestamp: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to log audit event:', error);
      }
    } catch (error) {
      console.error('Error logging audit event:', error);
    }
  }
}
