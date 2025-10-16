// src/lib/getEnvironmentLabel.ts
export function getEnvironmentLabel(): "PRODUCTION" | "STAGING" | "LOCAL" {
  // Check NEXT_PUBLIC_ENV first (explicit environment setting)
  const explicitEnv = import.meta.env.NEXT_PUBLIC_ENV || import.meta.env.NODE_ENV;
  if (explicitEnv === 'production') return "PRODUCTION";
  if (explicitEnv === 'staging') return "STAGING";
  
  // Fallback to Supabase URL detection
  const url = import.meta.env.VITE_SUPABASE_URL || "";

  if (url.includes("kctwfgbjmhnfqtxhagib")) return "PRODUCTION";
  if (url.includes("sbphmrjoappwlervnbtm")) return "STAGING";

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
