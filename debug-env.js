const { readFileSync, existsSync } = require('fs');

console.log('=== Environment Variable Debug ===');

const envFiles = ['.env', '.env.staging', '.env.production'];
const envVars = {};

for (const envFile of envFiles) {
  if (existsSync(envFile)) {
    console.log('\nReading:', envFile);
    const content = readFileSync(envFile, 'utf8');
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
          envVars[key.trim()] = value;
          console.log('  ', key.trim(), '=', value);
        }
      }
    }
  }
}

console.log('\n=== Final Results ===');
console.log('VITE_SUPABASE_URL:', envVars.VITE_SUPABASE_URL);
console.log('NODE_ENV:', envVars.NODE_ENV);

// Extract project ref
if (envVars.VITE_SUPABASE_URL) {
  const match = envVars.VITE_SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
  console.log('Project Ref:', match ? match[1] : 'not found');
}
