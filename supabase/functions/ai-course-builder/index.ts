import { corsHeaders, rateLimit, rateLimitResponse, getClientIp } from '../_shared/cors.ts'
import { authenticateRequest } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const ip = getClientIp(req)
  if (!rateLimit(ip, 10, 60_000)) return rateLimitResponse()

  try {
    const auth = await authenticateRequest(req)
    if (auth instanceof Response) return auth

    const { action, programmeTitle, level, moduleName, topics, learningOutcomes } = await req.json()

    let systemPrompt = ''
    let userPrompt = ''

    if (action === 'lesson_plan') {
      systemPrompt = `You are an expert UK higher education curriculum designer specializing in OTHM/QUALIFI/IAB qualifications. Generate structured lesson plans that align with UK QAA standards. Return JSON.`
      userPrompt = `Generate a detailed lesson plan for:
Programme: ${String(programmeTitle || '').slice(0, 200)}
Level: ${String(level || '').slice(0, 50)}
Module: ${String(moduleName || '').slice(0, 200)}
Topics: ${String(topics || '').slice(0, 500)}
Learning Outcomes: ${String(learningOutcomes || '').slice(0, 500)}

Return a JSON object with: { title, objectives: string[], duration_minutes, warm_up: string, main_activities: [{activity, duration, resources}], assessment_method, homework, differentiation_notes }`
    } else if (action === 'quiz') {
      systemPrompt = `You are an expert assessment designer for UK higher education. Create varied question types (MCQ, short answer, scenario-based) aligned to Bloom's taxonomy. Return JSON.`
      userPrompt = `Generate a quiz for:
Module: ${String(moduleName || '').slice(0, 200)}
Topics: ${String(topics || '').slice(0, 500)}
Level: ${String(level || '').slice(0, 50)}

Return a JSON object with: { quiz_title, questions: [{type: "mcq"|"short_answer"|"scenario", question, options?: string[], correct_answer, explanation, bloom_level}] } — Generate 8-10 questions.`
    } else if (action === 'learning_path') {
      systemPrompt = `You are a curriculum pathway designer for UK vocational education. Create structured learning progressions. Return JSON.`
      userPrompt = `Generate a learning pathway for:
Programme: ${String(programmeTitle || '').slice(0, 200)}
Level: ${String(level || '').slice(0, 50)}
Modules: ${String(moduleName || '').slice(0, 500)}

Return a JSON object with: { pathway_title, description, weeks: [{week_number, topic, learning_outcomes: string[], activities: string[], resources: string[], assessment: string}] }`
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action. Use: lesson_plan, quiz, or learning_path' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

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
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2048,
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
      throw new Error(`AI gateway error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    // Try to parse JSON from the response
    let parsed = null
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) || content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1] || jsonMatch[0])
      }
    } catch {
      // If JSON parse fails, return raw content
    }

    return new Response(JSON.stringify({ result: parsed || content }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
