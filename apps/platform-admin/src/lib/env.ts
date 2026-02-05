import { z } from "zod";

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
  VITE_ALLOW_DEVICE_REGISTRATION: z
    .string()
    .default("false")
    .transform((val) => val === "true"),
  VITE_ENFORCE_DEVICE_APPROVAL: z
    .string()
    .default("true")
    .transform((val) => val === "true"),
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cachedEnv) return cachedEnv;
  const parsed = envSchema.safeParse(import.meta.env);
  if (!parsed.success) {
    console.error("Invalid environment variables", parsed.error.flatten().fieldErrors);
    throw new Error("Missing or invalid environment variables. Check your .env file.");
  }
  cachedEnv = parsed.data;
  return cachedEnv;
}








