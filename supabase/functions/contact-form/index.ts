import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, rateLimit, rateLimitResponse, getClientIp } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const ip = getClientIp(req)
  // Strict rate limit for public form — 5 submissions per minute
  if (!rateLimit(ip, 5, 60_000)) return rateLimitResponse()

  try {
    const { name, email, phone, subject, message, tenant_slug } = await req.json()

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: 'name, email, and message are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Input validation
    if (typeof name !== 'string' || name.length > 200) {
      return new Response(JSON.stringify({ error: 'Invalid name' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email) || email.length > 254) {
      return new Response(JSON.stringify({ error: 'Invalid email address' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (typeof message !== 'string' || message.length > 5000) {
      return new Response(JSON.stringify({ error: 'Message too long (max 5000 chars)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    let tenantId = null
    if (tenant_slug && typeof tenant_slug === 'string') {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', tenant_slug)
        .single()
      tenantId = tenant?.id || null
    }

    const { data, error } = await supabase.from('applications').insert({
      student_name: name.slice(0, 200),
      email: email.slice(0, 254),
      phone: phone ? String(phone).slice(0, 20) : null,
      source: 'contact_form',
      notes: `Subject: ${String(subject || 'General Enquiry').slice(0, 200)}\n\n${message.slice(0, 5000)}`,
      stage: 'lead',
      tenant_id: tenantId,
    }).select().single()

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
