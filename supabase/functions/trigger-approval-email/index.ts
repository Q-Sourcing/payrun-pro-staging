import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
    ;

// Payload from Supabase Database Webhook
interface WebhookPayload {
    type: 'INSERT' | 'UPDATE';
    table: string;
    schema: string;
    record: any;
    old_record: any;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const payload = await req.json() as WebhookPayload;

        // We expect this to be triggered by payrun_approval_steps INSERT/UPDATE
        // OR pay_runs UPDATE

        const { table, record, type } = payload;
        let eventKey = '';
        let recipientUserId = '';
        let payrunId = '';
        let variables: Record<string, string> = {};

        console.log(`Processing trigger: ${table} ${type}`);

        // LOGIC ROUTER
        if (table === 'payrun_approval_steps') {
            // CASE: New Step Created/Activated (Pending) -> Notify Approver
            if (record.status === 'pending') {
                eventKey = 'PAYRUN_SUBMITTED'; // Using generic key for approval request
                recipientUserId = record.approver_user_id;
                payrunId = record.payrun_id;

                // Should skipping notification if this is just a re-notify? 
                // The trigger should only fire on status change to pending.
            } else if (record.status === 'rejected') {
                // Rejection handled at pay_run level usually, but we can catch it here too
                // But let's rely on pay_runs update for rejection to avoid duplicate emails
                return new Response(JSON.stringify({ skipped: true, reason: 'handled_elsewhere' }), { status: 200, headers: corsHeaders });
            } else {
                return new Response(JSON.stringify({ skipped: true, reason: 'status_ignored' }), { status: 200, headers: corsHeaders });
            }
        }
        else if (table === 'pay_runs') {
            payrunId = record.id;

            if (record.status === 'rejected' && payload.old_record.status !== 'rejected') {
                eventKey = 'PAYRUN_REJECTED';
                recipientUserId = record.created_by; // Notify creator
            }
            else if (record.status === 'locked' && payload.old_record.status !== 'locked' && record.approval_status === 'approved') {
                eventKey = 'PAYRUN_APPROVED';
                recipientUserId = record.created_by; // Notify creator
            } else {
                return new Response(JSON.stringify({ skipped: true, reason: 'payrun_status_ignored' }), { status: 200, headers: corsHeaders });
            }
        }
        else if (table === 'notifications') {
            recipientUserId = record.user_id;

            if (record.type === 'approval_request') {
                eventKey = 'PAYRUN_SUBMITTED';
                // Try to extract payrun_id from metadata if available, else generic
                if (record.metadata?.payrun_id) {
                    payrunId = record.metadata.payrun_id;
                }
            } else if (record.type === 'security_alert') {
                eventKey = 'SECURITY_ALERT';
            } else if (record.type === 'account_locked') {
                eventKey = 'ACCOUNT_LOCKED';
            } else {
                return new Response(JSON.stringify({ skipped: true, reason: 'notification_type_ignored' }), { status: 200, headers: corsHeaders });
            }
        }
        else {
            return new Response(JSON.stringify({ skipped: true, reason: 'table_ignored' }), { status: 200, headers: corsHeaders });
        }

        if (!eventKey || !recipientUserId) {
            return new Response(JSON.stringify({ skipped: true, reason: 'missing_data' }), { status: 200, headers: corsHeaders });
        }

        // HYDRATE DATA
        // 1. Get Recipient Email & Name
        const { data: userProfile, error: userError } = await supabase
            .from('profiles') // Assuming 'profiles' or 'users' table exists as per context
            .select('email, first_name, last_name')
            .eq('id', recipientUserId)
            .single();

        // Fallback to auth.users if profiles not found? 
        // Edge function context: cannot access auth.users directly easily without admin API.
        // Assuming profiles public/accessible or we are admin. We are admin (service role).
        // Actually standard supabase is storage in `auth.users` but usually mirrored to `public.profiles`.
        // Let's try `public.user_profiles` which was mentioned in previous context (summary).

        let email = userProfile?.email;
        let name = userProfile?.first_name ? `${userProfile.first_name} ${userProfile.last_name}` : 'User';

        if (!email) {
            // Try getting from auth admin (reliable)
            const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(recipientUserId);
            if (authError || !authUser) {
                console.error('User not found:', recipientUserId);
                return new Response(JSON.stringify({ error: 'User not found' }), { status: 400, headers: corsHeaders });
            }
            email = authUser.user.email;
            if (!name || name === 'User') name = email?.split('@')[0] || 'User';
        }

        // 2. Get Payrun Details
        const { data: payrun } = await supabase
            .from('pay_runs')
            .select('*') // join pay_groups?
            .eq('id', payrunId)
            .single();

        if (!payrun) throw new Error('Payrun not found');

        // 3. Get Organization for templates
        const { data: payGroup } = await supabase.from('pay_groups')
            .select('organization:organizations(id, name)')
            .eq('id', payrun.pay_group_id)
            .single();

        const orgId = payGroup?.organization?.id;
        const orgName = payGroup?.organization?.name || 'Organization';

        // 4. Build Variables
        // Common vars
        variables['period'] = payrun.period_start + ' to ' + payrun.period_end;
        variables['payrun_id'] = payrunId;
        variables['organization_name'] = orgName;
        variables['action_url'] = `${Deno.env.get('APP_URL') || 'https://payroll.flipafrica.app'}/payruns/${payrunId}`;

        if (name) variables['approver_name'] = name;
        if (name) variables['employee_name'] = name;
        if (name) variables['user_name'] = name;

        if (eventKey === 'PAYRUN_SUBMITTED') {
            const { data: submitter } = await supabase.from('profiles').select('first_name, last_name').eq('id', payrun.approval_submitted_by).single();
            variables['submitted_by'] = submitter ? `${submitter.first_name} ${submitter.last_name}` : 'Unknown';
        }

        if (eventKey === 'PAYRUN_REJECTED') {
            // Need rejector name & reason
            const { data: step } = await supabase.from('payrun_approval_steps').select('actioned_by, comments').eq('payrun_id', payrunId).eq('status', 'rejected').order('actioned_at', { ascending: false }).limit(1).single();
            if (step) {
                const { data: rejector } = await supabase.from('profiles').select('first_name, last_name').eq('id', step.actioned_by).single();
                variables['rejected_by'] = rejector ? `${rejector.first_name} ${rejector.last_name}` : 'Approver';
                variables['reason'] = step.comments || 'No reason provided';
            }
        }

        if (eventKey === 'PAYRUN_APPROVED') {
            variables['approved_by'] = 'Final Approver'; // simplification
        }

        // 5. Queue Email
        const queueResponse = await fetch(`${supabaseUrl}/functions/v1/queue-email`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                org_id: orgId,
                event_key: eventKey,
                recipient_email: email,
                recipient_name: name,
                variables: variables
            })
        });

        const queueResult = await queueResponse.json();

        return new Response(JSON.stringify({ success: true, queue_result: queueResult }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        console.error('Trigger Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
