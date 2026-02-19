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
          // Only show non-sensitive keys
          if (key.trim().includes('URL') || key.trim().includes('ENV') || key.trim().includes('NODE_ENV') || key.trim().includes('PROJECT_ID')) {
            console.log('  ', key.trim(), '=', value);
          } else {
            console.log('  ', key.trim(), '= [REDACTED]');
          }
        }
      }
    }
  }
}

console.log('\n=== Final Results ===');
console.log('VITE_SUPABASE_URL:', envVars.VITE_SUPABASE_URL || 'not set');
console.log('NODE_ENV:', envVars.NODE_ENV || 'not set');
