// src/lib/getEnvironmentLabel.ts
export function getEnvironmentLabel(): "PRODUCTION" | "STAGING" | "LOCAL" {
  // Debug logging
  console.log('🔍 getEnvironmentLabel Debug:');
  console.log('  NEXT_PUBLIC_ENV:', import.meta.env.NEXT_PUBLIC_ENV);
  console.log('  NODE_ENV:', import.meta.env.NODE_ENV);
  console.log('  VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
  
  // Check NEXT_PUBLIC_ENV first (explicit environment setting)
  const explicitEnv = import.meta.env.NEXT_PUBLIC_ENV || import.meta.env.NODE_ENV;
  console.log('  explicitEnv:', explicitEnv);
  
  if (explicitEnv === 'production') {
    console.log('  ✅ Returning PRODUCTION (from explicitEnv)');
    return "PRODUCTION";
  }
  if (explicitEnv === 'staging') {
    console.log('  ✅ Returning STAGING (from explicitEnv)');
    return "STAGING";
  }
  
  // Fallback to Supabase URL detection
  const url = import.meta.env.VITE_SUPABASE_URL || "";
  console.log('  URL detection fallback:', url);

  if (url.includes("kctwfgbjmhnfqtxhagib")) {
    console.log('  ✅ Returning PRODUCTION (from URL)');
    return "PRODUCTION";
  }
  if (url.includes("sbphmrjoappwlervnbtm")) {
    console.log('  ✅ Returning STAGING (from URL)');
    return "STAGING";
  }

  console.log('  ⚠️ Returning LOCAL (no match found)');
  return "LOCAL";
}

export function getEnvironmentColor(label: string): string {
  switch (label) {
    case "PRODUCTION":
      return "bg-red-600 text-white";
    case "STAGING":
      return "bg-yellow-400 text-black";
    default:
      return "bg-gray-400 text-black";
  }
}

export function getEnvironmentIcon(label: string): string {
  switch (label) {
    case "PRODUCTION":
      return "🚀";
    case "STAGING":
      return "🧪";
    default:
      return "💻";
  }
}
