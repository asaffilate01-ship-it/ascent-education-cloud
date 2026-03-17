import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/twilio'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const anonClient = createClient(supabaseUrl, anonKey)
    const token = authHeader.replace('Bearer ', '')
    const { data: claims, error: authError } = await anonClient.auth.getUser(token)
    if (authError || !claims.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

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

    const { to, body, from } = await req.json()

    if (!to || !body) {
      return new Response(JSON.stringify({ error: 'to and body are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const response = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': TWILIO_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: to,
        From: from || Deno.env.get('TWILIO_FROM_NUMBER') || '+15005550006',
        Body: body,
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      return new Response(JSON.stringify({ error: `SMS failed [${response.status}]: ${JSON.stringify(data)}` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ success: true, sid: data.sid }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
