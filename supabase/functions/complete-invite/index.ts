import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3.22.4'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Setup Admin Client
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // 2. Auth Check - User MUST be authenticated (they just set password and logged in)
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Missing Authorization header')
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

        if (authError || !user) throw new Error('Unauthorized')

        console.log(`Processing complete-invite for user: ${user.email}`)

        // 3. Find Pending Invite
        // Match by email and status 'pending'
        const { data: invite, error: inviteError } = await supabaseAdmin
            .from('user_invites')
            .select('*')
            .eq('email', user.email)
            .eq('status', 'pending')
            .maybeSingle()

        if (inviteError) throw inviteError

        if (!invite) {
            // Check if already accepted to be idempotent
            const { data: acceptedInvite } = await supabaseAdmin
                .from('user_invites')
                .select('*')
                .eq('email', user.email)
                .eq('status', 'accepted')
                .maybeSingle()

            if (acceptedInvite) {
                return new Response(JSON.stringify({ success: true, message: 'Invite already accepted.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
            }
            throw new Error('No pending invite found for this email.')
        }

        // 4. Validate Expiry
        if (new Date(invite.expires_at) < new Date()) {
            await supabaseAdmin.from('user_invites').update({ status: 'expired' }).eq('id', invite.id);
            throw new Error('Invitation has expired. Please request a new one.');
        }

        // 5. Provision Access based on `role_data`
        const roleData = invite.role_data; // { orgs: [], platformRoles: [] }
        const userId = user.id;

        // A. Platform Roles
        if (roleData.platformRoles && roleData.platformRoles.length > 0) {
            await supabaseAdmin
                .from('platform_admins')
                .upsert({
                    auth_user_id: userId,
                    email: user.email,
                    allowed: true,
                    role: roleData.platformRoles.includes('super_admin') ? 'super_admin' : 'support_admin'
                }, { onConflict: 'email' })
        }

        // B. Org Assignments
        if (roleData.orgs && Array.isArray(roleData.orgs)) {
            for (const org of roleData.orgs) {
                // 1. Create org_users entry
                const { data: newOrgUser, error: orgUserError } = await supabaseAdmin
                    .from('org_users')
                    .upsert({
                        org_id: org.orgId,
                        user_id: userId,
                        status: 'active'
                    }, { onConflict: 'org_id, user_id' }) // Assuming unique constraint exists
                    .select('id')
                    .single()

                if (orgUserError) throw orgUserError;
                const orgUserId = newOrgUser.id;

                // 2. Roles
                if (org.roles && org.roles.length > 0) {
                    // Fetch Role IDs
                    const { data: roleRecords } = await supabaseAdmin
                        .from('org_roles')
                        .select('id, key')
                        .eq('org_id', org.orgId)
                        .in('key', org.roles)

                    if (roleRecords && roleRecords.length > 0) {
                        const roleInserts = roleRecords.map(r => ({
                            org_user_id: orgUserId,
                            role_id: r.id
                        }))
                        // Clear old and insert new (or just insert)
                        await supabaseAdmin.from('org_user_roles').delete().eq('org_user_id', orgUserId);
                        await supabaseAdmin.from('org_user_roles').insert(roleInserts);
                    }
                }

                // 3. Companies
                if (org.companyIds && org.companyIds.length > 0) {
                    const memberships = org.companyIds.map((cId: string) => ({
                        user_id: userId,
                        company_id: cId,
                        role: 'employee'
                    }))
                    await supabaseAdmin.from('user_company_memberships').delete().eq('user_id', userId).in('company_id', org.companyIds); // Optional clear
                    await supabaseAdmin.from('user_company_memberships').upsert(memberships);
                }
            }
        }

        // 6. Update User Profile if names provided
        if (roleData.firstName || roleData.lastName) {
            await supabaseAdmin.from('user_profiles').update({
                first_name: roleData.firstName,
                last_name: roleData.lastName,
                is_active: true
            }).eq('id', userId)
        } else {
            await supabaseAdmin.from('user_profiles').update({ is_active: true }).eq('id', userId)
        }

        // 7. Mark Invite Accepted
        await supabaseAdmin
            .from('user_invites')
            .update({
                status: 'accepted',
                accepted_at: new Date().toISOString()
            })
            .eq('id', invite.id)

        // 8. Log Audit (Optional/Future)
        // await logAudit(...)

        return new Response(
            JSON.stringify({ success: true, message: 'Onboarding complete' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('Complete Invite Error:', error)
        return new Response(
            JSON.stringify({ success: false, message: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
