-- 1) Create or repair organization_security_settings table
-- Ensure it exists and has the correct foreign key
CREATE TABLE IF NOT EXISTS public.organization_security_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL UNIQUE,
    lockout_threshold INTEGER NOT NULL DEFAULT 5 CHECK (lockout_threshold >= 3 AND lockout_threshold <= 10),
    email_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fix organization_security_settings foreign key
-- It might have been created referencing pay_groups(id) by mistake.
DO $$
BEGIN
    -- Drop the incorrect constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'organization_security_settings_org_id_fkey' 
        AND table_name = 'organization_security_settings'
    ) THEN
        ALTER TABLE public.organization_security_settings
        DROP CONSTRAINT organization_security_settings_org_id_fkey;
    END IF;

    -- Add the correct constraint
    ALTER TABLE public.organization_security_settings
    ADD CONSTRAINT organization_security_settings_org_id_fkey 
    FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not repair organization_security_settings_org_id_fkey: %', SQLERRM;
END $$ LANGUAGE plpgsql;

-- 2) Add activated_at to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP WITH TIME ZONE;

-- 3) Enhance activate_invited_user trigger with logging and user_profiles update
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
        RAISE NOTICE 'Activating invited user: % (ID: %)', NEW.email, NEW.id;
        
        -- Get org_users record for this user (should exist with status='invited')
        SELECT * INTO org_user_rec
        FROM public.org_users
        WHERE user_id = NEW.id AND status = 'invited'
        LIMIT 1;

        IF FOUND THEN
            RAISE NOTICE 'Found invited org_user record: %', org_user_rec.id;
            
            -- Update status to 'active'
            UPDATE public.org_users
            SET status = 'active'
            WHERE id = org_user_rec.id;

            -- Update user_profiles
            UPDATE public.user_profiles
            SET 
              organization_id = org_user_rec.org_id,
              activated_at = NOW(),
              updated_at = NOW()
            WHERE id = NEW.id;

            -- Get invite data to know which roles to assign
            SELECT * INTO invite_rec
            FROM public.user_invites
            WHERE email = NEW.email 
              AND status = 'pending'
              AND expires_at > now()
            ORDER BY created_at DESC
            LIMIT 1;

            IF FOUND AND invite_rec.role_data IS NOT NULL THEN
                RAISE NOTICE 'Found pending invite: %. Processing role_data.', invite_rec.id;
                
                -- Mark invite as accepted
                UPDATE public.user_invites
                SET status = 'accepted'
                WHERE id = invite_rec.id;

                -- Assign org roles from invite data
                DECLARE
                    org_assignment JSONB;
                    role_key TEXT;
                BEGIN
                    FOR org_assignment IN SELECT * FROM jsonb_array_elements((invite_rec.role_data->'orgs')::jsonb)
                    LOOP
                        v_org_id := (org_assignment->>'orgId')::UUID;
                        RAISE NOTICE 'Processing org assignment for org: %', v_org_id;

                        -- For each role key in the roles array
                        FOR role_key IN SELECT * FROM jsonb_array_elements_text((org_assignment->'roles')::jsonb)
                        LOOP
                            -- Find the role_id from org_roles
                            SELECT id INTO role_rec
                            FROM public.org_roles
                            WHERE org_id = v_org_id
                              AND key = role_key
                            LIMIT 1;

                            IF FOUND THEN
                                RAISE NOTICE 'Assigning role: % (ID: %) to org_user: %', role_key, role_rec.id, org_user_rec.id;
                                -- Insert into org_user_roles
                                INSERT INTO public.org_user_roles (org_user_id, role_id)
                                VALUES (org_user_rec.id, role_rec.id)
                                ON CONFLICT DO NOTHING;
                            ELSE
                                RAISE WARNING 'Role not found: % for org: %', role_key, v_org_id;
                            END IF;
                        END LOOP;

                        -- Assign company memberships
                        DECLARE
                            company_id_val TEXT;
                        BEGIN
                            FOR company_id_val IN SELECT * FROM jsonb_array_elements_text((org_assignment->'companyIds')::jsonb)
                            LOOP
                                RAISE NOTICE 'Assigning company membership: % to user: %', company_id_val, NEW.id;
                                INSERT INTO public.user_company_memberships (user_id, company_id)
                                VALUES (NEW.id, company_id_val::UUID)
                                ON CONFLICT DO NOTHING;
                            END LOOP;
                        END;
                    END LOOP;
                END;
            ELSE
                RAISE NOTICE 'No pending invite found or no role_data for user: %', NEW.email;
            END IF;

            -- Ensure user has a basic role in user_roles table (for legacy compatibility)
            INSERT INTO public.user_roles (user_id, role)
            VALUES (NEW.id, 'employee')
            ON CONFLICT DO NOTHING;

        ELSE
            RAISE NOTICE 'No invited org_user record found for user: %', NEW.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
