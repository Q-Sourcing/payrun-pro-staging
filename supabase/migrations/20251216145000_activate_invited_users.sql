
-- Trigger to activate invited users on first login
CREATE OR REPLACE FUNCTION public.activate_invited_user()
RETURNS TRIGGER AS $$
DECLARE
    org_user_rec RECORD;
    invite_rec RECORD;
    role_rec RECORD;
BEGIN
    -- Only proceed if this is the user's first login (confirmed_at just changed from null)
    IF OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL THEN
        
        -- Get org_users record for this user (should exist with status='invited')
        SELECT * INTO org_user_rec
        FROM public.org_users
        WHERE user_id = NEW.id AND status = 'invited'
        LIMIT 1;

        IF FOUND THEN
            -- Update status to 'active'
            UPDATE public.org_users
            SET status = 'active'
            WHERE id = org_user_rec.id;

            -- Get invite data to know which roles to assign
            SELECT * INTO invite_rec
            FROM public.user_invites
            WHERE email = NEW.email AND status = 'pending'
            ORDER BY created_at DESC
            LIMIT 1;

            IF FOUND AND invite_rec.role_data IS NOT NULL THEN
                -- Mark invite as accepted
                UPDATE public.user_invites
                SET status = 'accepted'
                WHERE id = invite_rec.id;

                -- Assign org roles from invite data
                -- role_data structure: {orgs: [{orgId, roles: [roleKeys], companyIds}]}
                DECLARE
                    org_assignment JSONB;
                    role_key TEXT;
                BEGIN
                    FOR org_assignment IN SELECT * FROM jsonb_array_elements((invite_rec.role_data->'orgs')::jsonb)
                    LOOP
                        -- For each role key in the roles array
                        FOR role_key IN SELECT * FROM jsonb_array_elements_text((org_assignment->'roles')::jsonb)
                        LOOP
                            -- Find the role_id from org_roles
                            SELECT id INTO role_rec
                            FROM public.org_roles
                            WHERE org_id = (org_assignment->>'orgId')::UUID
                              AND key = role_key
                            LIMIT 1;

                            IF FOUND THEN
                                -- Insert into org_user_roles
                                INSERT INTO public.org_user_roles (org_user_id, role_id)
                                VALUES (org_user_rec.id, role_rec.id)
                                ON CONFLICT DO NOTHING;
                            END IF;
                        END LOOP;

                        -- Assign company memberships
                        DECLARE
                            company_id_val TEXT;
                        BEGIN
                            FOR company_id_val IN SELECT * FROM jsonb_array_elements_text((org_assignment->'companyIds')::jsonb)
                            LOOP
                                INSERT INTO public.user_company_memberships (user_id, company_id)
                                VALUES (NEW.id, company_id_val::UUID)
                                ON CONFLICT DO NOTHING;
                            END LOOP;
                        END;
                    END LOOP;
                END;
            END IF;

            -- Ensure user has a basic role in user_roles table (for legacy compatibility)
            INSERT INTO public.user_roles (user_id, role)
            VALUES (NEW.id, 'employee')
            ON CONFLICT DO NOTHING;

        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_user_confirm_activate ON auth.users;
CREATE TRIGGER on_user_confirm_activate
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    WHEN (OLD.confirmed_at IS DISTINCT FROM NEW.confirmed_at)
    EXECUTE FUNCTION public.activate_invited_user();
