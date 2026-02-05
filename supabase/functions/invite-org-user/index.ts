import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3.22.4'
import { Resend } from 'npm:resend'
import { corsHeaders } from '../_shared/cors.ts'

// Input validation schema
const InviteOrgUserSchema = z.object({
    email: z.string().email(),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    orgId: z.string().uuid(),
    companyIds: z.array(z.string().uuid()).default([]),
    roles: z.array(z.string()).min(1),
    sendInvite: z.boolean().default(true),
})

type InviteOrgUserInput = z.infer<typeof InviteOrgUserSchema>

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        console.log('[invite-org-user] Request received')

        // 1. Initialize Supabase Admin Client
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // 2. Authenticate Caller
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            console.error('[invite-org-user] Missing Authorization header')
            return new Response(
                JSON.stringify({ success: false, message: 'Missing Authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const token = authHeader.replace('Bearer ', '')
        const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token)

        if (authError || !caller) {
            console.error('[invite-org-user] Authentication failed:', authError)
            return new Response(
                JSON.stringify({ success: false, message: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log('[invite-org-user] Caller authenticated:', caller.email)

        // 3. Parse & Validate Input
        const body = await req.json()
        const input: InviteOrgUserInput = InviteOrgUserSchema.parse(body)

        console.log('[invite-org-user] Input validated:', {
            email: input.email,
            orgId: input.orgId,
            roles: input.roles,
            companyCount: input.companyIds.length
        })

        // 4. Authorization Check - Org Admin Only
        console.log('[invite-org-user] Checking org admin permissions...')

        const { data: orgUser, error: orgUserError } = await supabaseAdmin
            .from('org_users')
            .select('id')
            .eq('user_id', caller.id)
            .eq('org_id', input.orgId)
            .maybeSingle()

        if (orgUserError) {
            console.error('[invite-org-user] Error fetching org_user:', orgUserError)
            throw orgUserError
        }

        if (!orgUser) {
            console.error('[invite-org-user] Caller is not a member of org:', input.orgId)
            return new Response(
                JSON.stringify({ success: false, message: 'Forbidden: You are not a member of this organization' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const { data: userRoles, error: rolesError } = await supabaseAdmin
            .from('org_user_roles')
            .select('org_roles(key)')
            .eq('org_user_id', orgUser.id)

        if (rolesError) {
            console.error('[invite-org-user] Error fetching user roles:', rolesError)
            throw rolesError
        }

        const roleKeys = (userRoles || []).map((r: any) => r.org_roles?.key)
        const isOrgAdmin = roleKeys.includes('ORG_OWNER') || roleKeys.includes('ORG_ADMIN')

        if (!isOrgAdmin) {
            console.error('[invite-org-user] Caller lacks admin permissions. Roles:', roleKeys)
            return new Response(
                JSON.stringify({ success: false, message: 'Forbidden: Organization admin privileges required' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log('[invite-org-user] Authorization passed. Caller roles:', roleKeys)

        // 5. Check for Existing User
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
        const existingAuthUser = users.find(u => u.email?.toLowerCase() === input.email.toLowerCase())

        if (existingAuthUser) {
            console.log('[invite-org-user] User already exists:', existingAuthUser.id)
            return new Response(
                JSON.stringify({
                    success: false,
                    message: 'User with this email already exists',
                    userId: existingAuthUser.id
                }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 6. Get Organization Name
        const { data: org } = await supabaseAdmin
            .from('organizations')
            .select('name')
            .eq('id', input.orgId)
            .single()

        const orgName = org?.name || 'the organization'

        // Dynamic Base URL detection
        const origin = req.headers.get('origin') || req.headers.get('referer');
        console.log('[invite-org-user] Header-based origin detection:', origin);

        let baseUrl = 'https://payroll.flipafrica.app'; // Production fallback

        if (origin) {
            try {
                const originUrl = new URL(origin);
                // Trust the origin if it's localhost or an authorized domain
                if (originUrl.hostname === 'localhost' ||
                    originUrl.hostname === '127.0.0.1' ||
                    originUrl.hostname.endsWith('.flipafrica.app') ||
                    originUrl.hostname.endsWith('.vercel.app')) {
                    baseUrl = `${originUrl.protocol}//${originUrl.host}`;
                }
            } catch (e) {
                console.warn('[invite-org-user] Failed to parse origin URL:', origin);
            }
        }

        const redirectUrl = `${baseUrl}/accept-invite`;
        console.log('[invite-org-user] Using redirect URL:', redirectUrl);
        const userMetadata = {
            first_name: input.firstName,
            last_name: input.lastName,
            full_name: `${input.firstName} ${input.lastName}`,
            organization_id: input.orgId,
            organization_name: orgName
        }

        // 7. Create Invite Record
        console.log('[invite-org-user] Creating invite record...')

        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7) // 7 day expiry

        const roleData = {
            orgs: [{
                orgId: input.orgId,
                roles: input.roles,
                companyIds: input.companyIds
            }]
        }

        const { data: inviteRecord, error: inviteError } = await supabaseAdmin
            .from('user_invites')
            .insert({
                email: input.email,
                inviter_id: caller.id,
                tenant_id: input.orgId,
                role_data: roleData,
                status: 'pending',
                expires_at: expiresAt.toISOString()
            })
            .select('id')
            .single()

        if (inviteError) {
            console.error('[invite-org-user] Failed to create invite record:', inviteError)
            throw inviteError
        }

        console.log('[invite-org-user] Invite record created:', inviteRecord.id)

        // 8. Create Auth User & Handle Email Delivery
        console.log('[invite-org-user] Preparing auth invite delivery...')

        const resendKey = Deno.env.get('RESEND_API_KEY')
        const shouldSendCustomEmail = input.sendInvite && !!resendKey
        let inviteLink: string | null = null
        let userId: string | null = null
        let emailDelivery: 'resend' | 'supabase' | 'none' = 'none'

        if (!input.sendInvite || shouldSendCustomEmail) {
            console.log('[invite-org-user] Generating auth invite link...')

            const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
                type: 'invite',
                email: input.email,
                options: {
                    redirectTo: redirectUrl,
                    data: userMetadata
                }
            })

            if (linkError) {
                console.error('[invite-org-user] Failed to generate invite link:', linkError)
                throw linkError
            }

            inviteLink = linkData.properties?.action_link ?? null
            userId = linkData.user?.id ?? null
            console.log('[invite-org-user] Auth invite link generated successfully')

            if (shouldSendCustomEmail) {
                if (!inviteLink) {
                    console.error('[invite-org-user] Missing invite link from generateLink response')
                    throw new Error('Invite link missing from auth response')
                }

                console.log('[invite-org-user] Sending invite email via Resend...')
                const resend = new Resend(resendKey!)

                const emailHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
                <h1 style="color: #0066cc; margin-bottom: 20px;">You're Invited!</h1>
                <p>Hi ${input.firstName},</p>
                <p>You've been invited to join <strong>${orgName}</strong> on PayRun Pro.</p>
                <p>Click the button below to accept your invitation and set up your account:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${inviteLink}" 
                     style="background-color: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                    Accept Invitation
                  </a>
                </div>
                <p style="color: #666; font-size: 14px;">This invitation will expire in 7 days.</p>
                <p style="color: #666; font-size: 14px;">If you didn't expect this invitation, you can safely ignore this email.</p>
              </div>
            </body>
          </html>
        `

                try {
                    await resend.emails.send({
                        from: 'PayRun Pro <noreply@payroll.flipafrica.app>',
                        to: input.email,
                        subject: `You're invited to ${orgName}`,
                        html: emailHtml
                    })
                    console.log('[invite-org-user] Email sent successfully via Resend')
                    emailDelivery = 'resend'
                } catch (emailError) {
                    console.error('[invite-org-user] Email send failed (Resend):', emailError)
                    throw emailError
                }
            }
        } else {
            console.log('[invite-org-user] RESEND_API_KEY not set - using Supabase invite email')
            const { data: inviteResponse, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
                input.email,
                {
                    redirectTo: redirectUrl,
                    data: userMetadata
                }
            )

            if (inviteError) {
                console.error('[invite-org-user] Failed to send Supabase invite email:', inviteError)
                throw inviteError
            }

            userId = inviteResponse.user?.id ?? null
            emailDelivery = 'supabase'
        }

        if (!userId) {
            console.warn('[invite-org-user] User ID missing after invite, attempting fallback lookup')
            const { data: { users }, error: fallbackError } = await supabaseAdmin.auth.admin.listUsers()
            if (fallbackError) {
                console.error('[invite-org-user] Fallback listUsers failed:', fallbackError)
                throw fallbackError
            }
            const fallbackUser = users.find(u => u.email?.toLowerCase() === input.email.toLowerCase())
            if (!fallbackUser) {
                console.error('[invite-org-user] Auth user not found after invite flow')
                throw new Error('Failed to create auth user')
            }
            userId = fallbackUser.id
        }

        console.log('[invite-org-user] Auth user created:', userId)

        // 9. Create Visibility Records
        console.log('[invite-org-user] Creating visibility records...')

        // Create user_profiles uses upsert to handle race condition with trigger
        const { error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .upsert({
                id: userId,
                email: input.email,
                first_name: input.firstName,
                last_name: input.lastName,
                organization_id: input.orgId
                // role defaults to 'user' via DB default
            })

        if (profileError) {
            console.error('[invite-org-user] Failed to create user_profiles:', profileError)
            throw profileError
        }

        // Create org_users with status='invited'
        // Upsert here too just in case trigger did something (though trigger usually doesn't create org_users for invited flow)
        // But better safe than sorry
        const { data: orgUserRecord, error: orgUserInsertError } = await supabaseAdmin
            .from('org_users')
            .upsert({
                user_id: userId,
                org_id: input.orgId,
                status: 'invited',
                created_by: caller.id
            }, { onConflict: 'user_id, org_id' })
            .select('id')
            .single()

        if (orgUserInsertError) {
            console.error('[invite-org-user] Failed to create org_users:', orgUserInsertError)
            throw orgUserInsertError
        }

        console.log('[invite-org-user] Visibility records created. User is now visible as "Invited"')

        // 10. Success Response
        console.log('[invite-org-user] Invite completed successfully')

        return new Response(
            JSON.stringify({
                success: true,
                message: 'User invited successfully',
                userId: userId,
                inviteId: inviteRecord.id,
                status: 'invited',
                emailDelivery
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('[invite-org-user] Error:', error)

        if (error instanceof z.ZodError) {
            return new Response(
                JSON.stringify({
                    success: false,
                    message: 'Validation error',
                    errors: error.errors
                }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        return new Response(
            JSON.stringify({
                success: false,
                message: error.message || 'Internal server error'
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
