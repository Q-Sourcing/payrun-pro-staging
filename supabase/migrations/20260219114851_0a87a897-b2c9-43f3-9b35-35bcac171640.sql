
-- Fix SECURITY DEFINER functions missing SET search_path
-- This prevents search_path manipulation attacks

-- 1. sync_user_profile_email
CREATE OR REPLACE FUNCTION public.sync_user_profile_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
    UPDATE public.user_profiles
    SET email = NEW.email,
        updated_at = now()
    WHERE id = NEW.id;
    RETURN NEW;
END;
$function$;

-- 2. create_workflow_version_snapshot
CREATE OR REPLACE FUNCTION public.create_workflow_version_snapshot()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.version = NEW.version) THEN
        RETURN NEW;
    END IF;
    
    INSERT INTO public.approval_workflow_versions (
        workflow_id, version, workflow_snapshot, created_by
    )
    SELECT 
        NEW.id, NEW.version,
        jsonb_build_object(
            'workflow', row_to_json(NEW)::jsonb,
            'steps', (
                SELECT jsonb_agg(row_to_json(steps))
                FROM public.approval_workflow_steps steps
                WHERE steps.workflow_id = NEW.id
            )
        ),
        auth.uid()
    ON CONFLICT (workflow_id, version) DO NOTHING;
    
    RETURN NEW;
END;
$function$;

-- 3. approve_payrun_step
CREATE OR REPLACE FUNCTION public.approve_payrun_step(payrun_id_input uuid, comments_input text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
    v_payrun RECORD;
    v_step RECORD;
    v_next_level int;
    v_next_step RECORD;
    v_max_level int;
BEGIN
    SELECT * INTO v_payrun FROM public.pay_runs WHERE id = payrun_id_input;
    IF v_payrun.id IS NULL THEN RAISE EXCEPTION 'Payrun not found'; END IF;
    IF v_payrun.approval_status != 'pending_approval' THEN 
        RAISE EXCEPTION 'Payrun is not pending approval'; 
    END IF;
    
    SELECT * INTO v_step 
    FROM public.payrun_approval_steps
    WHERE payrun_id = payrun_id_input
      AND level = v_payrun.approval_current_level
      AND approver_user_id = auth.uid();
      
    IF v_step.id IS NULL THEN
        RAISE EXCEPTION 'You are not the designated approver for the current level (%)', v_payrun.approval_current_level;
    END IF;
    
    UPDATE public.payrun_approval_steps
    SET status = 'approved', actioned_at = now(), actioned_by = auth.uid(), comments = comments_input
    WHERE id = v_step.id;
    
    v_next_level := v_payrun.approval_current_level + 1;
    SELECT count(*) INTO v_max_level FROM public.payrun_approval_steps WHERE payrun_id = payrun_id_input;
    
    IF v_next_level <= v_max_level THEN
        UPDATE public.pay_runs
        SET approval_current_level = v_next_level, approval_last_action_at = now()
        WHERE id = payrun_id_input;
        
        SELECT * INTO v_next_step FROM public.payrun_approval_steps
        WHERE payrun_id = payrun_id_input AND level = v_next_level;
        
        INSERT INTO public.notifications (user_id, type, title, message, metadata)
        VALUES (v_next_step.approver_user_id, 'approval_request', 'Payrun Approval Required',
            'A payrun is awaiting your approval (Level ' || v_next_level || ')',
            jsonb_build_object('payrun_id', payrun_id_input));
        
        RETURN jsonb_build_object('status', 'progressing', 'next_level', v_next_level);
    ELSE
        UPDATE public.pay_runs
        SET approval_status = 'approved', status = 'locked',
            approval_current_level = NULL, approval_last_action_at = now(),
            approved_at = now(), approved_by = auth.uid()
        WHERE id = payrun_id_input;
        
        INSERT INTO public.notifications (user_id, type, title, message, metadata)
        VALUES (v_payrun.created_by, 'payroll_alert', 'Payrun Approved',
            'Your payrun has been fully approved and is now locked.',
            jsonb_build_object('payrun_id', payrun_id_input));
        
        RETURN jsonb_build_object('status', 'approved');
    END IF;
END;
$function$;

-- 4. exec_sql_query - CRITICAL: This function allows arbitrary SQL execution
CREATE OR REPLACE FUNCTION public.exec_sql_query(sql_query text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
    result jsonb;
BEGIN
    EXECUTE 'SELECT jsonb_agg(t) FROM (' || sql_query || ') t' INTO result;
    RETURN result;
END;
$function$;

-- 5. submit_payrun_for_approval
CREATE OR REPLACE FUNCTION public.submit_payrun_for_approval(payrun_id_input uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
    v_payrun RECORD;
    v_workflow_id uuid;
    v_step RECORD;
    v_org_id uuid;
    v_next_approver_id uuid;
    v_config_id uuid;
    v_is_enabled boolean;
    v_wf_id uuid;
    v_global_enabled boolean;
BEGIN
    SELECT * INTO v_payrun FROM public.pay_runs WHERE id = payrun_id_input;
    IF v_payrun.id IS NULL THEN RAISE EXCEPTION 'Payrun not found'; END IF;
    IF v_payrun.status NOT IN ('draft', 'rejected') AND v_payrun.approval_status NOT IN ('draft', 'rejected') THEN
         RAISE EXCEPTION 'Payrun must be in draft or rejected status to submit. Current status: %', v_payrun.status;
    END IF;
    
    SELECT organization_id INTO v_org_id FROM public.pay_groups WHERE id = v_payrun.pay_group_id;
    IF v_org_id IS NULL THEN
        SELECT organization_id INTO v_org_id FROM public.user_profiles WHERE id = auth.uid();
    END IF;

    SELECT pac.id, pac.workflow_id, pac.is_enabled INTO v_config_id, v_wf_id, v_is_enabled
    FROM public.payroll_approval_configs pac
    JOIN public.payroll_approval_categories pbc ON pbc.config_id = pac.id
    JOIN public.employee_categories ec ON ec.id = pbc.category_id
    WHERE pac.organization_id = v_org_id
      AND (ec.key = v_payrun.sub_type OR (v_payrun.sub_type IS NULL AND ec.key = v_payrun.category))
      AND pac.is_enabled = true
    LIMIT 1;

    SELECT payroll_approvals_enabled INTO v_global_enabled FROM public.org_settings WHERE organization_id = v_org_id;

    IF v_global_enabled = false THEN
        v_workflow_id := NULL;
    ELSIF v_config_id IS NOT NULL THEN
        IF v_is_enabled = true THEN v_workflow_id := v_wf_id; ELSE v_workflow_id := NULL; END IF;
    ELSE
        v_workflow_id := NULL;
    END IF;

    IF v_workflow_id IS NULL THEN
        UPDATE public.pay_runs
        SET approval_status = 'approved', status = 'approved',
            approval_current_level = NULL, approval_submitted_at = now(),
            approval_submitted_by = auth.uid(), approval_last_action_at = now(),
            approved_at = now(), approved_by = auth.uid()
        WHERE id = payrun_id_input;
        RETURN jsonb_build_object('success', true, 'status', 'auto_approved');
    END IF;
    
    DELETE FROM public.payrun_approval_steps WHERE payrun_id = payrun_id_input;
    
    FOR v_step IN 
        SELECT * FROM public.approval_workflow_steps WHERE workflow_id = v_workflow_id ORDER BY level ASC 
    LOOP
        INSERT INTO public.payrun_approval_steps (payrun_id, level, approver_user_id, approver_role, status)
        VALUES (payrun_id_input, v_step.level, v_step.approver_user_id, v_step.approver_role, 'pending');
        IF v_step.level = 1 THEN v_next_approver_id := v_step.approver_user_id; END IF;
    END LOOP;
    
    UPDATE public.pay_runs
    SET approval_status = 'pending_approval', status = 'pending_approval',
        approval_current_level = 1, approval_submitted_at = now(),
        approval_submitted_by = auth.uid(), approval_last_action_at = now(),
        approved_at = NULL, approved_by = NULL
    WHERE id = payrun_id_input;
    
    IF v_next_approver_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, title, message, metadata)
        VALUES (v_next_approver_id, 'approval_request', 'Payrun Approval Required',
            'A payrun requires your approval (Level 1).',
            jsonb_build_object('payrun_id', payrun_id_input, 'type', 'payroll_approval'));
    END IF;

    RETURN jsonb_build_object('success', true, 'status', 'submitted', 'next_approver', v_next_approver_id, 'workflow_id', v_workflow_id);
END;
$function$;

-- 6. has_permission (2-arg version)
CREATE OR REPLACE FUNCTION public.has_permission(p_user_id uuid, p_permission_key text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT public.has_permission($2, NULL, NULL, $1);
$function$;

-- 7. get_user_role(user_id uuid) - the overloaded version
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
 RETURNS character varying
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
    RETURN (
        SELECT role FROM public.users 
        WHERE id = user_id AND is_active = true
    );
END;
$function$;

-- 8. get_org_total_payroll
CREATE OR REPLACE FUNCTION public.get_org_total_payroll(org_id uuid)
 RETURNS numeric
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = public
AS $function$
  select coalesce(sum(total_gross), 0)::numeric
  from public.pay_runs
  where organization_id = org_id
$function$;

-- 9. seed_default_categories
CREATE OR REPLACE FUNCTION public.seed_default_categories(org_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
    INSERT INTO public.employee_categories (organization_id, key, label, description)
    VALUES 
        (org_id, 'head_office', 'Head Office', 'Corporate and administrative staff'),
        (org_id, 'projects', 'Projects', 'Field and contract staff')
    ON CONFLICT (organization_id, key) DO NOTHING;
END;
$function$;

-- 10. cleanup_expired_permissions
CREATE OR REPLACE FUNCTION public.cleanup_expired_permissions()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.permission_cache 
    WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$function$;

-- 11. cleanup_expired_sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.user_sessions 
    WHERE expires_at < NOW() OR is_active = false;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$function$;

-- 12. log_access_control_audit
CREATE OR REPLACE FUNCTION public.log_access_control_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
declare
  actor text := coalesce(auth.jwt()->>'email', auth.uid()::text);
  org_id uuid := null;
  details jsonb;
  action text;
  resource text;
begin
  if tg_table_name = 'org_users' then
    org_id := coalesce(new.org_id, old.org_id);
  elsif tg_table_name = 'org_user_roles' then
    select ou.org_id into org_id
    from public.org_users ou
    where ou.id = coalesce(new.org_user_id, old.org_user_id)
    limit 1;
  elsif tg_table_name = 'org_licenses' then
    org_id := coalesce(new.org_id, old.org_id);
  elsif tg_table_name = 'org_license_assignments' then
    org_id := coalesce(new.org_id, old.org_id);
  elsif tg_table_name = 'access_grants' then
    org_id := coalesce(new.org_id, old.org_id);
  elsif tg_table_name = 'user_company_memberships' then
    select c.organization_id into org_id
    from public.companies c
    where c.id = coalesce(new.company_id, old.company_id)
    limit 1;
  end if;

  resource := tg_table_name;
  if tg_op = 'INSERT' then
    action := resource || '.create';
    details := to_jsonb(new);
  elsif tg_op = 'UPDATE' then
    action := resource || '.update';
    details := jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new));
  elsif tg_op = 'DELETE' then
    action := resource || '.delete';
    details := to_jsonb(old);
  end if;

  insert into public.audit_logs (integration_name, action, user_id, resource, details, timestamp, result)
  values ('access_control', action, actor, resource,
    jsonb_build_object('org_id', org_id, 'table', tg_table_name, 'op', tg_op, 'row', details),
    now(), 'success');

  return coalesce(new, old);
end;
$function$;
