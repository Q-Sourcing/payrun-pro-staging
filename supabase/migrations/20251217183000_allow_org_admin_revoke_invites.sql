-- Allow Org Admins to revoke invites for their own org

ALTER TABLE public.user_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can update invites (revoke)" ON public.user_invites;

DROP POLICY IF EXISTS "Admins and Inviter can update invites (revoke)" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Admins and Inviter can update invites (revoke)" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Admins and Inviter can update invites (revoke)" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Admins and Inviter can update invites (revoke)" ON public.head_office_pay_groups_expatriates; CREATE POLICY "Admins and Inviter can update invites (revoke)"
ON public.user_invites
FOR UPDATE
TO authenticated
USING (
    -- Platform Admin
    (EXISTS (SELECT 1 FROM public.platform_admins WHERE auth_user_id = auth.uid() AND allowed = true))
    OR
    -- Org Admin for the invite's tenant
    (tenant_id IS NOT NULL AND public.is_org_admin(tenant_id))
    OR
    -- The inviter themselves
    (inviter_id = auth.uid())
)
WITH CHECK (
    -- Same condition
    (EXISTS (SELECT 1 FROM public.platform_admins WHERE auth_user_id = auth.uid() AND allowed = true))
    OR
    (tenant_id IS NOT NULL AND public.is_org_admin(tenant_id))
    OR
    (inviter_id = auth.uid())
);
