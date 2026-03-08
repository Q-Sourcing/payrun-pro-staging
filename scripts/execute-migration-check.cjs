const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing credentials in .env.local");
  process.exit(1);
}
const supabase = createClient(url, key, { db: { schema: 'supabase_migrations' } });

async function check() {
  const ids = [
    '20260308122934',
    '20260308124547',
    '20260308125418',
    '20260308130138',
    '20260308131715'
  ];
  const { data, error } = await supabase.from('schema_migrations').select('version').in('version', ids);
  if (error) {
    console.error('Error querying schema_migrations:', error.message);
    
    // Fallback: Use pg client if we have a connection string, or try default schema with explicit table
    console.log('Trying alternative approach...');
    const sb2 = createClient(url, key);
    const { data: d2, error: e2 } = await sb2.from('supabase_migrations.schema_migrations').select('version');
    if (e2) console.error('Error 2:', e2.message);
    else {
      const found = d2.filter(row => ids.includes(row.version)).map(row => row.version);
      console.log('Found via fallback:', found);
    }
  } else {
    console.log('Found migrations:');
    ids.forEach(id => {
      const isFound = data.some(d => d.version === id);
      console.log(`- ${id}: ${isFound ? '✅ Present' : '❌ Missing'}`);
    });
  }
}
check();
