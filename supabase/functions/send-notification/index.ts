import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, rateLimit, rateLimitResponse, getClientIp } from '../_shared/cors.ts'
import { authenticateRequest } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const ip = getClientIp(req)
  if (!rateLimit(ip, 30, 60_000)) return rateLimitResponse()

  try {
    const auth = await authenticateRequest(req)
    if (auth instanceof Response) return auth

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { user_id, title, message, type = 'system', severity = 'info', tenant_id } = await req.json()

    if (!user_id || !title || !message) {
      return new Response(JSON.stringify({ error: 'user_id, title, and message are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(user_id)) {
      return new Response(JSON.stringify({ error: 'Invalid user_id format' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const validTypes = ['system', 'academic', 'finance', 'compliance', 'social']
    const validSeverities = ['info', 'success', 'warning', 'error']

    const { data, error } = await supabase.from('notifications').insert({
      user_id,
      title: String(title).slice(0, 200),
      message: String(message).slice(0, 1000),
      type: validTypes.includes(type) ? type : 'system',
      severity: validSeverities.includes(severity) ? severity : 'info',
      tenant_id: tenant_id || null,
    }).select().single()

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ success: true, notification: data }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
