import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3.22.4'
import { Resend } from 'npm:resend'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Validation Schema
const OrgAssignmentSchema = z.object({
    orgId: z.string().uuid(),
    companyIds: z.array(z.string().uuid()).default([]),
    roles: z.array(z.string()).min(1, "At least one role required per organization")
})

const CreatePlatformUserSchema = z.object({
    email: z.string().email(),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    orgs: z.array(OrgAssignmentSchema).default([]),
    platformRoles: z.array(z.string()).default([]), // e.g. ['super_admin', 'support_admin']
    sendInvite: z.boolean().default(true)
})

type CreatePlatformUserRequest = z.infer<typeof CreatePlatformUserSchema>

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

        // 2. Auth Check (Platform Admin Only)
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Missing Authorization header')
        const token = authHeader.replace('Bearer ', '')
        const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token)

        if (authError || !caller) throw new Error('Unauthorized')

        // Check caller permission
        const { data: callerProfile } = await supabaseAdmin
            .from('user_profiles')
            .select('role')
            .eq('id', caller.id)
            .maybeSingle()

        const { data: platformAdmin } = await supabaseAdmin
            .from('platform_admins')
            .select('allowed')
            .eq('email', caller.email)
            .maybeSingle()

        const SUPER_ADMIN_EMAILS = ['nalungukevin@gmail.com'];
        const isWhitelisted = SUPER_ADMIN_EMAILS.includes(caller.email || '');
        const isPlatformAdmin = !!platformAdmin?.allowed || callerProfile?.role === 'super_admin' || isWhitelisted;

        if (!isPlatformAdmin) {
            return new Response(JSON.stringify({ success: false, message: 'Forbidden: Platform Admin access required' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // 3. Parse & Validate Input
        const body = await req.json()
        const input = CreatePlatformUserSchema.parse(body)

        console.log(`Creating/Updating platform user: ${input.email}`)

        // 4. Create or Get User
        let userId: string
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
        const existingUser = existingUsers.users.find(u => u.email?.toLowerCase() === input.email.toLowerCase())

        if (existingUser) {
            console.log(`User exists: ${existingUser.id}`)
            userId = existingUser.id
            // Update metadata
            await supabaseAdmin.auth.admin.updateUserById(userId, {
                user_metadata: {
                    first_name: input.firstName,
                    last_name: input.lastName,
                    full_name: `${input.firstName} ${input.lastName}`
                }
            })
        } else {
            console.log(`Creating new user: ${input.email}`)

            // Resolve Organization Name for the invite email
            let inviteOrgName = 'PayRun Pro';
            if (input.orgs.length > 0) {
                const primaryOrgId = input.orgs[0].orgId;
                const { data: org } = await supabaseAdmin.from('organizations').select('name').eq('id', primaryOrgId).single();
                if (org) {
                    inviteOrgName = org.name;
                }
            }

            // Generate Invite Link ensuring we get a valid action_link
            const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
                type: 'invite',
                email: input.email,
                options: {
                    redirectTo: `${req.headers.get('origin') ?? 'https://payroll.flipafrica.app'}/accept-invite`,
                    data: {
                        first_name: input.firstName,
                        last_name: input.lastName,
                        full_name: `${input.firstName} ${input.lastName}`,
                        organization_name: inviteOrgName
                    }
                }
            });

            if (linkError) throw linkError;

            const user = linkData.user;
            userId = user.id;

            // Send Email via Resend if requested
            if (input.sendInvite && linkData.properties?.action_link) {
                const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
                if (RESEND_API_KEY) {
                    const resend = new Resend(RESEND_API_KEY);
                    const inviteLink = linkData.properties.action_link;
                    // Fix: The action_link from generateLink is usually the verification URL itself. 
                    // However, we want to route to our frontend /accept-invite page.
                    // The 'redirectTo' option above tells Supabase where to redirect AFTER verification if using the default flow.
                    // But since we are intercepting, we can construct our own link if we want, OR use the action_link which has the token.
                    // The robust way for "Setup Password" is to extract the token from the action_link query params and construct our clean URL.

                    const urlObj = new URL(inviteLink);
                    const token = urlObj.searchParams.get('token') || urlObj.searchParams.get('access_token');
                    const params = new URLSearchParams(urlObj.search);
                    // We need the 'token_hash' (pkce) or 'access_token' depending on the flow. 
                    // 'invite' type generates a link with `token` (hashed) usually.
                    // Let's rely on the token provided in the link.

                    // Actually, easiest is to pass the whole link or just the token.
                    // Let's pass the token to our custom route.
                    // Standard Supabase invite link: SITE_URL/auth/v1/verify?token=...&type=invite&redirect_to=...

                    // We want: [FRONTEND]/accept-invite?token=...
                    const frontendUrl = `${req.headers.get('origin') ?? 'https://payroll.flipafrica.app'}/accept-invite?token=${token}&type=invite`;

                    await resend.emails.send({
                        from: 'PayRun Pro <onboarding@resend.dev>', // Should be verified domain in prod
                        to: input.email,
                        subject: `You've been invited to ${inviteOrgName}`,
                        html: `
                            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                                <h2>Welcome to PayRun Pro!</h2>
                                <p>You have been invited to join <strong>${inviteOrgName}</strong>.</p>
                                <p>Please click the button below to set up your account and password:</p>
                                <a href="${frontendUrl}" style="display: inline-block; background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">Accept Invitation</a>
                                <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
                                <p style="color: #888; font-size: 12px; margin-top: 32px;">If you did not expect this invitation, you can ignore this email.</p>
                            </div>
                        `
                    });
                    console.log(`Invite email sent to ${input.email}`);
                } else {
                    console.warn('RESEND_API_KEY not set, skipping email.');
                }
            }
        }

        // 5. Update Profile (Global)
        await supabaseAdmin
            .from('user_profiles')
            .upsert({
                id: userId,
                email: input.email,
                first_name: input.firstName,
                last_name: input.lastName,
                role: input.platformRoles.includes('super_admin') ? 'super_admin' : 'employee', // Default to employee if not super admin, specific roles are in org_user_roles
                is_active: true,
                updated_at: new Date().toISOString()
            })

        // 6. Process Org Assignments
        for (const org of input.orgs) {
            console.log(`Processing Org: ${org.orgId}`)

            // A. Add to org_users
            // Check if exists first to avoid error or ust upsert if possible (table might not utilize upsert on simple join?)
            // org_users likely has id, org_id, user_id.
            const { data: existingOrgUser } = await supabaseAdmin
                .from('org_users')
                .select('id')
                .eq('org_id', org.orgId)
                .eq('user_id', userId)
                .maybeSingle()

            let orgUserId = existingOrgUser?.id

            if (!orgUserId) {
                const { data: newOrgUser, error: orgUserError } = await supabaseAdmin
                    .from('org_users')
                    .insert({
                        org_id: org.orgId,
                        user_id: userId,
                        status: 'active'
                    })
                    .select('id')
                    .single()

                if (orgUserError) throw orgUserError
                orgUserId = newOrgUser.id
            }

            // B. Companies
            // First, remove existing memberships for this org? Or just append?
            // "Platform Admins may assign across all orgs" - Step 3: "Allow: One, Multiple, All"
            // Simplest approach: sync. (Get existing for this org, remove ones not in list, add new ones)

            // Get existing company memberships for this user AND this org's companies
            // (This requires a join or two-step query)
            // Simpler: Just upsert the ones requested.
            if (org.companyIds.length > 0) {
                const memberships = org.companyIds.map(companyId => ({
                    user_id: userId,
                    company_id: companyId,
                    role: 'employee' // Default role in membership table (if column exists), actual roles are in org_user_roles
                }))

                const { error: companyError } = await supabaseAdmin
                    .from('user_company_memberships')
                    .upsert(memberships, { onConflict: 'user_id, company_id' })

                if (companyError) throw companyError
            }

            // C. Roles
            // org_user_roles uses (org_user_id, role_id)
            // We need to resolve role keys (strings) to role_ids (UUIDs)

            // Delete existing roles first (Full Sync)
            const { error: deleteRolesError } = await supabaseAdmin
                .from('org_user_roles')
                .delete()
                .eq('org_user_id', orgUserId)

            if (deleteRolesError) console.error('Error clearing old roles:', deleteRolesError)

            if (org.roles.length > 0) {
                // 1. Fetch Role IDs for the keys
                const { data: roleRecords, error: fetchRolesError } = await supabaseAdmin
                    .from('org_roles')
                    .select('id, key')
                    .eq('org_id', org.orgId)
                    .in('key', org.roles)

                if (fetchRolesError) throw fetchRolesError

                const roleIds = roleRecords?.map(r => r.id) || []

                if (roleIds.length > 0) {
                    const roleInserts = roleIds.map(roleId => ({
                        org_user_id: orgUserId,
                        role_id: roleId
                    }))

                    const { error: roleError } = await supabaseAdmin
                        .from('org_user_roles')
                        .insert(roleInserts)

                    if (roleError) console.error('Error assigning roles:', roleError)
                } else {
                    console.warn(`No matching roles found for keys: ${org.roles.join(', ')} in org ${org.orgId}`)
                }
            }
        }

        // 7. Platform Roles
        if (input.platformRoles.length > 0) {
            // Upsert platform_admins
            const { error: platformError } = await supabaseAdmin
                .from('platform_admins')
                .upsert({
                    auth_user_id: userId,
                    email: input.email,
                    allowed: true,
                    role: input.platformRoles.includes('super_admin') ? 'super_admin' : 'support_admin'
                }, { onConflict: 'email' })

            if (platformError) throw platformError
        }

        return new Response(
            JSON.stringify({ success: true, userId, message: 'Platform user processed successfully' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('Create Platform User Error:', error)
        return new Response(
            JSON.stringify({ success: false, message: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
