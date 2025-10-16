// Environment-aware Supabase client
// Automatically switches between production and staging
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Environment-based configuration
// Priority: 1. NODE_ENV, 2. import.meta.env.VITE_SUPABASE_URL, 3. Default based on URL
const isStaging = import.meta.env.MODE === 'staging' || 
                  import.meta.env.NODE_ENV === 'staging' ||
                  (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL.includes('sbphmrjoappwlervnbtm'))

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 
  (isStaging ? "https://sbphmrjoappwlervnbtm.supabase.co" : "https://kctwfgbjmhnfqtxhagib.supabase.co")

const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 
  (isStaging ? "YOUR_STAGING_ANON_KEY_HERE" : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdHdmZ2JqbWhuZnF0eGhhZ2liIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMDg2MzMsImV4cCI6MjA3NDY4NDYzM30.TjGDFOBMvKQqP56CDmw9hKrb0Ws06LYLTu5s3Oqho-M")

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});