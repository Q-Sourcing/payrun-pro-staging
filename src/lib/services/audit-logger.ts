import { supabase } from '@/integrations/supabase/client';
import { ORG_SUPER_ADMIN, AuditLog } from '@/lib/types/roles';
import { JWTClaimsService } from './auth/jwt-claims';

export class AuditLogger {
    /**
     * Log a privileged action or general activity
     */
    static async log(
        action: string,
        resource: string,
        details: Record<string, any> = {},
        metadata: Record<string, any> = {}
    ): Promise<void> {
        try {
            const userContext = JWTClaimsService.getCurrentUserContext();
            if (!userContext) return; // Should not happen for logged-in actions

            const isPrivileged = userContext.role === ORG_SUPER_ADMIN || userContext.role === 'super_admin';

            const logEntry = {
                user_id: userContext.userId,
                org_id: userContext.organizationId, // Assuming context has orgId
                action,
                resource,
                details,
                metadata: {
                    ...metadata,
                    privileged: isPrivileged,
                    role: userContext.role
                },
                timestamp: new Date().toISOString(),
                ip_address: null, // Would need to capture this from edge function or client context
                user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null
            };

            // Ensure the table exists. Using 'activity_logs' as per existing schema.
            const { error } = await supabase
                .from('activity_logs')
                .insert(logEntry);

            if (error) {
                console.error('Failed to write audit log:', error);
            }
        } catch (err) {
            console.error('Error in AuditLogger:', err);
        }
    }

    static async logPrivilegedAction(action: string, resource: string, details: Record<string, any> = {}) {
        await this.log(action, resource, details, { privileged_explicit: true });
    }
}
