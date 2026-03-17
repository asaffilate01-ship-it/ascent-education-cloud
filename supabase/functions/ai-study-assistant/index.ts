import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    )
    const token = authHeader.replace('Bearer ', '')
    const { data: claims, error: authError } = await supabase.auth.getUser(token)
    if (authError || !claims.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { question, moduleName, conversationHistory } = await req.json()

    if (!question) {
      return new Response(JSON.stringify({ error: 'question is required' }), {
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

    // Add conversation history if provided
    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory.slice(-10)) {
        messages.push({ role: msg.role, content: msg.content })
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
