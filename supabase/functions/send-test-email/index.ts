import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // 1. Verify User is Admin (Platform or Org)
        // We need the user's auth token
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            throw new Error('Unauthorized');
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!; // Use service role for admin checks
        const supabase = createClient(supabaseUrl, supabaseKey);
        // Client for auth check
        const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
            global: { headers: { Authorization: authHeader } }
        });

        const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
        if (authError || !user) throw new Error('Unauthorized');

        // 2. Parse Request
        const { to_email, subject, body_html, provider_config } = await req.json();

        // 3. Configure Resend (Use passed config or system default)
        let resendApiKey = Deno.env.get('RESEND_API_KEY');

        // If testing custom provider config (optional feature for platform admin)
        if (provider_config?.api_key) {
            resendApiKey = provider_config.api_key;
        }

        if (!resendApiKey) throw new Error('Resend API Key missing');

        const resend = new Resend(resendApiKey);

        // 4. Send Test Email
        const { data, error } = await resend.emails.send({
            from: 'Test Sender <no-reply@payroll.flipafrica.app>', // Or make configurable
            to: [to_email],
            subject: `[TEST] ${subject || 'Test Email'}`,
            html: body_html || '<p>This is a test email from PayRun Pro.</p>',
        });

        if (error) {
            return new Response(JSON.stringify({ success: false, error }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ success: true, data }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400, // Bad Request or Unauthorized
        });
    }
});
