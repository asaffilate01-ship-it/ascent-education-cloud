import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const DEV_PASSWORD = 'DevTest123!';

const DEV_ACCOUNTS: { role: string; email: string; label: string }[] = [
  { role: 'superadmin', email: 'dev.superadmin@educloud.test', label: 'Super Admin' },
  { role: 'centre_director', email: 'dev.director@educloud.test', label: 'Centre Director' },
  { role: 'admissions_admin', email: 'dev.admissions@educloud.test', label: 'Admissions' },
  { role: 'lecturer', email: 'dev.lecturer@educloud.test', label: 'Lecturer' },
  { role: 'programme_leader', email: 'dev.programme@educloud.test', label: 'Programme Lead' },
  { role: 'student', email: 'dev.student@educloud.test', label: 'Student' },
  { role: 'finance_officer', email: 'dev.finance@educloud.test', label: 'Finance' },
  { role: 'iqa_officer', email: 'dev.qa@educloud.test', label: 'QA Officer' },
  { role: 'exams_officer', email: 'dev.exams@educloud.test', label: 'Exams' },
  { role: 'marketing_officer', email: 'dev.marketing@educloud.test', label: 'Marketing' },
  { role: 'agent', email: 'dev.agent@educloud.test', label: 'Agent' },
  { role: 'university_partner', email: 'dev.unipartner@educloud.test', label: 'Uni Partner' },
  { role: 'employer_partner', email: 'dev.employer@educloud.test', label: 'Employer' },
  { role: 'parent_guardian', email: 'dev.parent@educloud.test', label: 'Parent' },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Only an authenticated superadmin may seed dev accounts.
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const { data: userData } = await admin.auth.getUser(token);
  const callerId = userData?.user?.id;
  if (!callerId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const { data: isSuper } = await admin.rpc('has_role', {
    _user_id: callerId,
    _role: 'superadmin',
  });
  if (!isSuper) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }


  // Pick a tenant (unipathway if present, else any)
  const { data: tenants } = await admin
    .from('tenants')
    .select('id, slug')
    .limit(50);
  const tenant =
    tenants?.find((t: any) => t.slug === 'unipathway') || tenants?.[0] || null;
  const tenantId = tenant?.id ?? null;

  const results: any[] = [];

  for (const acc of DEV_ACCOUNTS) {
    try {
      let userId: string | null = null;

      // Try to create; if exists, look up
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: acc.email,
        password: DEV_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: acc.label, account_type: acc.role },
      });

      if (createErr) {
        // Find existing user
        const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
        const existing = list?.users.find((u: any) => u.email === acc.email);
        if (existing) {
          userId = existing.id;
          // Reset password to known value
          await admin.auth.admin.updateUserById(existing.id, {
            password: DEV_PASSWORD,
            email_confirm: true,
          });
        }
      } else {
        userId = created.user?.id ?? null;
      }

      if (!userId) {
        results.push({ email: acc.email, ok: false, error: createErr?.message || 'no user' });
        continue;
      }

      // Ensure profile exists + tenant assigned (superadmin stays untenanted)
      const profileTenant = acc.role === 'superadmin' ? null : tenantId;
      await admin
        .from('profiles')
        .upsert(
          {
            user_id: userId,
            email: acc.email,
            full_name: acc.label,
            tenant_id: profileTenant,
          },
          { onConflict: 'user_id' },
        );

      // Wipe default roles and set the intended one
      await admin.from('user_roles').delete().eq('user_id', userId);
      await admin.from('user_roles').insert({
        user_id: userId,
        role: acc.role as any,
        tenant_id: profileTenant,
      });

      results.push({ email: acc.email, ok: true });
    } catch (e: any) {
      results.push({ email: acc.email, ok: false, error: e?.message || String(e) });
    }
  }

  return new Response(
    JSON.stringify({ tenantId, results }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
