import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";
import { corsHeaders } from "../_shared/cors.ts";
import { authenticateRequest } from "../_shared/auth.ts";
import { GatewayError, labObject, labText } from "../_shared/lab-responses.ts";
import {
  clampBand, clampScore, CONVERSATION_SCHEMA, CONVERSATION_SYSTEM, GRADE_SCHEMA, HINT_SYSTEM,
  parseCoachRequest, PROMPT_GRADE_SYSTEM, PROMPT_RUN_SYSTEM, SPEAKING_SCHEMA, SPEAKING_SYSTEM,
} from "../_shared/lab-coach-prompts.ts";

const DAILY_LIMIT = 120;
const headers = { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store", "Access-Control-Expose-Headers": "X-Lovable-AIG-Run-ID" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const auth = await authenticateRequest(req);
  if (auth instanceof Response) return auth;
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return json({ error: "The AI coach is not configured yet." }, 503);

  const raw = await req.text();
  if (raw.length > 60000) return json({ error: "That request is too long. Shorten your code or text." }, 413);
  let input;
  try { input = parseCoachRequest(JSON.parse(raw)); }
  catch (e) { return json({ error: e instanceof Error ? e.message : "Invalid request" }, 400); }

  const scoped = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization")! } },
  });
  const quota = await scoped.rpc("consume_interactive_lab_ai", { p_daily_limit: DAILY_LIMIT });
  if (quota.error) return json({ error: "Your AI allowance could not be checked. Please try again." }, 503);
  if (quota.data !== true) return json({ error: `You have used today's ${DAILY_LIMIT} AI coach requests. They reset at midnight Pakistan time.` }, 429);

  try {
    switch (input.action) {
      case "hint": {
        const hint = await labText(req, apiKey, HINT_SYSTEM, [{ role: "user", content:
          `Exercise: ${input.title}\nBrief: ${input.brief}\n\nLearner's code:\n${input.code || "(empty)"}\n\nLatest output or check results:\n${input.output || "(none)"}` }]);
        return json({ hint });
      }
      case "prompt_task": {
        const userContent = input.input ? `${input.prompt}\n\n---\n${input.input}` : input.prompt;
        const output = await labText(req, apiKey, PROMPT_RUN_SYSTEM, [{ role: "user", content: userContent }]);
        const grade = await labObject<{ score: number; advice: string; criteria: { criterion: string; met: boolean; comment: string }[] }>(
          req, apiKey, PROMPT_GRADE_SYSTEM,
          [{ role: "user", content: `Task: ${input.task}\n\nRubric:\n${input.rubric.map((r, i) => `${i + 1}. ${r}`).join("\n")}\n\nLearner's prompt:\n${input.prompt}\n\nSample input given to the AI:\n${input.input || "(none)"}\n\nOutput produced:\n${output}` }],
          GRADE_SCHEMA);
        return json({ output, score: clampScore(grade.score), advice: String(grade.advice || "").slice(0, 600),
          criteria: (grade.criteria || []).slice(0, 8).map((c) => ({ criterion: String(c.criterion).slice(0, 300), met: !!c.met, comment: String(c.comment).slice(0, 400) })) });
      }
      case "speaking_feedback": {
        const r = await labObject<Record<string, unknown>>(req, apiKey, SPEAKING_SYSTEM(input.language),
          [{ role: "user", content: `Speaking prompt: ${input.prompt}\n\nTranscript of the learner's answer:\n${input.transcript}` }], SPEAKING_SCHEMA);
        const list = (v: unknown, n: number) => (Array.isArray(v) ? v : []).slice(0, n).map((x) => String(x).slice(0, 400));
        return json({ overall: clampBand(r.overall), fluency_coherence: clampBand(r.fluency_coherence), lexical_resource: clampBand(r.lexical_resource),
          grammar: clampBand(r.grammar), strengths: list(r.strengths, 3), improvements: list(r.improvements, 4), model_answer: String(r.model_answer || "").slice(0, 3000) });
      }
      case "conversation": {
        const r = await labObject<{ reply: string; tip: string }>(req, apiKey, CONVERSATION_SYSTEM(input.scenario, input.language), input.messages, CONVERSATION_SCHEMA);
        return json({ reply: String(r.reply || "").slice(0, 1200), tip: String(r.tip || "").slice(0, 400) });
      }
      case "playground": {
        const output = await labText(req, apiKey, input.system || "You are a helpful assistant. Keep answers under 300 words.", [{ role: "user", content: input.prompt }]);
        return json({ output });
      }
    }
  } catch (e) {
    if (e instanceof GatewayError) return json({ error: e.message }, e.status === 429 || e.status === 402 || e.status === 403 ? e.status : 503);
    if ((e as Error)?.name === "AbortError") return json({ error: "Request cancelled" }, 499);
    console.error("interactive-lab-coach", e);
    return json({ error: "The AI coach is temporarily unavailable. Please try again shortly." }, 503);
  }
});
