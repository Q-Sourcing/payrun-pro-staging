import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from "resend";
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Authorization required' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Authenticate user
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Authorization: check platform_admins table (server-side, not client metadata)
        const { data: admin, error: adminError } = await supabase
            .from('platform_admins')
            .select('id, allowed')
            .eq('email', user.email)
            .maybeSingle();

        if (adminError || !admin || !admin.allowed) {
            return new Response(JSON.stringify({ error: 'Insufficient permissions. Admin access required.' }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Parse and validate request
        const { to_email, subject, body_html } = await req.json();

        if (!to_email || typeof to_email !== 'string' || !to_email.includes('@')) {
            return new Response(JSON.stringify({ error: 'Valid email address required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Configure Resend (system key only — no user-supplied API keys)
        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        if (!resendApiKey) {
            return new Response(JSON.stringify({ error: 'Email service not configured' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const resend = new Resend(resendApiKey);

        const { data, error } = await resend.emails.send({
            from: 'Test Sender <no-reply@payroll.flipafrica.app>',
            to: [to_email],
            subject: `[TEST] ${subject || 'Test Email'}`,
            html: body_html || '<p>This is a test email from PayRun Pro.</p>',
        });

        if (error) {
            console.error('Resend error:', error);
            return new Response(JSON.stringify({ success: false, error: 'Failed to send email' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ success: true, data }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        console.error('send-test-email error:', error.message);
        return new Response(JSON.stringify({ error: 'An error occurred processing your request' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
