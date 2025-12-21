-- Fail-safe activate_invited_user trigger
-- Migration: 20251219000300_fail_safe_activation.sql
-- Description: Wraps the activation logic in an EXCEPTION block to ensure 'Error confirming user' doesn't block account creation.

CREATE OR REPLACE FUNCTION public.activate_invited_user()
RETURNS TRIGGER AS $$
DECLARE
    org_user_rec RECORD;
    invite_rec RECORD;
    role_rec RECORD;
    v_org_id UUID;
BEGIN
    -- Only proceed if this is the user's first login (confirmed_at just changed from null)
    IF OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL THEN
        -- Wrap EVERYTHING in a sub-block to catch and swallow errors
        BEGIN
            RAISE NOTICE '[activate_invited_user] Activating user: % (ID: %)', NEW.email, NEW.id;
            
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

                -- Update user_profiles if it exists
                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
                    UPDATE public.user_profiles
                    SET 
                        organization_id = COALESCE(organization_id, org_user_rec.org_id),
                        activated_at = NOW(),
                        updated_at = NOW()
                    WHERE id = NEW.id;
                END IF;

                -- 2. Process invite metadata
                SELECT * INTO invite_rec
                FROM public.user_invites
                WHERE email = NEW.email 
                  AND status = 'pending'
                  -- Loosen expiry check slightly to handle clock drift or late activation
                  AND (expires_at > (now() - INTERVAL '1 day'))
                ORDER BY created_at DESC
                LIMIT 1;

                IF FOUND AND invite_rec.role_data IS NOT NULL THEN
                    -- Mark invite as accepted
                    UPDATE public.user_invites SET status = 'accepted' WHERE id = invite_rec.id;

                    -- Process role sets
                    DECLARE
                        org_assignment JSONB;
                        role_key TEXT;
                        company_id_val TEXT;
                    BEGIN
                        -- Safety check: ensure role_data->'orgs' is an array
                        IF jsonb_typeof(invite_rec.role_data->'orgs') = 'array' THEN
                            FOR org_assignment IN SELECT * FROM jsonb_array_elements((invite_rec.role_data->'orgs')::jsonb)
                            LOOP
                                -- Safely extract orgId
                                BEGIN
                                    v_org_id := (org_assignment->>'orgId')::UUID;
                                    
                                    -- Assign roles
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

                                    -- Assign companies
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
            -- CRITICAL: Catch ALL errors and log them as a notice.
            -- This prevents the outer transaction (auth.users update) from failing.
            RAISE NOTICE '[activate_invited_user] FATAL ERROR during provisioning: %', SQLERRM;
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
