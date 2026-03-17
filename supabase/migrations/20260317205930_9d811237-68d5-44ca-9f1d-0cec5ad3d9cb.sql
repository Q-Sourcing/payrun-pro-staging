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
    v_criteria_match boolean;
    v_best_workflow_id uuid;
    v_best_criteria_count int := -1;
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

    SELECT payroll_approvals_enabled INTO v_global_enabled FROM public.org_settings WHERE organization_id = v_org_id;

    IF v_global_enabled = false THEN
        UPDATE public.pay_runs
        SET approval_status = 'approved', status = 'approved',
            approval_current_level = NULL, approval_submitted_at = now(),
            approval_submitted_by = auth.uid(), approval_last_action_at = now(),
            approved_at = now(), approved_by = auth.uid()
        WHERE id = payrun_id_input;
        RETURN jsonb_build_object('success', true, 'status', 'auto_approved');
    END IF;

    v_best_workflow_id := NULL;
    FOR v_step IN 
        SELECT DISTINCT aw.id as wf_id, COUNT(awc.id) as criteria_count
        FROM public.approval_workflows aw
        LEFT JOIN public.approval_workflow_criteria awc ON awc.workflow_id = aw.id
        WHERE aw.org_id = v_org_id AND aw.is_active = true
        GROUP BY aw.id
        HAVING COUNT(awc.id) > 0
        ORDER BY COUNT(awc.id) DESC
    LOOP
        v_criteria_match := true;
        FOR v_step IN 
            SELECT * FROM public.approval_workflow_criteria 
            WHERE workflow_id = v_step.wf_id ORDER BY sequence_number
        LOOP
            IF v_step.field = 'amount' THEN
                IF v_step.operator = 'greater_than' AND NOT (COALESCE(v_payrun.total_gross, 0) > (v_step.value->>0)::numeric) THEN
                    v_criteria_match := false; EXIT;
                END IF;
                IF v_step.operator = 'less_than' AND NOT (COALESCE(v_payrun.total_gross, 0) < (v_step.value->>0)::numeric) THEN
                    v_criteria_match := false; EXIT;
                END IF;
            ELSIF v_step.field = 'pay_group' THEN
                IF NOT (v_payrun.pay_group_id::text = ANY(SELECT jsonb_array_elements_text(v_step.value))) THEN
                    v_criteria_match := false; EXIT;
                END IF;
            ELSIF v_step.field = 'payrun_type' THEN
                IF NOT (COALESCE(v_payrun.payroll_type, '') = ANY(SELECT jsonb_array_elements_text(v_step.value))) THEN
                    v_criteria_match := false; EXIT;
                END IF;
            END IF;
        END LOOP;

        IF v_criteria_match THEN
            v_best_workflow_id := v_step.wf_id;
            EXIT;
        END IF;
    END LOOP;

    IF v_best_workflow_id IS NULL THEN
        SELECT pac.id, pac.workflow_id, pac.is_enabled INTO v_config_id, v_wf_id, v_is_enabled
        FROM public.payroll_approval_configs pac
        JOIN public.payroll_approval_categories pbc ON pbc.config_id = pac.id
        JOIN public.employee_categories ec ON ec.id = pbc.category_id
        WHERE pac.organization_id = v_org_id
          AND (ec.key = v_payrun.sub_type OR (v_payrun.sub_type IS NULL AND ec.key = v_payrun.category))
          AND pac.is_enabled = true
        LIMIT 1;

        IF v_config_id IS NOT NULL AND v_is_enabled = true THEN
            v_best_workflow_id := v_wf_id;
        END IF;
    END IF;

    IF v_best_workflow_id IS NULL THEN
        SELECT id INTO v_best_workflow_id FROM public.approval_workflows
        WHERE org_id = v_org_id AND is_default = true AND is_active = true LIMIT 1;
    END IF;

    v_workflow_id := v_best_workflow_id;

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
        v_resolved_user_id := v_step.approver_user_id;
        
        IF v_resolved_user_id IS NULL THEN
            IF v_step.approver_type = 'reporting_to' THEN
                SELECT e.reports_to_id INTO v_resolved_user_id
                FROM public.pay_items pi2
                JOIN public.employees e ON e.id = pi2.employee_id
                WHERE pi2.pay_run_id = payrun_id_input AND e.reports_to_id IS NOT NULL
                LIMIT 1;
            ELSIF v_step.approver_type = 'department_head' THEN
                SELECT cu.head_user_id INTO v_resolved_user_id
                FROM public.pay_items pi2
                JOIN public.employees e ON e.id = pi2.employee_id
                JOIN public.company_units cu ON cu.id = e.company_unit_id
                WHERE pi2.pay_run_id = payrun_id_input AND cu.head_user_id IS NOT NULL
                LIMIT 1;
            ELSIF v_step.approver_type = 'designation' AND v_step.approver_designation_id IS NOT NULL THEN
                SELECT e.id INTO v_resolved_user_id
                FROM public.employees e
                WHERE e.designation_id = v_step.approver_designation_id AND e.status = 'active'
                LIMIT 1;
            ELSIF v_step.approver_type = 'project_manager' THEN
                SELECT p.responsible_manager_id INTO v_resolved_user_id
                FROM public.pay_items pi2
                JOIN public.employees e ON e.id = pi2.employee_id
                JOIN public.projects p ON p.id = e.project_id
                WHERE pi2.pay_run_id = payrun_id_input AND p.responsible_manager_id IS NOT NULL
                LIMIT 1;
            ELSIF v_step.approver_type = 'group' AND v_step.approver_group_id IS NOT NULL THEN
                SELECT agm.user_id INTO v_resolved_user_id
                FROM public.approval_group_members agm
                WHERE agm.group_id = v_step.approver_group_id
                LIMIT 1;
            ELSIF v_step.approver_role IS NOT NULL THEN
                SELECT ou.user_id INTO v_resolved_user_id
                FROM public.org_users ou
                JOIN public.org_user_roles our ON our.org_user_id = ou.id
                JOIN public.org_roles r ON r.id = our.role_id
                WHERE ou.org_id = v_org_id
                  AND ou.status = 'active'
                  AND r.key = v_step.approver_role
                ORDER BY ou.created_at ASC
                LIMIT 1;
            END IF;
        END IF;

        IF v_resolved_user_id IS NULL AND v_step.fallback_user_id IS NOT NULL THEN
            v_resolved_user_id := v_step.fallback_user_id;
        END IF;
        
        IF v_resolved_user_id IS NULL THEN
            RAISE EXCEPTION 'No approver could be resolved for level %. Please check the workflow configuration.', v_step.level;
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