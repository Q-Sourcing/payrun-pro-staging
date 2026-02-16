// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';
import { JWTClaimsService } from './auth/jwt-claims';

export class AuditLogger {
    /**
     * Log a privileged action or general activity
     */
    static async log(
        action: string,
        resourceType: string,
        details: Record<string, any> = {},
        metadata: Record<string, any> = {},
        resourceId?: string
    ): Promise<void> {
        if (!action || !resourceType) {
            console.error('AuditLogger: action and resourceType are required');
            return;
        }

        try {
            const userContext = JWTClaimsService.getCurrentUserContext();
            if (!userContext) {
                console.warn('AuditLogger: No user context found, skipping log.');
                return;
            }

            const isPrivileged = userContext.isPlatformAdmin || userContext.roles.some(r => ['PLATFORM_SUPER_ADMIN', 'ORG_ADMIN', 'ORG_HR_ADMIN', 'ORG_FINANCE_CONTROLLER'].includes(r.role));

            // Merge metadata into details as per schema
            const fullDetails = {
                ...details,
                _metadata: {
                    ...metadata,
                    privileged: isPrivileged,
                    roles: userContext.roles.map(r => r.role)
                }
            };

            const logEntry = {
                user_id: userContext.userId,
                organization_id: userContext.organizationId,
                action,
                resource_type: resourceType,
                resource_id: resourceId || null,
                details: fullDetails,
                ip_address: null, // Capture if possible in future
                user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
                created_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('activity_logs')
                .insert(logEntry);

            if (error) {
                console.error('AuditLogger: PostgREST Error:', {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code
                });
            }
        } catch (err) {
            console.error('AuditLogger: Unexpected Error:', err);
        }
    }

    static async logPrivilegedAction(action: string, resourceType: string, details: Record<string, any> = {}, resourceId?: string) {
        await this.log(action, resourceType, details, { privileged_explicit: true }, resourceId);
    }
}
