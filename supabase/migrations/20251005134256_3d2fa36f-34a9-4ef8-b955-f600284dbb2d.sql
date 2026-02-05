-- Create settings table to store user preferences and system configuration
CREATE TABLE IF NOT EXISTS public.settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  key text NOT NULL,
  value jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, category, key)
);

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own settings" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Users can view their own settings" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Users can view their own settings" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Users can view their own settings" ON public.head_office_pay_groups_expatriates; CREATE POLICY "Users can view their own settings"
  ON public.settings FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can insert their own settings" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Users can insert their own settings" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Users can insert their own settings" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Users can insert their own settings" ON public.head_office_pay_groups_expatriates; CREATE POLICY "Users can insert their own settings"
  ON public.settings FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update their own settings" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Users can update their own settings" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Users can update their own settings" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Users can update their own settings" ON public.head_office_pay_groups_expatriates; CREATE POLICY "Users can update their own settings"
  ON public.settings FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can delete their own settings" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Users can delete their own settings" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Users can delete their own settings" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Users can delete their own settings" ON public.head_office_pay_groups_expatriates; CREATE POLICY "Users can delete their own settings"
  ON public.settings FOR DELETE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Trigger for updated_at
CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();