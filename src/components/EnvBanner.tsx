import React from "react";

/**
 * Environment Banner Component
 * Shows a visual indicator of the current environment
 * - Staging: Yellow badge with "🧪 STAGING"
 * - Production: Green badge with "🟢 PRODUCTION" (optional)
 * - Development: Blue badge with "🔧 DEVELOPMENT" (optional)
 */
export default function EnvBanner() {
  // Resolve environment from explicit vars first, then Vite mode.
  const explicitEnv =
    import.meta.env.VITE_ENVIRONMENT ||
    import.meta.env.NEXT_PUBLIC_ENVIRONMENT ||
    import.meta.env.VITE_ENV ||
    import.meta.env.NEXT_PUBLIC_ENV;
  const mode = import.meta.env.MODE;
  const normalizedEnv = (explicitEnv || "").toLowerCase();
  const env =
    normalizedEnv ||
    (mode === "development" ? "development" : mode === "production" ? "production" : "");

  // Debug logging
  console.log('🎨 EnvBanner Debug:', {
    env,
    mode,
    viteEnv: import.meta.env.VITE_ENVIRONMENT,
    nextEnv: import.meta.env.NEXT_PUBLIC_ENVIRONMENT,
    allEnv: import.meta.env
  });

  // Don't show banner if no environment can be resolved
  if (!env) {
    console.log('❌ No environment detected, hiding banner');
    return null;
  }

  // Staging environment - Yellow badge
  if (env === "staging") {
    return (
      <div
        style={{
          position: "fixed",
          top: "1rem",
          right: "1rem",
          backgroundColor: "#FCD34D",
          color: "#1F2937",
          fontWeight: "bold",
          padding: "6px 12px",
          borderRadius: "6px",
          fontSize: "0.875rem",
          zIndex: 9999,
          boxShadow: "0 0 4px rgba(0,0,0,0.15)",
          border: "1px solid #F59E0B",
          fontFamily: "system-ui, -apple-system, sans-serif"
        }}
      >
        🧪 STAGING
      </div>
    );
  }

  // Production environment - Green badge (optional, for debugging)
  if (env === "production") {
    return (
      <div
        style={{
          position: "fixed",
          top: "1rem",
          right: "1rem",
          backgroundColor: "#10B981",
          color: "white",
          fontWeight: "bold",
          padding: "6px 12px",
          borderRadius: "6px",
          fontSize: "0.875rem",
          zIndex: 9999,
          boxShadow: "0 0 4px rgba(0,0,0,0.15)",
          border: "1px solid #059669",
          fontFamily: "system-ui, -apple-system, sans-serif"
        }}
      >
        🟢 PRODUCTION
      </div>
    );
  }

  // Hide banner in local development mode.
  if (mode === "development" || env === "development") {
    return null;
  }

  // Fallback for unknown environments
  return (
    <div
      style={{
        position: "fixed",
        top: "1rem",
        right: "1rem",
        backgroundColor: "#6B7280",
        color: "white",
        fontWeight: "bold",
        padding: "6px 12px",
        borderRadius: "6px",
        fontSize: "0.875rem",
        zIndex: 9999,
        boxShadow: "0 0 4px rgba(0,0,0,0.15)",
        border: "1px solid #4B5563",
        fontFamily: "system-ui, -apple-system, sans-serif"
      }}
    >
      ❓ {env?.toUpperCase() || "UNKNOWN"}
    </div>
  );
}
