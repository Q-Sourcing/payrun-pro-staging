import { createClient } from "@supabase/supabase-js";

import { getEnv } from "@/lib/env";

const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = getEnv();

export const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});


