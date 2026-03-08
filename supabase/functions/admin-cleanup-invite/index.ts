import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // Verify caller is authenticated and is an admin
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ success: false, message: 'Unauthorized' }, 401)

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return json({ success: false, message: 'Invalid token' }, 401)

  const { data: pa } = await supabaseAdmin.from('platform_admins').select('allowed').eq('email', user.email).maybeSingle()
  const { data: up } = await supabaseAdmin.from('user_profiles').select('role').eq('id', user.id).maybeSingle()
  const SUPER_ADMINS = ['nalungukevin@gmail.com', 'jovitakanza31@gmail.com']
  const isSuperAdmin = !!pa?.allowed || SUPER_ADMINS.includes(user.email || '') ||
    ['super_admin', 'org_admin', 'PLATFORM_SUPER_ADMIN'].includes(up?.role || '')

  if (!isSuperAdmin) return json({ success: false, message: 'Forbidden' }, 403)

  const { email } = await req.json()
  if (!email) return json({ success: false, message: 'email required' }, 400)

  const normalizedEmail = email.toLowerCase().trim()
  const results: Record<string, unknown> = {}

  // 1. Find auth user by email
  const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
  const authUser = listData?.users?.find((u: { email: string }) => u.email?.toLowerCase() === normalizedEmail)

  if (authUser) {
    const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(authUser.id)
    results.auth_user = delError
      ? `Error deleting: ${delError.message}`
      : `Deleted auth user ${authUser.id} (${authUser.email})`
  } else {
    results.auth_user = 'No auth user found for this email'
  }

  // 2. Delete all invitation records
  const { error: invErr } = await supabaseAdmin
    .from('user_management_invitations')
    .delete()
    .eq('email', normalizedEmail)
  results.invitations = invErr ? `Error: ${invErr.message}` : 'All invitation records deleted'

  // 3. Clean up profiles by email
  const { error: umpErr } = await supabaseAdmin
    .from('user_management_profiles')
    .delete()
    .eq('email', normalizedEmail)
  results.user_management_profiles = umpErr ? `Error: ${umpErr.message}` : 'Cleaned'

  // 4. If auth user existed, also clean by ID
  if (authUser) {
    await supabaseAdmin.from('user_management_profiles').delete().eq('id', authUser.id)
    await supabaseAdmin.from('user_profiles').delete().eq('id', authUser.id)
    results.profiles_by_id = 'Cleaned by ID'
  }

  return json({ success: true, message: `Cleanup complete for ${normalizedEmail}`, results })
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
