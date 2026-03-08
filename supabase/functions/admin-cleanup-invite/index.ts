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

  // Verify caller is a platform admin
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ success: false, message: 'Unauthorized' }, 401)

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return json({ success: false, message: 'Invalid token' }, 401)

  const { data: pa } = await supabaseAdmin.from('platform_admins').select('allowed').eq('email', user.email).maybeSingle()
  const { data: up } = await supabaseAdmin.from('user_profiles').select('role').eq('id', user.id).maybeSingle()
  const SUPER_ADMINS = ['nalungukevin@gmail.com']
  const isSuperAdmin = !!pa?.allowed || SUPER_ADMINS.includes(user.email || '') ||
    ['super_admin', 'org_admin'].includes(up?.role || '')

  if (!isSuperAdmin) return json({ success: false, message: 'Forbidden' }, 403)

  const { email } = await req.json()
  if (!email) return json({ success: false, message: 'email required' }, 400)

  const results: Record<string, unknown> = {}

  // 1. Find and delete auth user
  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
  const authUser = authUsers?.users?.find((u: { email: string }) => u.email?.toLowerCase() === email.toLowerCase())

  if (authUser) {
    const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(authUser.id)
    results.auth_user_deleted = delError ? `Error: ${delError.message}` : `Deleted auth user ${authUser.id}`
  } else {
    results.auth_user_deleted = 'No auth user found'
  }

  // 2. Delete all invitation records for this email
  const { error: invErr, count } = await supabaseAdmin
    .from('user_management_invitations')
    .delete()
    .eq('email', email.toLowerCase())
  results.invitations_deleted = invErr ? `Error: ${invErr.message}` : `Deleted ${count ?? 'all'} invitation(s)`

  // 3. Delete user_management_profiles if exists
  if (authUser) {
    await supabaseAdmin.from('user_management_profiles').delete().eq('id', authUser.id)
    await supabaseAdmin.from('user_profiles').delete().eq('id', authUser.id)
  }
  const { error: profileEmailErr } = await supabaseAdmin.from('user_management_profiles').delete().eq('email', email.toLowerCase())
  results.profiles_cleaned = profileEmailErr ? `Error: ${profileEmailErr.message}` : 'Profiles cleaned'

  return json({ success: true, results })
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
