// Test environment detection
export function testEnvironmentDetection() {
  console.log('🔍 Environment Detection Test:');
  console.log('NEXT_PUBLIC_ENV:', import.meta.env.NEXT_PUBLIC_ENV);
  console.log('NODE_ENV:', import.meta.env.NODE_ENV);
  console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
  
  // Test the environment detection
  const url = import.meta.env.VITE_SUPABASE_URL || "";
  console.log('Supabase URL:', url);
  
  if (url.includes("kctwfgbjmhnfqtxhagib")) {
    console.log('✅ Detected: PRODUCTION');
    return "PRODUCTION";
  } else if (url.includes("sbphmrjoappwlervnbtm")) {
    console.log('✅ Detected: STAGING');
    return "STAGING";
  } else {
    console.log('⚠️ Detected: LOCAL');
    return "LOCAL";
  }
}

// Auto-run test
testEnvironmentDetection();
