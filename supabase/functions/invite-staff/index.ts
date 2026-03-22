import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { authenticateRequest } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Authenticate
  const authResult = await authenticateRequest(req);
  if (authResult instanceof Response) return authResult;

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Check caller has director or superadmin role
  const { data: callerRoles } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', authResult.userId);

  const allowed = (callerRoles || []).some(
    (r: any) => r.role === 'centre_director' || r.role === 'superadmin'
  );
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { email, fullName, role } = await req.json();

  if (!email || !fullName || !role) {
    return new Response(JSON.stringify({ error: 'email, fullName, and role are required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Prevent escalation: directors cannot assign superadmin or centre_director
  const isSuperadmin = (callerRoles || []).some((r: any) => r.role === 'superadmin');
  if (!isSuperadmin && (role === 'superadmin' || role === 'centre_director')) {
    return new Response(JSON.stringify({ error: 'Cannot assign this role' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Get caller's tenant
  const { data: callerProfile } = await supabaseAdmin
    .from('profiles')
    .select('tenant_id')
    .eq('user_id', authResult.userId)
    .single();

  const tenantId = callerProfile?.tenant_id;

  try {
    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u: any) => u.email === email);

    let userId: string;

    if (existing) {
      userId = existing.id;
    } else {
      // Invite user
      const { data: invited, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: fullName, account_type: role },
      });
      if (inviteError) throw inviteError;
      userId = invited.user.id;

      // Update profile with tenant
      await supabaseAdmin
        .from('profiles')
        .update({ full_name: fullName, tenant_id: tenantId })
        .eq('user_id', userId);
    }

    // Assign role (upsert)
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .upsert({ user_id: userId, role, tenant_id: tenantId }, { onConflict: 'user_id,role' });

    if (roleError) throw roleError;

    return new Response(JSON.stringify({ success: true, userId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
