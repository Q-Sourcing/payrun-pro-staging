const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
    console.error('Need: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function deployOBAC() {
    try {
        console.log('📖 Reading OBAC schema file...');
        const obacSQL = fs.readFileSync('./deploy_obac_manual.sql', 'utf8');

        console.log('🚀 Deploying OBAC schema to database...');
        console.log('   (This may take a moment...)');

        // Split SQL into statements and execute them one by one
        const statements = obacSQL
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;

        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i] + ';';

            // Skip comments
            if (stmt.trim().startsWith('--')) continue;

            try {
                const { error } = await supabase.rpc('exec_sql', { sql: stmt });

                if (error) {
                    // Check if it's a benign "already exists" error
                    if (error.message && (
                        error.message.includes('already exists') ||
                        error.message.includes('duplicate key value')
                    )) {
                        skipCount++;
                        console.log(`⚠️  Statement ${i + 1}/${statements.length}: Already exists (skipping)`);
                    } else {
                        errorCount++;
                        console.error(`❌ Error in statement ${i + 1}:`, error.message);
                    }
                } else {
                    successCount++;
                    if ((i + 1) % 10 === 0) {
                        console.log(`✅ Progress: ${i + 1}/${statements.length} statements`);
                    }
                }
            } catch (err) {
                errorCount++;
                console.error(`❌ Exception in statement ${i + 1}:`, err.message);
            }
        }

        console.log('\n📊 Deployment Summary:');
        console.log(`   ✅ Success: ${successCount}`);
        console.log(`   ⚠️  Skipped: ${skipCount}`);
        console.log(`   ❌ Errors: ${errorCount}`);

        if (errorCount === 0) {
            console.log('\n🎉 OBAC schema deployed successfully!');
            console.log('   The rbac_assignments table should now be available.');
        } else {
            console.log('\n⚠️  Deployment completed with some errors.');
            console.log('   Check the errors above to see if they are critical.');
        }

    } catch (err) {
        console.error('❌ Fatal error:', err);
        process.exit(1);
    }
}

deployOBAC();
