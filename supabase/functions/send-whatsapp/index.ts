import { corsHeaders, rateLimit, rateLimitResponse, getClientIp } from '../_shared/cors.ts'
import { authenticateRequest } from '../_shared/auth.ts'

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/twilio'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const ip = getClientIp(req)
  if (!rateLimit(ip, 10, 60_000)) return rateLimitResponse()

  try {
    const auth = await authenticateRequest(req)
    if (auth instanceof Response) return auth

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    const TWILIO_API_KEY = Deno.env.get('TWILIO_API_KEY')

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!TWILIO_API_KEY) {
      return new Response(JSON.stringify({ error: 'Twilio not connected. Please connect Twilio in project settings.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { to, body, from, template_sid, template_variables } = await req.json()

    if (!to || (!body && !template_sid)) {
      return new Response(JSON.stringify({ error: 'to and body (or template_sid) are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Basic phone number validation
    const phoneRegex = /^\+?[1-9]\d{6,14}$/
    const cleanTo = to.replace(/[\s-]/g, '')
    if (!phoneRegex.test(cleanTo)) {
      return new Response(JSON.stringify({ error: 'Invalid phone number format. Use E.164 format e.g. +923001234567' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Twilio WhatsApp uses whatsapp: prefix on phone numbers
    const whatsappTo = `whatsapp:${cleanTo.startsWith('+') ? cleanTo : '+' + cleanTo}`
    const whatsappFrom = `whatsapp:${from || Deno.env.get('TWILIO_WHATSAPP_NUMBER') || '+14155238886'}` // Twilio sandbox default

    const params: Record<string, string> = {
      To: whatsappTo,
      From: whatsappFrom,
    }

    // Support both freeform messages and template messages
    if (template_sid) {
      params.ContentSid = template_sid
      if (template_variables) {
        params.ContentVariables = JSON.stringify(template_variables)
      }
    } else {
      params.Body = String(body).slice(0, 1600)
    }

    const response = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': TWILIO_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(params),
    })

    const data = await response.json()
    if (!response.ok) {
      return new Response(JSON.stringify({ error: `WhatsApp send failed [${response.status}]: ${JSON.stringify(data)}` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ success: true, sid: data.sid, channel: 'whatsapp' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})