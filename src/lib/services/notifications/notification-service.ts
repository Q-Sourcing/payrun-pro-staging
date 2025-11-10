import { supabase } from '@/integrations/supabase/client';

export type NotificationType =
  | 'security_alert'
  | 'account_locked'
  | 'account_unlocked'
  | 'login_alert'
  | 'system_update'
  | 'payroll_alert'
  | 'approval_request'
  | 'general';

export interface Notification {
  id?: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  read_at?: string | null;
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface EmailNotification {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

/**
 * NotificationService
 * Handles email and in-app notifications
 */
export class NotificationService {
  private static readonly RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
  private static readonly FROM_EMAIL = 'Q-Payroll Security <security@payrunpro.com>';

  /**
   * Send email notification using Resend API
   */
  static async sendEmail(email: EmailNotification): Promise<boolean> {
    try {
      // In client-side, we'll call Edge Function for email sending
      // This method is primarily for Edge Functions
      if (typeof window !== 'undefined') {
        // Client-side: delegate to Edge Function
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          console.error('No session token for email sending');
          return false;
        }

        const response = await fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(email),
        });

        return response.ok;
      }

      // Server-side (Edge Function)
      if (!this.RESEND_API_KEY) {
        console.error('RESEND_API_KEY not configured');
        return false;
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: email.from || this.FROM_EMAIL,
          to: Array.isArray(email.to) ? email.to : [email.to],
          subject: email.subject,
          html: email.html,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Resend API error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  /**
   * Create in-app notification
   */
  static async createInAppNotification(notification: Notification): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: notification.user_id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          metadata: notification.metadata || {},
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating notification:', error);
        return null;
      }

      return data?.id || null;
    } catch (error) {
      console.error('Error in createInAppNotification:', error);
      return null;
    }
  }

  /**
   * Notify admins when an account is locked
   */
  static async notifyAdminsOnLockout(
    lockedUserId: string,
    lockedUserEmail: string,
    lockedUserName: string,
    orgId: string | null,
    reason: string
  ): Promise<void> {
    try {
      // Get platform admins
      const { data: platformAdmins } = await supabase
        .from('user_roles')
        .select('user_id, profiles!inner(email, first_name, last_name)')
        .eq('role', 'platform_admin');

      // Get org super admins for the organization
      let orgAdmins: any[] = [];
      if (orgId) {
        const { data: orgAdminsData } = await supabase
          .from('user_roles')
          .select('user_id, profiles!inner(email, first_name, last_name, organization_id)')
          .eq('role', 'org_super_admin')
          .eq('profiles.organization_id', orgId);

        orgAdmins = orgAdminsData || [];
      }

      // Combine all admin emails
      const adminEmails: string[] = [];
      const adminUserIds: string[] = [];

      (platformAdmins || []).forEach((admin: any) => {
        if (admin.profiles?.email) {
          adminEmails.push(admin.profiles.email);
          adminUserIds.push(admin.user_id);
        }
      });

      orgAdmins.forEach((admin: any) => {
        if (admin.profiles?.email && !adminEmails.includes(admin.profiles.email)) {
          adminEmails.push(admin.profiles.email);
          adminUserIds.push(admin.user_id);
        }
      });

      if (adminEmails.length === 0) {
        console.warn('No admins found to notify');
        return;
      }

      // Check if email alerts are enabled for the organization
      let emailAlertsEnabled = true;
      if (orgId) {
        const { data: settings } = await supabase
          .from('organization_security_settings')
          .select('email_alerts_enabled')
          .eq('org_id', orgId)
          .single();

        emailAlertsEnabled = settings?.email_alerts_enabled !== false;
      }

      // Send email notifications
      if (emailAlertsEnabled && adminEmails.length > 0) {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <h2 style="color: #721c24; margin: 0 0 10px 0;">🔒 Account Locked - Security Alert</h2>
            </div>
            
            <div style="background: #f8f9fa; border-radius: 8px; padding: 20px;">
              <h3 style="margin-top: 0;">Account Lockout Details</h3>
              <p><strong>User:</strong> ${lockedUserName} (${lockedUserEmail})</p>
              <p><strong>Reason:</strong> ${reason}</p>
              <p><strong>Locked At:</strong> ${new Date().toLocaleString()}</p>
              ${orgId ? `<p><strong>Organization ID:</strong> ${orgId}</p>` : ''}
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background: #e7f3ff; border-radius: 8px;">
              <p style="margin: 0;"><strong>Action Required:</strong> Please review the account lockout and unlock if necessary.</p>
            </div>
          </div>
        `;

        await this.sendEmail({
          to: adminEmails,
          subject: `🔒 Account Locked: ${lockedUserEmail}`,
          html: emailHtml,
        });
      }

      // Create in-app notifications for all admins
      const notificationPromises = adminUserIds.map((adminId) =>
        this.createInAppNotification({
          user_id: adminId,
          type: 'account_locked',
          title: 'Account Locked',
          message: `Account for ${lockedUserName} (${lockedUserEmail}) has been locked. Reason: ${reason}`,
          metadata: {
            locked_user_id: lockedUserId,
            locked_user_email: lockedUserEmail,
            locked_user_name: lockedUserName,
            org_id: orgId,
            reason: reason,
          },
        })
      );

      await Promise.all(notificationPromises);
    } catch (error) {
      console.error('Error notifying admins on lockout:', error);
      // Don't throw - notification failure shouldn't break the lockout process
    }
  }

  /**
   * Get user notifications
   */
  static async getUserNotifications(
    userId: string,
    options: { unreadOnly?: boolean; limit?: number } = {}
  ): Promise<Notification[]> {
    const { unreadOnly = false, limit = 50 } = options;

    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (unreadOnly) {
        query = query.is('read_at', null);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching notifications:', error);
        throw error;
      }

      return (data || []) as Notification[];
    } catch (error) {
      console.error('Error in getUserNotifications:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('read_at', null);

      if (error) {
        console.error('Error getting unread count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getUnreadCount:', error);
      return 0;
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', userId)
        .is('read_at', null);

      if (error) {
        console.error('Error marking notification as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in markAsRead:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('mark_all_notifications_read', {
        _user_id: userId,
      });

      if (error) {
        console.error('Error marking all as read:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
      return 0;
    }
  }
}

