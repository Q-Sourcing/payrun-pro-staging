CREATE OR REPLACE FUNCTION public.submit_payrun_for_approval(payrun_id_input uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
    v_resolved_user_id uuid;
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
        -- Resolve role-based steps to actual user IDs via OBAC tables
        v_resolved_user_id := v_step.approver_user_id;
        
        IF v_resolved_user_id IS NULL AND v_step.approver_role IS NOT NULL THEN
            SELECT ou.user_id INTO v_resolved_user_id
            FROM public.org_users ou
            JOIN public.org_user_roles our ON our.org_user_id = ou.id
            JOIN public.org_roles r ON r.id = our.role_id
            WHERE ou.org_id = v_org_id
              AND ou.status = 'active'
              AND r.key = v_step.approver_role
            ORDER BY ou.created_at ASC
            LIMIT 1;
            
            IF v_resolved_user_id IS NULL THEN
                RAISE EXCEPTION 'No active user found with role "%" in this organization. Please assign the role to a user before submitting.', v_step.approver_role;
            END IF;
        END IF;
        
        INSERT INTO public.payrun_approval_steps (payrun_id, level, approver_user_id, approver_role, status)
        VALUES (payrun_id_input, v_step.level, v_resolved_user_id, v_step.approver_role, 'pending');
        
        IF v_step.level = 1 THEN v_next_approver_id := v_resolved_user_id; END IF;
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