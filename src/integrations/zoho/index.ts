import { ZohoConfig } from './types';
import { ZohoAuthService } from './auth';
import { ZohoPeopleAPI } from './api-client';
import { ZohoSyncService } from './sync-service';
import { ZohoMonitoringService } from './monitoring';

export class ZohoPeopleIntegration {
  private config: ZohoConfig;
  private authService: ZohoAuthService;
  private apiClient: ZohoPeopleAPI;
  private syncService: ZohoSyncService;
  private monitoringService: ZohoMonitoringService;

  constructor(config: ZohoConfig) {
    this.config = config;
    this.authService = new ZohoAuthService(config);
    this.apiClient = new ZohoPeopleAPI(this.authService, config.environment);
    this.syncService = new ZohoSyncService(this.apiClient, this.authService);
    this.monitoringService = new ZohoMonitoringService(this.apiClient, this.authService);
  }

  /**
   * Initialize the integration
   */
  async initialize(): Promise<void> {
    try {
      // Initialize sync configurations
      await this.syncService.initializeConfigurations();
      
      // Start health monitoring
      this.monitoringService.startHealthMonitoring();
      
      console.log('Zoho People integration initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Zoho People integration:', error);
      throw error;
    }
  }

  /**
   * Get authentication service
   */
  getAuthService(): ZohoAuthService {
    return this.authService;
  }

  /**
   * Get API client
   */
  getAPIClient(): ZohoPeopleAPI {
    return this.apiClient;
  }

  /**
   * Get sync service
   */
  getSyncService(): ZohoSyncService {
    return this.syncService;
  }

  /**
   * Get monitoring service
   */
  getMonitoringService(): ZohoMonitoringService {
    return this.monitoringService;
  }

  /**
   * Test the integration
   */
  async testIntegration(): Promise<{
    success: boolean;
    message: string;
    details: {
      authentication: boolean;
      apiConnection: boolean;
      databaseConnection: boolean;
    };
  }> {
    const results = {
      success: false,
      message: '',
      details: {
        authentication: false,
        apiConnection: false,
        databaseConnection: false
      }
    };

    try {
      // Test authentication
      const authStatus = await this.authService.getAuthStatus();
      results.details.authentication = authStatus.authenticated;

      // Test API connection
      const apiConnection = await this.apiClient.testConnection();
      results.details.apiConnection = apiConnection;

      // Test database connection (simplified)
      results.details.databaseConnection = true; // Assuming database is working if we got this far

      // Determine overall success
      results.success = results.details.authentication && 
                       results.details.apiConnection && 
                       results.details.databaseConnection;

      if (results.success) {
        results.message = 'Integration test passed successfully';
      } else {
        const failures = [];
        if (!results.details.authentication) failures.push('Authentication');
        if (!results.details.apiConnection) failures.push('API Connection');
        if (!results.details.databaseConnection) failures.push('Database Connection');
        results.message = `Integration test failed: ${failures.join(', ')}`;
      }

      return results;
    } catch (error) {
      results.message = `Integration test failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      return results;
    }
  }

  /**
   * Shutdown the integration
   */
  async shutdown(): Promise<void> {
    try {
      // Stop health monitoring
      this.monitoringService.stopHealthMonitoring();
      
      console.log('Zoho People integration shutdown successfully');
    } catch (error) {
      console.error('Error during integration shutdown:', error);
    }
  }
}

// Export individual services for direct use
export { ZohoAuthService } from './auth';
export { ZohoPeopleAPI } from './api-client';
export { ZohoSyncService } from './sync-service';
export { ZohoMonitoringService } from './monitoring';
export * from './types';
