import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Interface for the request body
interface SendEmailRequest {
    outbox_id: string; // The ID of the email_outbox record to process
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
        if (!RESEND_API_KEY) {
            throw new Error('RESEND_API_KEY is not set');
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        const resend = new Resend(RESEND_API_KEY);

        const { outbox_id } = await req.json() as SendEmailRequest;

        if (!outbox_id) {
            throw new Error('outbox_id is required');
        }

        // 1. Fetch the email from outbox
        const { data: emailRecord, error: fetchError } = await supabase
            .from('email_outbox')
            .select('*')
            .eq('id', outbox_id)
            .single();

        if (fetchError || !emailRecord) {
            throw new Error(`Email record not found: ${fetchError?.message}`);
        }

        // 2. Fetch Platform Settings (for Sender Identity)
        const { data: platformSettings } = await supabase
            .from('platform_email_settings')
            .select('*')
            .single();

        // Determine Sender
        // TODO: Add logic for Tenant Custom Sender if allowed
        const fromEmail = platformSettings?.default_from_email || 'no-reply@payroll.flipafrica.app';
        const fromName = platformSettings?.default_from_name || 'PayRun Pro';
        const sender = `${fromName} <${fromEmail}>`;

        // 3. Send via Resend
        // Update status to processing
        await supabase
            .from('email_outbox')
            .update({ status: 'processing' })
            .eq('id', outbox_id);

        const { data: resendData, error: resendError } = await resend.emails.send({
            from: sender,
            to: [emailRecord.recipient_email],
            subject: emailRecord.subject,
            html: emailRecord.body_html,
        });

        if (resendError) {
            // Mark as failed
            console.error('Resend Error:', resendError);
            await supabase
                .from('email_outbox')
                .update({
                    status: 'failed',
                    error_message: JSON.stringify(resendError),
                    retry_count: emailRecord.retry_count + 1,
                    next_retry_at: new Date(Date.now() + 1000 * 60 * 5).toISOString() // Retry in 5 mins
                })
                .eq('id', outbox_id);

            return new Response(JSON.stringify({ error: resendError }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 4. Mark as Sent
        await supabase
            .from('email_outbox')
            .update({
                status: 'sent',
                provider_msg_id: resendData?.id,
                sent_at: new Date().toISOString()
            })
            .eq('id', outbox_id);

        return new Response(JSON.stringify({ success: true, id: resendData?.id }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        console.error('Error processing email:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
