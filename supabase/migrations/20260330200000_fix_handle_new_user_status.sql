-- ============================================================================
-- Fix handle_new_user trigger to set correct initial status
-- ============================================================================
-- Previously the trigger inserted into user_profiles without a status field,
-- causing all new users (including invited ones) to get status = 'active'.
-- Now it sets status = 'pending' for users who haven't confirmed yet
-- (i.e., invited users), and 'active' for confirmed users.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_id UUID;
  raw_role TEXT;
  safe_role TEXT;
  initial_status TEXT;
BEGIN
  BEGIN
    org_id := (NEW.raw_user_meta_data->>'organization_id')::UUID;
  EXCEPTION WHEN OTHERS THEN
    org_id := NULL;
  END;

  raw_role := COALESCE(NEW.raw_user_meta_data->>'role', 'user');

  -- Normalize invitation/non-standard roles to valid values
  safe_role := CASE
    WHEN raw_role IN ('super_admin', 'org_admin', 'user') THEN raw_role
    WHEN raw_role IN ('admin', 'organization_admin') THEN 'org_admin'
    ELSE 'user'
  END;

  -- Invited users (not yet confirmed) should start as 'pending'
  initial_status := CASE
    WHEN NEW.confirmed_at IS NOT NULL THEN 'active'
    ELSE 'pending'
  END;

  INSERT INTO public.user_profiles (id, email, first_name, last_name, role, organization_id, status)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    safe_role,
    org_id,
    initial_status
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, public.user_profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, public.user_profiles.last_name),
    role = EXCLUDED.role,
    organization_id = COALESCE(public.user_profiles.organization_id, EXCLUDED.organization_id),
    status = CASE
      -- Don't overwrite an explicitly-set status (e.g. from edge function)
      WHEN public.user_profiles.status IN ('inactive', 'pending', 'invited') THEN public.user_profiles.status
      ELSE EXCLUDED.status
    END;

  RETURN NEW;
END;
$$;

-- Also update activate_invited_user to set status = 'active' when user confirms
CREATE OR REPLACE FUNCTION public.activate_invited_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    org_user_rec RECORD;
    invite_rec RECORD;
    role_rec RECORD;
    v_org_id UUID;
BEGIN
    -- Only proceed if this is the user's first confirmation (confirmed_at just changed from null)
    IF OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL THEN
        BEGIN
            RAISE NOTICE '[activate_invited_user] Activating user: % (ID: %)', NEW.email, NEW.id;

            -- Activate user_profiles status
            UPDATE public.user_profiles
            SET status = 'active', activated_at = NOW(), updated_at = NOW()
            WHERE id = NEW.id AND status IN ('pending', 'invited');

            -- 1. Get org_users record
            SELECT * INTO org_user_rec
            FROM public.org_users
            WHERE user_id = NEW.id AND status = 'invited'
            LIMIT 1;

            IF FOUND THEN
                RAISE NOTICE '[activate_invited_user] Found invited record: %', org_user_rec.id;

                -- Update status to 'active'
                UPDATE public.org_users
                SET status = 'active'
                WHERE id = org_user_rec.id;

                -- Update user_profiles org if missing
                UPDATE public.user_profiles
                SET
                    organization_id = COALESCE(organization_id, org_user_rec.org_id),
                    updated_at = NOW()
                WHERE id = NEW.id;

                -- 2. Process invite metadata from user_management_invitations
                SELECT * INTO invite_rec
                FROM public.user_management_invitations
                WHERE email = NEW.email
                  AND status = 'pending'
                  AND (expires_at > (now() - INTERVAL '1 day'))
                ORDER BY created_at DESC
                LIMIT 1;

                IF FOUND AND invite_rec.role_data IS NOT NULL THEN
                    -- Mark invite as accepted
                    UPDATE public.user_management_invitations
                    SET status = 'accepted'
                    WHERE id = invite_rec.id;

                    -- Process role sets
                    DECLARE
                        org_assignment JSONB;
                        role_key TEXT;
                        company_id_val TEXT;
                    BEGIN
                        IF jsonb_typeof(invite_rec.role_data->'orgs') = 'array' THEN
                            FOR org_assignment IN SELECT * FROM jsonb_array_elements((invite_rec.role_data->'orgs')::jsonb)
                            LOOP
                                BEGIN
                                    v_org_id := (org_assignment->>'orgId')::UUID;

                                    IF jsonb_typeof(org_assignment->'roles') = 'array' THEN
                                        FOR role_key IN SELECT * FROM jsonb_array_elements_text((org_assignment->'roles')::jsonb)
                                        LOOP
                                            SELECT id INTO role_rec FROM public.org_roles
                                            WHERE org_id = v_org_id AND key = role_key LIMIT 1;

                                            IF FOUND THEN
                                                INSERT INTO public.org_user_roles (org_user_id, role_id)
                                                VALUES (org_user_rec.id, role_rec.id)
                                                ON CONFLICT DO NOTHING;
                                            END IF;
                                        END LOOP;
                                    END IF;

                                    IF jsonb_typeof(org_assignment->'companyIds') = 'array' THEN
                                        FOR company_id_val IN SELECT * FROM jsonb_array_elements_text((org_assignment->'companyIds')::jsonb)
                                        LOOP
                                            INSERT INTO public.user_company_memberships (user_id, company_id)
                                            VALUES (NEW.id, company_id_val::UUID)
                                            ON CONFLICT DO NOTHING;
                                        END LOOP;
                                    END IF;

                                EXCEPTION WHEN OTHERS THEN
                                    RAISE NOTICE '[activate_invited_user] Failed processing an org assignment: %', SQLERRM;
                                END;
                            END LOOP;
                        END IF;
                    END;
                END IF;

                -- 3. Legacy compatibility
                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN
                    INSERT INTO public.user_roles (user_id, role)
                    VALUES (NEW.id, 'employee')
                    ON CONFLICT DO NOTHING;
                END IF;

            END IF;

        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '[activate_invited_user] FATAL ERROR during provisioning: %', SQLERRM;
        END;
    END IF;

    RETURN NEW;
END;
$$;
