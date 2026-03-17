import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { submissionId, studentName, assignmentTitle, wordCount, submissionText } = await req.json()

    if (!submissionId) {
      return new Response(JSON.stringify({ error: 'submissionId is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const systemPrompt = `You are an advanced academic integrity analyzer for UK higher education (OTHM/QUALIFI/IAB). Analyze the following submission for:

1. AI-generated content detection (score 0-100)
2. Plagiarism/similarity indicators (score 0-100)  
3. Flagged passages with reasons
4. Overall integrity score (0=clean, 100=fully plagiarized/AI)

Return ONLY valid JSON in this exact format:
{
  "overall_score": <number 0-100>,
  "ai_generated_score": <number 0-100>,
  "similarity_sources": [{"source": "<description>", "match_percent": <number>}],
  "flagged_passages": [{"text": "<excerpt>", "reason": "<why flagged>", "severity": "low|medium|high"}],
  "summary": "<2-3 sentence summary>",
  "recommendation": "clear|review|investigate|refer"
}`

    const userPrompt = `Analyze this academic submission for plagiarism and AI-generated content:

Student: ${studentName || 'Unknown'}
Assignment: ${assignmentTitle || 'Unknown'}
Word Count: ${wordCount || 'Unknown'}

Submission text (first 3000 chars):
${(submissionText || 'No text provided — analyze based on metadata only. Give conservative estimates.').slice(0, 3000)}

Provide your analysis as JSON.`

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2048,
      }),
    })

    const aiData = await response.json()
    const rawContent = aiData.choices?.[0]?.message?.content || '{}'
    
    // Extract JSON from potential markdown code blocks
    const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, rawContent]
    let analysis
    try {
      analysis = JSON.parse(jsonMatch[1].trim())
    } catch {
      analysis = {
        overall_score: 0,
        ai_generated_score: 0,
        similarity_sources: [],
        flagged_passages: [],
        summary: 'Analysis could not be parsed. Manual review recommended.',
        recommendation: 'review'
      }
    }

    // Save to plagiarism_reports table
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get tenant_id from submission
    const { data: sub } = await supabase.from('submissions').select('tenant_id').eq('id', submissionId).single()

    if (sub) {
      await supabase.from('plagiarism_reports').upsert({
        submission_id: submissionId,
        overall_score: analysis.overall_score || 0,
        ai_generated_score: analysis.ai_generated_score || 0,
        similarity_sources: analysis.similarity_sources || [],
        flagged_passages: analysis.flagged_passages || [],
        status: 'completed',
        analyzed_at: new Date().toISOString(),
        tenant_id: sub.tenant_id,
      }, { onConflict: 'submission_id' })

      // Update submission plagiarism_score
      await supabase.from('submissions').update({
        plagiarism_score: analysis.overall_score || 0,
      }).eq('id', submissionId)
    }

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
