import { supabase } from '@/integrations/supabase/client';
import { AuthLogger } from './auth-logger';

export interface LockoutStatus {
  isLocked: boolean;
  lockedAt: string | null;
  lockedBy: string | null;
  failedAttempts: number;
  lockoutReason: string | null;
}

/**
 * AccountLockoutService
 * Manages account lockout functionality
 * Integrates with AuthLogger for audit trail
 */
export class AccountLockoutService {
  /**
   * Get lockout threshold for an organization
   */
  private static async getLockoutThreshold(orgId: string | null): Promise<number> {
    if (!orgId) {
      return 5; // Default threshold
    }

    try {
      const { data, error } = await supabase
        .from('organization_security_settings')
        .select('lockout_threshold')
        .eq('org_id', orgId)
        .single();

      if (error || !data) {
        return 5; // Default threshold
      }

      return data.lockout_threshold || 5;
    } catch (error) {
      console.error('Error fetching lockout threshold:', error);
      return 5; // Default threshold
    }
  }

  /**
   * Get user's organization ID
   */
  private static async getUserOrgId(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', userId)
        .single();

      if (error || !data) {
        return null;
      }

      return data.organization_id || null;
    } catch (error) {
      console.error('Error fetching user org ID:', error);
      return null;
    }
  }

  /**
   * Check if account is locked
   */
  static async checkLockoutStatus(userId: string): Promise<LockoutStatus> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('failed_login_attempts, locked_at, locked_by, lockout_reason')
        .eq('id', userId)
        .single();

      if (error || !data) {
        return {
          isLocked: false,
          lockedAt: null,
          lockedBy: null,
          failedAttempts: 0,
          lockoutReason: null,
        };
      }

      return {
        isLocked: data.locked_at !== null,
        lockedAt: data.locked_at,
        lockedBy: data.locked_by,
        failedAttempts: data.failed_login_attempts || 0,
        lockoutReason: data.lockout_reason || null,
      };
    } catch (error) {
      console.error('Error checking lockout status:', error);
      return {
        isLocked: false,
        lockedAt: null,
        lockedBy: null,
        failedAttempts: 0,
        lockoutReason: null,
      };
    }
  }

  /**
   * Increment failed login attempts
   * Returns the new count and whether account should be locked
   */
  static async incrementFailedAttempts(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ newCount: number; shouldLock: boolean }> {
    try {
      // Get user's organization
      const orgId = await this.getUserOrgId(userId);

      // Get lockout threshold
      const threshold = await this.getLockoutThreshold(orgId);

      // Increment failed attempts
      const { data, error } = await supabase.rpc('increment_failed_login_attempts', {
        _user_id: userId,
      });

      if (error) {
        console.error('Error incrementing failed attempts:', error);
        throw error;
      }

      const newCount = data || 0;
      const shouldLock = newCount >= threshold;

      // Log failed login attempt
      await AuthLogger.log(
        {
          user_id: userId,
          org_id: orgId || undefined,
          event_type: 'login_failed',
          success: false,
          reason: `Failed login attempt ${newCount} of ${threshold}`,
        },
        ipAddress,
        userAgent
      );

      // Lock account if threshold reached
      if (shouldLock) {
        await this.lockAccount(userId, null, 'Failed login attempts exceeded threshold', ipAddress, userAgent);
      }

      return { newCount, shouldLock };
    } catch (error) {
      console.error('Error in incrementFailedAttempts:', error);
      throw error;
    }
  }

  /**
   * Lock an account
   */
  static async lockAccount(
    userId: string,
    lockedBy: string | null,
    reason: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const orgId = await this.getUserOrgId(userId);

      const { error } = await supabase
        .from('profiles')
        .update({
          locked_at: new Date().toISOString(),
          locked_by: lockedBy,
          lockout_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('Error locking account:', error);
        throw error;
      }

      // Log lockout event
      await AuthLogger.log(
        {
          user_id: userId,
          org_id: orgId || undefined,
          event_type: 'account_locked',
          success: true,
          reason: reason,
          metadata: {
            locked_by: lockedBy,
          },
        },
        ipAddress,
        userAgent
      );
    } catch (error) {
      console.error('Error in lockAccount:', error);
      throw error;
    }
  }

  /**
   * Unlock an account
   */
  static async unlockAccount(
    userId: string,
    unlockedBy: string,
    reason?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const orgId = await this.getUserOrgId(userId);

      const { error } = await supabase
        .from('profiles')
        .update({
          locked_at: null,
          locked_by: null,
          unlocked_at: new Date().toISOString(),
          unlocked_by: unlockedBy,
          failed_login_attempts: 0,
          lockout_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('Error unlocking account:', error);
        throw error;
      }

      // Log unlock event
      await AuthLogger.log(
        {
          user_id: userId,
          org_id: orgId || undefined,
          event_type: 'account_unlocked',
          success: true,
          reason: reason || 'Account unlocked by administrator',
          metadata: {
            unlocked_by: unlockedBy,
          },
        },
        ipAddress,
        userAgent
      );
    } catch (error) {
      console.error('Error in unlockAccount:', error);
      throw error;
    }
  }

  /**
   * Reset failed login attempts (on successful login)
   */
  static async resetFailedAttempts(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const orgId = await this.getUserOrgId(userId);

      const { error } = await supabase.rpc('reset_failed_login_attempts', {
        _user_id: userId,
      });

      if (error) {
        console.error('Error resetting failed attempts:', error);
        // Don't throw - this is not critical
        return;
      }

      // Log successful login
      await AuthLogger.log(
        {
          user_id: userId,
          org_id: orgId || undefined,
          event_type: 'login_success',
          success: true,
        },
        ipAddress,
        userAgent
      );
    } catch (error) {
      console.error('Error in resetFailedAttempts:', error);
      // Don't throw - this is not critical
    }
  }
}

