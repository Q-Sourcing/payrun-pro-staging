import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3.22.4'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Validation Schema - PLATFORM ONLY
const CreatePlatformUserSchema = z.object({
    email: z.string().email(),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    platformRoles: z.array(z.string()).default([]), // e.g. ['super_admin', 'support_admin']
    sendInvite: z.boolean().default(true)
})

type CreatePlatformUserRequest = z.infer<typeof CreatePlatformUserSchema>

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        console.log('[create-platform-user] Request received')

        // 1. Setup Admin Client
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // 2. Auth Check - PLATFORM ADMIN ONLY
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            console.error('[create-platform-user] Missing Authorization header')
            throw new Error('Missing Authorization header')
        }

        const token = authHeader.replace('Bearer ', '')
        const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token)

        if (authError || !caller) {
            console.error('[create-platform-user] Authentication failed')
            throw new Error('Unauthorized')
        }

        console.log('[create-platform-user] Caller authenticated:', caller.email)

        // Check Platform Admin Permission
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
            console.error('[create-platform-user] User is not a platform admin')
            return new Response(
                JSON.stringify({ success: false, message: 'Forbidden: Platform Admin access required' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log('[create-platform-user] Platform admin authorization passed')

        // 3. Parse & Validate Input
        const body = await req.json()
        const input: CreatePlatformUserRequest = CreatePlatformUserSchema.parse(body)

        console.log('[create-platform-user] Input validated for:', input.email)

        // 4. Check for Existing User
        const { data: existingAuthUser } = await supabaseAdmin.auth.admin.getUserByEmail(input.email)

        if (existingAuthUser?.user) {
            console.log('[create-platform-user] User already exists:', existingAuthUser.user.id)
            return new Response(
                JSON.stringify({
                    success: false,
                    message: 'User with this email already exists',
                    userId: existingAuthUser.user.id
                }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 5. Generate Auth Invite Link
        console.log('[create-platform-user] Generating auth invite link...')

        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'invite',
            email: input.email,
            options: {
                redirectTo: `${req.headers.get('origin') ?? 'https://payroll.flipafrica.app'}/platform-admin`,
                data: {
                    first_name: input.firstName,
                    last_name: input.lastName,
                    full_name: `${input.firstName} ${input.lastName}`,
                    is_platform_user: true
                }
            }
        })

        if (linkError) {
            console.error('[create-platform-user] Failed to generate invite link:', linkError)
            throw linkError
        }

        console.log('[create-platform-user] Auth invite link generated successfully')

        // 6. Get Newly Created Auth User
        const { data: newAuthUser } = await supabaseAdmin.auth.admin.getUserByEmail(input.email)

        if (!newAuthUser?.user) {
            console.error('[create-platform-user] Auth user not found after generateLink')
            throw new Error('Failed to create auth user')
        }

        const userId = newAuthUser.user.id
        console.log('[create-platform-user] Auth user created:', userId)

        // 7. Create Platform User Profile (NO ORG ASSIGNMENT)
        console.log('[create-platform-user] Creating platform user profile...')

        const { error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .insert({
                id: userId,
                email: input.email,
                first_name: input.firstName,
                last_name: input.lastName,
                role: 'admin' // Platform-level admin
            })

        if (profileError) {
            console.error('[create-platform-user] Failed to create user_profiles:', profileError)
            throw profileError
        }

        // 8. Assign Platform Admin Record (if applicable)
        if (input.platformRoles.includes('super_admin') || input.platformRoles.includes('platform_admin')) {
            const { error: platformAdminError } = await supabaseAdmin
                .from('platform_admins')
                .insert({
                    email: input.email,
                    allowed: true
                })

            if (platformAdminError) {
                console.warn('[create-platform-user] Failed to create platform_admins record:', platformAdminError)
                // Don't fail the whole operation
            }
        }

        console.log('[create-platform-user] Platform user created successfully')

        // 9. Success Response (NO EMAIL SENDING - platform admins handle this separately)
        return new Response(
            JSON.stringify({
                success: true,
                message: 'Platform user created successfully',
                userId: userId,
                inviteLink: linkData.properties?.action_link
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('[create-platform-user] Error:', error)

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
