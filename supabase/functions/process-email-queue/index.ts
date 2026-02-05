import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
    ;

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // 1. Fetch Pending or Failed (Retryable) emails
        const now = new Date().toISOString();

        // Determine failed items ripe for retry
        // Status = 'failed' AND retry_count < 3 AND next_retry_at <= now
        // Also grab 'pending' that might have been stuck? Or just leave 'pending' to invalid call?
        // 'pending' should be picked up instantly by queue-email invoke. 
        // If that fails (e.g. edge function timeout), it stays pending.
        // So pick up 'pending' created > 5 mins ago? 
        // Simplify: Pick 'failed' that are due.

        const { data: retryItems, error } = await supabase
            .from('email_outbox')
            .select('id')
            .eq('status', 'failed')
            .lt('retry_count', 3)
            .lte('next_retry_at', now)
            .limit(20); // Batch size

        if (error) throw error;

        const results = {
            processed: 0,
            errors: 0
        };

        if (retryItems && retryItems.length > 0) {
            // Process each
            for (const item of retryItems) {
                try {
                    // Re-trigger send-email
                    // We use waiting fetch to update stats properly
                    await fetch(`${supabaseUrl}/functions/v1/send-email`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${supabaseKey}`, // Service Role
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ outbox_id: item.id })
                    });
                    results.processed++;
                } catch (e) {
                    console.error(`Failed to re-trigger item ${item.id}`, e);
                    results.errors++;
                }
            }
        }

        return new Response(JSON.stringify({ success: true, ...results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
