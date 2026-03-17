import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, rateLimit, rateLimitResponse, getClientIp } from '../_shared/cors.ts'
import { authenticateRequest } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const ip = getClientIp(req)
  if (!rateLimit(ip, 20, 60_000)) return rateLimitResponse()

  try {
    const auth = await authenticateRequest(req)
    if (auth instanceof Response) return auth

    const { question, moduleName, conversationHistory } = await req.json()

    if (!question || typeof question !== 'string' || question.length > 5000) {
      return new Response(JSON.stringify({ error: 'Valid question is required (max 5000 chars)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const systemPrompt = `You are a knowledgeable, supportive AI study assistant for UK higher education students studying OTHM, QUALIFI, and IAB accredited programmes. 

Your role:
- Help students understand concepts, not give them answers to copy
- Use the Socratic method — guide with questions when appropriate
- Reference UK academic frameworks and learning outcomes
- Suggest study techniques, revision strategies, and resources
- If asked about assignments, help them understand requirements but never write their work
- Be encouraging and patient
- Use British English spelling and terminology
- Keep responses concise but thorough (150-300 words)
${moduleName ? `\nThe student is studying: ${moduleName}` : ''}`

    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
    ]

    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory.slice(-10)) {
        if (msg.role && msg.content) {
          messages.push({ role: msg.role, content: String(msg.content).slice(0, 2000) })
        }
      }
    }

    messages.push({ role: 'user', content: question })

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    })

    const data = await response.json()
    const answer = data.choices?.[0]?.message?.content || 'Sorry, I could not generate an answer. Please try again.'

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
