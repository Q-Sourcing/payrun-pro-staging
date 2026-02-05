
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugEmailHack() {
    const targetUserId = "58d7746d-6879-4fc1-8945-6c5b1eec83fb";
    const payrunId = "7858a9f0-0558-4ccf-a5d1-6f58e04b505c"; // From previous debug output

    console.log(`Testing Mock Payload for User: ${targetUserId}`);

    // Construct a fake 'payrun_approval_steps' record
    // The Edge Function expects: { status: 'pending', approver_user_id, payrun_id }
    const mockRecord = {
        status: 'pending',
        approver_user_id: targetUserId,
        payrun_id: payrunId
    };

    console.log("Invoking trigger-approval-email with MOCK payrun_approval_steps payload...");

    const { data, error } = await supabase.functions.invoke('trigger-approval-email', {
        body: {
            type: 'INSERT',
            table: 'payrun_approval_steps', // LIE to the function
            schema: 'public',
            record: mockRecord,
            old_record: null
        }
    });

    if (error) {
        console.error("Function Invocation Error:", error);
    } else {
        console.log("Function Response:", data);
    }
}

debugEmailHack();
