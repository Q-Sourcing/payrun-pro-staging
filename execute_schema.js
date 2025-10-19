const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSchema() {
  try {
    console.log('Reading schema file...');
    const schemaSQL = fs.readFileSync('./complete_schema_migration.sql', 'utf8');
    
    console.log('Executing schema...');
    const { data, error } = await supabase.rpc('exec_sql', { sql: schemaSQL });
    
    if (error) {
      console.error('Error executing schema:', error);
      return;
    }
    
    console.log('Schema executed successfully!');
  } catch (err) {
    console.error('Error:', err);
  }
}

executeSchema();
