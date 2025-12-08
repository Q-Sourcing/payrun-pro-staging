/**
 * Audit Logger Utility
 * 
 * Provides a reusable function for logging audit events to the audit_logs table.
 * Handles errors gracefully to ensure audit logging failures don't break main operations.
 */

interface AuditEvent {
  user_id: string;
  action: string;
  resource: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  result: 'success' | 'failure' | 'denied';
}

/**
 * Logs an audit event to the database
 * @param supabaseAdmin - Supabase admin client
 * @param event - Audit event data
 * @returns Promise that resolves when logging is complete (or fails silently)
 */
export async function logAuditEvent(
  supabaseAdmin: any,
  event: AuditEvent
): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: event.user_id,
        action: event.action,
        resource: event.resource,
        details: event.details || {},
        ip_address: event.ip_address || null,
        user_agent: event.user_agent || null,
        timestamp: new Date().toISOString(),
        result: event.result,
      })

    if (error) {
      // Log error but don't throw - audit logging should never break main operations
      console.error('Failed to log audit event:', error)
    }
  } catch (error) {
    // Catch any unexpected errors and log them
    console.error('Unexpected error in audit logging:', error)
  }
}

/**
 * Extracts IP address from request headers
 * Handles various proxy headers (X-Forwarded-For, X-Real-IP, etc.)
 */
export function extractIpAddress(req: Request): string | undefined {
  // Check X-Forwarded-For header (first IP in chain)
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map(ip => ip.trim())
    return ips[0] || undefined
  }

  // Check X-Real-IP header
  const realIp = req.headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }

  // Fallback to CF-Connecting-IP (Cloudflare) or other headers
  const cfIp = req.headers.get('cf-connecting-ip')
  if (cfIp) {
    return cfIp.trim()
  }

  return undefined
}

/**
 * Extracts user agent from request headers
 */
export function extractUserAgent(req: Request): string | undefined {
  return req.headers.get('user-agent') || undefined
}

