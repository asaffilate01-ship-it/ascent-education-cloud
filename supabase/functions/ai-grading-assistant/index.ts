import { corsHeaders, rateLimit, rateLimitResponse, getClientIp } from '../_shared/cors.ts'
import { authenticateRequest } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const ip = getClientIp(req)
  if (!rateLimit(ip, 15, 60_000)) return rateLimitResponse()

  try {
    const auth = await authenticateRequest(req)
    if (auth instanceof Response) return auth

    const { studentName, assignmentTitle, moduleName, wordCount, plagiarismScore, submissionContext } = await req.json()

    const systemPrompt = `You are an experienced UK higher education lecturer providing constructive feedback on student assignments. You follow UK academic standards (OTHM/QUALIFI/IAB awarding bodies). Be professional, encouraging, and specific.

Guidelines:
- Reference learning outcomes and assessment criteria
- Use the "sandwich" method: strength → improvement area → encouragement
- Suggest specific improvements with examples
- Flag academic integrity concerns if plagiarism score is high
- Consider word count compliance
- Keep feedback between 150-300 words
- End with a suggested grade band: Distinction (70-100), Merit (60-69), Pass (40-59), Refer (0-39)`

    const userPrompt = `Please generate constructive feedback for this submission:

Student: ${String(studentName || 'Unknown').slice(0, 200)}
Assignment: ${String(assignmentTitle || 'Unknown').slice(0, 200)}
Module: ${String(moduleName || 'Unknown').slice(0, 200)}
Word Count: ${wordCount || 'Unknown'}
Plagiarism Score: ${plagiarismScore || 0}%
${submissionContext ? `Additional Context: ${String(submissionContext).slice(0, 1000)}` : ''}

Generate detailed, actionable feedback with a suggested grade band.`

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
        max_tokens: 1024,
      }),
    })

    const data = await response.json()
    const feedback = data.choices?.[0]?.message?.content || 'Unable to generate feedback. Please try again.'

    return new Response(JSON.stringify({ feedback }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
