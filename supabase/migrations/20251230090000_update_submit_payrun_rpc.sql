-- Migration: Update Payrun Approval Trigger for Per-Type Logic
-- This updates submit_payrun_for_approval to resolve workflows based on payroll type configurations.

CREATE OR REPLACE FUNCTION public.submit_payrun_for_approval(payrun_id_input uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    -- 1. Validation
    SELECT * INTO v_payrun FROM public.pay_runs WHERE id = payrun_id_input;
    
    IF v_payrun.id IS NULL THEN
        RAISE EXCEPTION 'Payrun not found';
    END IF;
    
    -- Check Status (must be draft or rejected to resubmit)
    IF v_payrun.status NOT IN ('draft', 'rejected') AND v_payrun.approval_status NOT IN ('draft', 'rejected') THEN
         RAISE EXCEPTION 'Payrun must be in draft or rejected status to submit. Current status: %', v_payrun.status;
    END IF;
    
    -- 2. Find Organization ID
    SELECT organization_id INTO v_org_id 
    FROM public.pay_groups 
    WHERE id = v_payrun.pay_group_id;

    IF v_org_id IS NULL THEN
        -- Fallback to auth user org if pay_group link fails
        SELECT organization_id INTO v_org_id FROM public.user_profiles WHERE id = auth.uid();
    END IF;

    -- 3. Resolve Approval Configuration
    -- Logic: Find a config matching the payrun's sub_type or category
    -- pac.workflow_id is the workflow linked to this config
    SELECT pac.id, pac.workflow_id, pac.is_enabled INTO v_config_id, v_wf_id, v_is_enabled
    FROM public.payroll_approval_configs pac
    JOIN public.payroll_approval_categories pbc ON pbc.config_id = pac.id
    JOIN public.employee_categories ec ON ec.id = pbc.category_id
    WHERE pac.organization_id = v_org_id
      AND (
          ec.key = v_payrun.sub_type -- Primary match: specific type (e.g., manpower)
          OR (v_payrun.sub_type IS NULL AND ec.key = v_payrun.category) -- Fallback: main category (e.g., head_office)
      )
      AND pac.is_enabled = true
    LIMIT 1;

    -- 4. Check Global Override
    SELECT payroll_approvals_enabled INTO v_global_enabled 
    FROM public.org_settings 
    WHERE organization_id = v_org_id;

    -- 5. Determine if workflow is required
    IF v_global_enabled = false THEN
        -- Approvals globally disabled
        v_workflow_id := NULL;
    ELSIF v_config_id IS NOT NULL THEN
        -- Specific config found
        IF v_is_enabled = true THEN
            v_workflow_id := v_wf_id;
        ELSE
            -- Specifically disabled for this type
            v_workflow_id := NULL;
        END IF;
    ELSE
        -- No specific config found for this type.
        -- Per plan, we skip approval for types without a config.
        v_workflow_id := NULL;
    END IF;

    -- 6. Instant Approval Case
    IF v_workflow_id IS NULL THEN
        UPDATE public.pay_runs
        SET 
            approval_status = 'approved',
            status = 'approved', -- Sync both
            approval_current_level = NULL,
            approval_submitted_at = now(),
            approval_submitted_by = auth.uid(),
            approval_last_action_at = now(),
            approved_at = now(),
            approved_by = auth.uid()
        WHERE id = payrun_id_input;

        RETURN jsonb_build_object('success', true, 'status', 'auto_approved');
    END IF;
    
    -- 7. Start Approval Workflow
    -- Clear existing steps if any (resubmit logic)
    DELETE FROM public.payrun_approval_steps WHERE payrun_id = payrun_id_input;
    
    -- Clone Steps from the resolved workflow
    FOR v_step IN 
        SELECT * FROM public.approval_workflow_steps 
        WHERE workflow_id = v_workflow_id 
        ORDER BY level ASC 
    LOOP
        INSERT INTO public.payrun_approval_steps (
            payrun_id,
            level,
            approver_user_id,
            approver_role,
            status
        ) VALUES (
            payrun_id_input,
            v_step.level,
            v_step.approver_user_id,
            v_step.approver_role,
            'pending'
        );
        
        IF v_step.level = 1 THEN
            v_next_approver_id := v_step.approver_user_id;
        END IF;
    END LOOP;
    
    -- 8. Update Payrun Status to Pending
    UPDATE public.pay_runs
    SET 
        approval_status = 'pending_approval',
        status = 'pending_approval',
        approval_current_level = 1,
        approval_submitted_at = now(),
        approval_submitted_by = auth.uid(),
        approval_last_action_at = now(),
        -- Clear previous approval info
        approved_at = NULL,
        approved_by = NULL
    WHERE id = payrun_id_input;
    
    -- 9. Notify First Approver
    IF v_next_approver_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            user_id, type, title, message, metadata
        ) VALUES (
            v_next_approver_id,
            'approval_request',
            'Payrun Approval Required',
            'A payrun requires your approval (Level 1).',
            jsonb_build_object('payrun_id', payrun_id_input, 'type', 'payroll_approval')
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'status', 'submitted', 
        'next_approver', v_next_approver_id, 
        'workflow_id', v_workflow_id
    );
END;
$$;
