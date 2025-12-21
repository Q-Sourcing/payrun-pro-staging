const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
    const migrationFile = process.argv[2];
    if (!migrationFile) {
        console.error('❌ Please specify a migration file (relative to project root)');
        process.exit(1);
    }

    try {
        let sql;
        if (process.argv[2] === '-e') {
            sql = process.argv[3];
            if (!sql) {
                console.error('❌ Please specify SQL string after -e');
                process.exit(1);
            }
            console.log('🚀 Executing inline SQL...');
        } else {
            const filePath = path.resolve(migrationFile);
            console.log(`📖 Reading migration file: ${filePath}`);
            sql = fs.readFileSync(filePath, 'utf8');
            console.log('🚀 Executing migration...');
        }

        // Split SQL into blocks by BEGIN/COMMIT or just run as one if it's a script
        // For safety with RPC limits, we split by ';' but preserve BEGIN/COMMIT blocks?
        // Actually, exec_sql usually handles multi-statement if it's within a transaction.

        const { data, error } = await supabase.rpc('exec_sql', { sql });

        if (error) {
            console.error('❌ Error executing migration:', error.message);
            process.exit(1);
        }

        if (data !== undefined) {
            console.log('📊 Query Results (RAW):', JSON.stringify(data, null, 2));
            if (Array.isArray(data)) {
                console.table(data);
            }
        }

        console.log('✅ Migration executed successfully!');
    } catch (err) {
        console.error('❌ Fatal error:', err.message);
        process.exit(1);
    }
}

runMigration();
