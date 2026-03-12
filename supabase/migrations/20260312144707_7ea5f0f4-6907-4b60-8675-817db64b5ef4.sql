
CREATE OR REPLACE FUNCTION public.assign_company_membership(p_user_id uuid, p_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate company exists
  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = p_company_id) THEN
    RAISE EXCEPTION 'Company not found';
  END IF;

  -- Insert membership (ignore if already exists)
  INSERT INTO public.user_company_memberships (user_id, company_id)
  VALUES (p_user_id, p_company_id)
  ON CONFLICT (user_id, company_id) DO NOTHING;
END;
$$;
