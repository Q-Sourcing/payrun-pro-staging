// Quick environment test script
console.log('🔍 Testing Environment Detection...');
console.log('');

// Simulate Vite environment variables
process.env.VITE_SUPABASE_URL = 'https://sbphmrjoappwlervnbtm.supabase.co';
process.env.NEXT_PUBLIC_ENV = 'staging';
process.env.NODE_ENV = 'staging';

console.log('Environment Variables:');
console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL);
console.log('NEXT_PUBLIC_ENV:', process.env.NEXT_PUBLIC_ENV);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('');

// Test environment detection logic
function getEnvironmentLabel() {
  const explicitEnv = process.env.NEXT_PUBLIC_ENV || process.env.NODE_ENV;
  if (explicitEnv === 'production') return "PRODUCTION";
  if (explicitEnv === 'staging') return "STAGING";
  
  const url = process.env.VITE_SUPABASE_URL || "";
  if (url.includes("kctwfgbjmhnfqtxhagib")) return "PRODUCTION";
  if (url.includes("sbphmrjoappwlervnbtm")) return "STAGING";
  
  return "LOCAL";
}

const envLabel = getEnvironmentLabel();
console.log('✅ Detected Environment:', envLabel);
console.log('');

// Test colors and icons
function getEnvironmentColor(label) {
  switch (label) {
    case "PRODUCTION": return "bg-red-600 text-white";
    case "STAGING": return "bg-yellow-400 text-black";
    default: return "bg-gray-400 text-black";
  }
}

function getEnvironmentIcon(label) {
  switch (label) {
    case "PRODUCTION": return "🚀";
    case "STAGING": return "🧪";
    default: return "💻";
  }
}

console.log('Environment Badge:');
console.log('Icon:', getEnvironmentIcon(envLabel));
console.log('Color:', getEnvironmentColor(envLabel));
console.log('Label:', envLabel);
console.log('');
console.log('🎉 Environment detection test completed!');
