import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { studentName, assignmentTitle, moduleName, wordCount, plagiarismScore, submissionContext } = await req.json();

    const systemPrompt = `You are an experienced UK higher education lecturer providing constructive feedback on student assignments. You follow UK academic standards (OTHM/QUALIFI/IAB awarding bodies). Be professional, encouraging, and specific.

Guidelines:
- Reference learning outcomes and assessment criteria
- Use the "sandwich" method: strength → improvement area → encouragement
- Suggest specific improvements with examples
- Flag academic integrity concerns if plagiarism score is high
- Consider word count compliance
- Keep feedback between 150-300 words
- End with a suggested grade band: Distinction (70-100), Merit (60-69), Pass (40-59), Refer (0-39)`;

    const userPrompt = `Please generate constructive feedback for this submission:

Student: ${studentName}
Assignment: ${assignmentTitle}
Module: ${moduleName}
Word Count: ${wordCount}
Plagiarism Score: ${plagiarismScore}%
${submissionContext ? `Additional Context: ${submissionContext}` : ''}

Generate detailed, actionable feedback with a suggested grade band.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    const data = await response.json();
    const feedback = data.choices?.[0]?.message?.content || "Unable to generate feedback. Please try again.";

    return new Response(JSON.stringify({ feedback }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
