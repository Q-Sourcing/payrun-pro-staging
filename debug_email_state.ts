
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

async function debugEmail() {
    const targetUserId = "58d7746d-6879-4fc1-8945-6c5b1eec83fb";
    const notificationRecord = {
        "id": "5ccc71ae-f603-4538-8bd3-103bb7b60d0a",
        "user_id": targetUserId,
        "type": "approval_request",
        "title": "Payrun Approval Required",
        "message": "A payrun requires your approval (Level 1).",
        "read_at": null,
        "metadata": {
            "type": "payroll_approval",
            "payrun_id": "7858a9f0-0558-4ccf-a5d1-6f58e04b505c"
        },
        "created_at": new Date().toISOString()
    };

    console.log(`Checking User: ${targetUserId}`);

    // 1. Check User Email
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(targetUserId);
    if (userError || !user?.user) {
        console.error("User lookup failed:", userError);

        // Try public profile
        const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', targetUserId).single();
        console.log("Public Profile:", profile);
    } else {
        console.log(`User Found: ${user.user.email}`);
    }

    // 2. Invoke Function
    console.log("Invoking trigger-approval-email...");
    const { data, error } = await supabase.functions.invoke('trigger-approval-email', {
        body: {
            type: 'INSERT',
            table: 'notifications',
            schema: 'public',
            record: notificationRecord,
            old_record: null
        }
    });

    if (error) {
        console.error("Function Invocation Error:", error);
        try {
            if (error.context) {
                const context = await error.context.json();
                console.error("Context:", context);
            }
        } catch (e) { }
    } else {
        console.log("Function Response:", data);
    }
}

debugEmail();
