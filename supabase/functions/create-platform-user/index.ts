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

        console.log(`Creating/Updating platform user invite: ${input.email}`)

        // 4. Check for Existing User
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
        const existingUser = existingUsers.users.find(u => u.email?.toLowerCase() === input.email.toLowerCase())

        if (existingUser) {
            // If user exists, we might still want to add roles, but for "Invite" flow, 
            // maybe we just add the pending roles to the `user_invites` table? 
            // Or if they are already active, we should just assign them directly? 
            // FOR NOW: Let's assume we proceed with "Deferred" even for existing users, 
            // effectively "Inviting them to a new specific role/org".
            // However, `generateLink` sends a "magic link" / "invite" type.
            // If they are active, they just login. 
            // Complexity: If user exists, simplest path is: 
            // Assign permissions immediately (old flow) OR 
            // create an "invite" to the new org that they must accept?
            // Prompt says: "Every user enters via an invite... User not already active".
            // Step 3.A: "User not already active".
            // If user IS active, we probably shouldn't be using "Invite User" flow for them in the same way.
            // But let's support re-inviting or adding roles. 
            // For strict Enterprise compliance as per prompt: "User | Not already active".
            // If active, return error? Or just Fallback to direct assignment?
            // Let's ERROR if active for "New User Invite".
            // Actually, often you'd invite an existing user to a NEW tenant.
            // Let's BLOCK for now to adhere to "User not already active" per prompt.

            return new Response(JSON.stringify({ success: false, message: 'User already exists. Use "Add Existing User" flow.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // 5. Create Invite Record (Deferred Provisioning)
        // Resolve Org Name for Email
        let inviteOrgName = 'PayRun Pro';
        let tenantId = null;
        if (input.orgs.length > 0) {
            const primaryOrgId = input.orgs[0].orgId;
            tenantId = primaryOrgId; // Assign primary tenant for context
            const { data: org } = await supabaseAdmin.from('organizations').select('name').eq('id', primaryOrgId).single();
            if (org) {
                inviteOrgName = org.name;
            }
        }

        // Calculate Expiry (e.g. 7 days)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const roleData = {
            orgs: input.orgs,
            platformRoles: input.platformRoles,
            firstName: input.firstName, // Store names to apply on acceptance
            lastName: input.lastName
        };

        // Insert into user_invites
        const { data: inviteRecord, error: inviteError } = await supabaseAdmin
            .from('user_invites')
            .insert({
                email: input.email,
                inviter_id: caller.id,
                tenant_id: tenantId,
                role_data: roleData,
                status: 'pending',
                expires_at: expiresAt.toISOString()
            })
            .select('id')
            .single();

        if (inviteError) throw inviteError;

        console.log(`Invite record created: ${inviteRecord.id}`);

        // 6. Generate Auth Invite Link (Supabase)
        // This creates a user in `auth.users` with `invited_at` set foundationally.
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

        // 7. Send Custom Email via Resend
        if (input.sendInvite && linkData.properties?.action_link) {
            const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
            if (RESEND_API_KEY) {
                const resend = new Resend(RESEND_API_KEY);
                const inviteLink = linkData.properties.action_link;

                // Extract token and construct clean frontend URL
                const urlObj = new URL(inviteLink);
                const token = urlObj.searchParams.get('token') || urlObj.searchParams.get('access_token');

                // Construct Frontend URL: /accept-invite?token=...
                const frontendUrl = `${req.headers.get('origin') ?? 'https://payroll.flipafrica.app'}/accept-invite?token=${token}&type=invite&invite_id=${inviteRecord.id}`;

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
                            <p style="color: #666; font-size: 14px;">This link will expire in 7 days.</p>
                            <p style="color: #888; font-size: 12px; margin-top: 32px;">If you did not expect this invitation, you can ignore this email.</p>
                        </div>
                    `
                });
                console.log(`Invite email sent to ${input.email}`);
            } else {
                console.warn('RESEND_API_KEY not set, skipping email.');
            }
        }

        return new Response(
            JSON.stringify({ success: true, inviteId: inviteRecord.id, message: 'Invitation sent successfully' }),
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
