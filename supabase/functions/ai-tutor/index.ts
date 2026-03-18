import { corsHeaders, rateLimit, rateLimitResponse, getClientIp } from '../_shared/cors.ts'
import { authenticateRequest } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const ip = getClientIp(req)
  if (!rateLimit(ip, 20, 60_000)) return rateLimitResponse()

  try {
    const auth = await authenticateRequest(req)
    if (auth instanceof Response) return auth

    const { messages } = await req.json()

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Messages array required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Limit conversation history
    const trimmedMessages = messages.slice(-20).map((m: any) => ({
      role: String(m.role).slice(0, 10),
      content: String(m.content).slice(0, 2000),
    }))

    const systemPrompt = `You are an expert AI Study Tutor for a UK higher education college offering OTHM, QUALIFI, and IAB qualifications. You help students understand course material, prepare for assessments, and develop academic skills.

Guidelines:
- Explain concepts clearly with real-world examples relevant to Pakistan's business context
- Use the Socratic method — guide students to answers rather than giving them directly
- Reference UK academic standards and assessment criteria
- Help with essay structure, referencing (Harvard style), and critical analysis
- Provide study tips and exam preparation strategies
- Be encouraging but maintain academic rigour
- If asked to write assignments, refuse and instead help students understand how to approach them
- Keep responses concise but thorough
- Use markdown for formatting when helpful`

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          ...trimmedMessages,
        ],
        stream: true,
      }),
    })

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI usage limit reached.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const t = await response.text()
      console.error('AI gateway error:', response.status, t)
      return new Response(JSON.stringify({ error: 'AI gateway error' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    })
  } catch (error) {
    console.error('ai-tutor error:', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
