import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";
import { corsHeaders } from "../_shared/cors.ts";
import { authenticateRequest } from "../_shared/auth.ts";

const MODEL = "openai/gpt-transcribe";
const MAX_BYTES = 12 * 1024 * 1024;
const DAILY_LIMIT = 120;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });

const LANGS: Record<string, string> = { en: "en", de: "de", ur: "ur", fr: "fr", ar: "ar" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const auth = await authenticateRequest(req);
  if (auth instanceof Response) return auth;
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return json({ error: "Speech recognition is not configured yet." }, 503);
  const declared = Number(req.headers.get("content-length") || "0");
  if (declared > MAX_BYTES + 64 * 1024) return json({ error: "Recording is too long. Keep answers under 3 minutes." }, 413);

  let form: FormData;
  try { form = await req.formData(); } catch { return json({ error: "Send the recording as a file upload." }, 400); }
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) return json({ error: "No recording was received." }, 400);
  if (file.size > MAX_BYTES) return json({ error: "Recording is too long. Keep answers under 3 minutes." }, 413);
  const lang = LANGS[String(form.get("language") || "en")] || "en";

  const scoped = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization")! } },
  });
  const quota = await scoped.rpc("consume_interactive_lab_ai", { p_daily_limit: DAILY_LIMIT });
  if (quota.error) return json({ error: "Your AI allowance could not be checked. Please try again." }, 503);
  if (quota.data !== true) return json({ error: `You have used today's ${DAILY_LIMIT} AI requests. They reset at midnight Pakistan time.` }, 429);

  const type = file.type.startsWith("video/") ? file.type.replace("video/", "audio/") : (file.type || "audio/webm");
  const ext = type.includes("mp4") || type.includes("m4a") ? "m4a" : type.includes("ogg") ? "ogg" : type.includes("wav") ? "wav" : type.includes("mpeg") ? "mp3" : "webm";
  const upstream = new FormData();
  upstream.append("model", MODEL);
  upstream.append("file", new File([await file.arrayBuffer()], `speech.${ext}`, { type }));
  upstream.append("response_format", "json");
  upstream.append("stream", "true");
  upstream.append("languages", lang);

  let response: Response;
  try {
    response = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "X-Lovable-AIG-SDK": "fetch" }, body: upstream, signal: req.signal,
    });
  } catch {
    return json({ error: "Speech recognition is temporarily unavailable. Please try again." }, 503);
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("interactive-lab-transcribe upstream", response.status, detail.slice(0, 500));
    if (response.status === 400) return json({ error: "That recording could not be understood. Record again a little closer to the microphone." }, 400);
    if (response.status === 429) return json({ error: "Speech recognition is busy. Wait a minute and try again." }, 429);
    if (response.status === 402) return json({ error: "The centre's AI allowance has run out. Please tell your teacher." }, 402);
    return json({ error: "Speech recognition is temporarily unavailable. Please try again." }, 503);
  }

  // Read the SSE stream to the end; transcript.text.done carries the full text.
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "", deltas = "", final = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let index;
      while ((index = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, index).trim();
        buffer = buffer.slice(index + 1);
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        try {
          const event = JSON.parse(data);
          if (event.type === "transcript.text.delta" && typeof event.delta === "string") deltas += event.delta;
          else if (event.type === "transcript.text.done" && typeof event.text === "string") final = event.text;
          else if (event.type === "error" || event.error) throw new Error("stream error");
        } catch (e) { if ((e as Error).message === "stream error") throw e; }
      }
    }
  } catch {
    return json({ error: "Speech recognition stopped part-way. Please try again." }, 503);
  }
  const text = (final || deltas).trim();
  if (!text) return json({ error: "No speech was detected. Check your microphone and speak a little louder." }, 422);
  return json({ text: text.slice(0, 6000) });
});
