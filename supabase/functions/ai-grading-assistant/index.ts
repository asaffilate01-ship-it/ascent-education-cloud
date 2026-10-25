import { omniqoraCompletion, OmniqoraError } from '../_shared/omniqora.ts';
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
- Do not infer misconduct or authorship from a score. Human review requires evidence.
- Consider word count compliance
- Keep feedback between 150-300 words
- Do not propose a grade without the approved rubric and actual learner evidence. State what evidence is missing.`

    const userPrompt = `Please generate constructive feedback for this submission:

Student: ${String(studentName || 'Unknown').slice(0, 200)}
Assignment: ${String(assignmentTitle || 'Unknown').slice(0, 200)}
Module: ${String(moduleName || 'Unknown').slice(0, 200)}
Word Count: ${wordCount || 'Unknown'}
Plagiarism Score: ${plagiarismScore || 0}%
${submissionContext ? `Additional Context: ${String(submissionContext).slice(0, 1000)}` : ''}

Generate formative feedback only. Do not issue a grade or misconduct finding.`

    const response = await omniqoraCompletion(req, 'ai-grading-assistant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({

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
      status: error instanceof OmniqoraError ? error.status : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
