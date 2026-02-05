import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
    ;

// Interface for request
interface QueueEmailRequest {
    org_id?: string; // Optional (system emails have no org)
    event_key: string;
    recipient_email: string;
    recipient_name?: string;
    variables: Record<string, string>;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { org_id, event_key, recipient_email, recipient_name, variables } = await req.json() as QueueEmailRequest;

        if (!event_key || !recipient_email) {
            throw new Error('Missing required fields: event_key, recipient_email');
        }

        // 1. Check Triggers (if Org ID present)
        // If tenant disabled this notification, skip
        if (org_id) {
            const { data: trigger } = await supabase
                .from('email_triggers')
                .select('is_enabled')
                .eq('org_id', org_id)
                .eq('event_key', event_key)
                .single();

            // If trigger record exists and is disabled -> Skip
            // If no record exists -> Default is Enabled (from schema default)
            if (trigger && trigger.is_enabled === false) {
                console.log(`Email suppressed: Trigger disabled for ${event_key} in org ${org_id}`);
                return new Response(JSON.stringify({ skipped: true, reason: 'disabled_by_tenant' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200
                });
            }
        }

        // 2. Resolve Template
        // Hierarchy: Tenant Override (org_id + event_key) -> Platform Default (null + event_key)
        let templateQuery = supabase
            .from('email_templates')
            .select('*')
            .eq('event_key', event_key)
            .eq('is_active', true);

        if (org_id) {
            // Try to match org specific OR default
            // We order by org_id nulls last? No, we want non-null first.
            // Easier: fetch both, pick best in code.
            const { data: templates } = await templateQuery.or(`org_id.eq.${org_id},org_id.is.null`);

            if (!templates || templates.length === 0) {
                throw new Error(`No template found for event ${event_key}`);
            }

            // Find org specific override
            var template = templates.find((t: any) => t.org_id === org_id);
            // Fallback to default
            if (!template) template = templates.find((t: any) => t.org_id === null);

        } else {
            // Platform email (no org)
            const { data: templates } = await templateQuery.is('org_id', null);
            var template = templates?.[0];
        }

        if (!template) {
            throw new Error(`No active template found for event ${event_key}`);
        }

        // 3. Hydrate Template
        let subject = template.subject_template;
        let body = template.body_html_template;

        // Replace variables
        // Simple {{key}} replacement
        Object.entries(variables).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            subject = subject.replace(regex, value);
            body = body.replace(regex, value);
        });

        // Also inject generic ones if passed? For now strict.

        // 4. Insert into Outbox
        const { data: outboxEntry, error: insertError } = await supabase
            .from('email_outbox')
            .insert({
                org_id: org_id || null,
                event_key: event_key,
                recipient_email: recipient_email,
                recipient_name: recipient_name || null,
                subject: subject,
                body_html: body,
                status: 'pending' // Initially pending
            })
            .select('id')
            .single();

        if (insertError) throw insertError;

        // 5. Trigger Sending (Async)
        // We invoke send-email immediately to process it
        // Don't wait for it to finish to return response to caller (fire and forget? or wait?)
        // For reliability users might prefer 'queued' response.
        // But let's trigger it.

        // Non-blocking invoke?
        EdgeRuntime.waitUntil(
            fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ outbox_id: outboxEntry.id })
            })
        );

        return new Response(JSON.stringify({ success: true, outbox_id: outboxEntry.id }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        console.error('Error queuing email:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
