import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, rateLimit, rateLimitResponse, getClientIp } from '../_shared/cors.ts'
import { authenticateRequest } from '../_shared/auth.ts'

async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
  const TWILIO_API_KEY = Deno.env.get('TWILIO_API_KEY')
  if (!LOVABLE_API_KEY || !TWILIO_API_KEY) return false

  try {
    const cleanPhone = phone.replace(/[\s-]/g, '')
    const whatsappTo = `whatsapp:${cleanPhone.startsWith('+') ? cleanPhone : '+' + cleanPhone}`
    const whatsappFrom = `whatsapp:${Deno.env.get('TWILIO_WHATSAPP_NUMBER') || '+14155238886'}`

    const response = await fetch('https://connector-gateway.lovable.dev/twilio/Messages.json', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': TWILIO_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: whatsappTo,
        From: whatsappFrom,
        Body: String(message).slice(0, 1600),
      }),
    })
    return response.ok
  } catch {
    return false
  }
}

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

    const { user_id, title, message, type = 'system', severity = 'info', tenant_id, send_whatsapp = false, phone } = await req.json()

    if (!user_id || !title || !message) {
      return new Response(JSON.stringify({ error: 'user_id, title, and message are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

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

    let whatsappSent = false
    if (send_whatsapp && phone) {
      const waMessage = `📢 *${String(title).slice(0, 100)}*\n\n${String(message).slice(0, 500)}`
      whatsappSent = await sendWhatsApp(phone, waMessage)
    }

    return new Response(JSON.stringify({ success: true, notification: data, whatsapp_sent: whatsappSent }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})