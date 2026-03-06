ALTER TABLE public.user_management_profiles ADD COLUMN IF NOT EXISTS username TEXT;
CREATE INDEX IF NOT EXISTS idx_ump_username ON public.user_management_profiles (username);