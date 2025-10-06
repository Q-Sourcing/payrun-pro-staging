import { createClient } from '@/integrations/supabase/client';
import { User } from '@/lib/types/roles';

export interface SecurityEvent {
  id: string;
  userId: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  result: 'success' | 'failure' | 'denied';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
}

export interface SessionConfig {
  timeoutMinutes: number;
  maxConcurrentSessions: number;
  requireReauthForSensitive: boolean;
}

export class SecurityService {
  private supabase = createClient();
  private rateLimitStore = new Map<string, { count: number; resetTime: number }>();
  private sessionStore = new Map<string, { userId: string; lastActivity: number; ipAddress: string }>();

  // Rate limiting configuration
  private readonly RATE_LIMITS = {
    login: { maxAttempts: 5, windowMs: 15 * 60 * 1000, blockDurationMs: 30 * 60 * 1000 }, // 5 attempts per 15 min, block for 30 min
    passwordReset: { maxAttempts: 3, windowMs: 60 * 60 * 1000, blockDurationMs: 60 * 60 * 1000 }, // 3 attempts per hour, block for 1 hour
    api: { maxAttempts: 100, windowMs: 15 * 60 * 1000, blockDurationMs: 15 * 60 * 1000 }, // 100 requests per 15 min
    mfa: { maxAttempts: 3, windowMs: 5 * 60 * 1000, blockDurationMs: 15 * 60 * 1000 } // 3 MFA attempts per 5 min, block for 15 min
  };

  // Session configuration
  private readonly SESSION_CONFIG: SessionConfig = {
    timeoutMinutes: 480, // 8 hours
    maxConcurrentSessions: 5,
    requireReauthForSensitive: true
  };

  /**
   * Check if an action is rate limited
   */
  async checkRateLimit(
    identifier: string, 
    action: keyof typeof this.RATE_LIMITS,
    ipAddress: string
  ): Promise<{ allowed: boolean; remainingAttempts: number; resetTime: number }> {
    const config = this.RATE_LIMITS[action];
    const key = `${identifier}:${action}:${ipAddress}`;
    const now = Date.now();
    
    const current = this.rateLimitStore.get(key);
    
    if (!current || now > current.resetTime) {
      // Reset or initialize
      this.rateLimitStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs
      });
      
      return {
        allowed: true,
        remainingAttempts: config.maxAttempts - 1,
        resetTime: now + config.windowMs
      };
    }
    
    if (current.count >= config.maxAttempts) {
      // Check if block period has expired
      if (now < current.resetTime + config.blockDurationMs) {
        return {
          allowed: false,
          remainingAttempts: 0,
          resetTime: current.resetTime + config.blockDurationMs
        };
      } else {
        // Reset after block period
        this.rateLimitStore.set(key, {
          count: 1,
          resetTime: now + config.windowMs
        });
        
        return {
          allowed: true,
          remainingAttempts: config.maxAttempts - 1,
          resetTime: now + config.windowMs
        };
      }
    }
    
    // Increment count
    current.count++;
    this.rateLimitStore.set(key, current);
    
    return {
      allowed: true,
      remainingAttempts: config.maxAttempts - current.count,
      resetTime: current.resetTime
    };
  }

  /**
   * Record a security event
   */
  async logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('audit_logs')
        .insert({
          user_id: event.userId,
          action: event.action,
          resource: event.resource,
          details: event.details,
          ip_address: event.ipAddress,
          user_agent: event.userAgent,
          result: event.result,
          timestamp: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to log security event:', error);
      }
    } catch (error) {
      console.error('Security logging error:', error);
    }
  }

  /**
   * Create a new session
   */
  async createSession(
    userId: string, 
    sessionToken: string, 
    ipAddress: string, 
    userAgent: string
  ): Promise<void> {
    try {
      // Check concurrent session limit
      const userSessions = Array.from(this.sessionStore.values())
        .filter(session => session.userId === userId);
      
      if (userSessions.length >= this.SESSION_CONFIG.maxConcurrentSessions) {
        // Remove oldest session
        const oldestSession = userSessions.reduce((oldest, current) => 
          current.lastActivity < oldest.lastActivity ? current : oldest
        );
        this.sessionStore.delete(oldestSession.userId);
      }

      // Create new session
      this.sessionStore.set(sessionToken, {
        userId,
        lastActivity: Date.now(),
        ipAddress
      });

      // Log session creation
      await this.logSecurityEvent({
        userId,
        action: 'session_created',
        resource: 'authentication',
        details: { sessionToken: sessionToken.substring(0, 8) + '...' },
        ipAddress,
        userAgent,
        result: 'success',
        severity: 'low'
      });

      // Store in database
      await this.supabase
        .from('user_sessions')
        .insert({
          user_id: userId,
          session_token: sessionToken,
          ip_address: ipAddress,
          user_agent: userAgent,
          expires_at: new Date(Date.now() + this.SESSION_CONFIG.timeoutMinutes * 60 * 1000).toISOString()
        });

    } catch (error) {
      console.error('Session creation error:', error);
      throw new Error('Failed to create session');
    }
  }

  /**
   * Validate and update session
   */
  async validateSession(sessionToken: string, ipAddress: string): Promise<{ valid: boolean; userId?: string }> {
    try {
      const session = this.sessionStore.get(sessionToken);
      
      if (!session) {
        return { valid: false };
      }

      const now = Date.now();
      const sessionAge = now - session.lastActivity;
      const sessionTimeoutMs = this.SESSION_CONFIG.timeoutMinutes * 60 * 1000;

      // Check if session has expired
      if (sessionAge > sessionTimeoutMs) {
        this.sessionStore.delete(sessionToken);
        return { valid: false };
      }

      // Check IP address (optional security check)
      if (session.ipAddress !== ipAddress) {
        await this.logSecurityEvent({
          userId: session.userId,
          action: 'session_ip_mismatch',
          resource: 'authentication',
          details: { 
            expectedIp: session.ipAddress, 
            actualIp: ipAddress,
            sessionToken: sessionToken.substring(0, 8) + '...'
          },
          ipAddress,
          userAgent: 'Unknown',
          result: 'failure',
          severity: 'medium'
        });
        
        // Optionally invalidate session on IP mismatch
        // this.sessionStore.delete(sessionToken);
        // return { valid: false };
      }

      // Update last activity
      session.lastActivity = now;
      this.sessionStore.set(sessionToken, session);

      return { valid: true, userId: session.userId };
    } catch (error) {
      console.error('Session validation error:', error);
      return { valid: false };
    }
  }

  /**
   * Destroy a session
   */
  async destroySession(sessionToken: string, userId: string, reason: string = 'logout'): Promise<void> {
    try {
      this.sessionStore.delete(sessionToken);

      // Log session destruction
      await this.logSecurityEvent({
        userId,
        action: 'session_destroyed',
        resource: 'authentication',
        details: { reason, sessionToken: sessionToken.substring(0, 8) + '...' },
        ipAddress: 'Unknown',
        userAgent: 'Unknown',
        result: 'success',
        severity: 'low'
      });

      // Update database
      await this.supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('session_token', sessionToken);

    } catch (error) {
      console.error('Session destruction error:', error);
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const now = Date.now();
      const timeoutMs = this.SESSION_CONFIG.timeoutMinutes * 60 * 1000;
      let cleanedCount = 0;

      // Clean up in-memory sessions
      for (const [token, session] of this.sessionStore.entries()) {
        if (now - session.lastActivity > timeoutMs) {
          this.sessionStore.delete(token);
          cleanedCount++;
        }
      }

      // Clean up database sessions
      const { data, error } = await this.supabase
        .from('user_sessions')
        .update({ is_active: false })
        .lt('expires_at', new Date().toISOString())
        .eq('is_active', true);

      if (error) {
        console.error('Database session cleanup error:', error);
      }

      return cleanedCount;
    } catch (error) {
      console.error('Session cleanup error:', error);
      return 0;
    }
  }

  /**
   * Get security events for a user
   */
  async getSecurityEvents(
    userId: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<SecurityEvent[]> {
    try {
      const { data, error } = await this.supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Failed to fetch security events:', error);
        return [];
      }

      return data?.map(event => ({
        id: event.id,
        userId: event.user_id,
        action: event.action,
        resource: event.resource,
        details: event.details,
        ipAddress: event.ip_address,
        userAgent: event.user_agent,
        timestamp: event.timestamp,
        result: event.result,
        severity: this.determineSeverity(event.action, event.result)
      })) || [];
    } catch (error) {
      console.error('Security events fetch error:', error);
      return [];
    }
  }

  /**
   * Get security dashboard data
   */
  async getSecurityDashboard(userId: string): Promise<{
    recentEvents: SecurityEvent[];
    failedLogins: number;
    activeSessions: number;
    securityScore: number;
  }> {
    try {
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Get recent events
      const recentEvents = await this.getSecurityEvents(userId, 10);

      // Get failed login attempts in last 24 hours
      const { data: failedLogins } = await this.supabase
        .from('audit_logs')
        .select('id')
        .eq('user_id', userId)
        .eq('action', 'login_attempt')
        .eq('result', 'failure')
        .gte('timestamp', last24Hours.toISOString());

      // Get active sessions
      const activeSessions = Array.from(this.sessionStore.values())
        .filter(session => session.userId === userId).length;

      // Calculate security score (0-100)
      const securityScore = this.calculateSecurityScore(userId, recentEvents);

      return {
        recentEvents,
        failedLogins: failedLogins?.length || 0,
        activeSessions,
        securityScore
      };
    } catch (error) {
      console.error('Security dashboard error:', error);
      return {
        recentEvents: [],
        failedLogins: 0,
        activeSessions: 0,
        securityScore: 0
      };
    }
  }

  /**
   * Determine event severity
   */
  private determineSeverity(action: string, result: string): 'low' | 'medium' | 'high' | 'critical' {
    if (result === 'failure') {
      if (action.includes('login') || action.includes('password')) return 'high';
      if (action.includes('session') || action.includes('mfa')) return 'medium';
      return 'low';
    }

    if (action.includes('delete') || action.includes('admin')) return 'critical';
    if (action.includes('sensitive') || action.includes('export')) return 'high';
    if (action.includes('edit') || action.includes('create')) return 'medium';
    return 'low';
  }

  /**
   * Calculate security score
   */
  private calculateSecurityScore(userId: string, events: SecurityEvent[]): number {
    let score = 100;

    // Deduct points for failed logins
    const failedLogins = events.filter(e => e.action.includes('login') && e.result === 'failure').length;
    score -= failedLogins * 5;

    // Deduct points for security violations
    const violations = events.filter(e => e.severity === 'high' || e.severity === 'critical').length;
    score -= violations * 10;

    // Deduct points for multiple sessions
    const activeSessions = Array.from(this.sessionStore.values())
      .filter(session => session.userId === userId).length;
    if (activeSessions > 3) {
      score -= (activeSessions - 3) * 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Check if user needs to re-authenticate for sensitive operations
   */
  async requiresReauth(userId: string, operation: string): Promise<boolean> {
    if (!this.SESSION_CONFIG.requireReauthForSensitive) {
      return false;
    }

    const sensitiveOperations = [
      'delete_user',
      'change_password',
      'disable_mfa',
      'export_data',
      'bulk_delete',
      'system_config'
    ];

    return sensitiveOperations.includes(operation);
  }

  /**
   * Generate secure session token
   */
  generateSessionToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 64; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }
}

// Export singleton instance
export const securityService = new SecurityService();
