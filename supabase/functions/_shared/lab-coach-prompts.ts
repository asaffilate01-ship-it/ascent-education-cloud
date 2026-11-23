// Pure request validation and prompt building for the interactive lab coach (unit tested).
export type CoachAction = "hint" | "prompt_task" | "speaking_feedback" | "conversation" | "playground";
const ACTIONS: CoachAction[] = ["hint", "prompt_task", "speaking_feedback", "conversation", "playground"];

const str = (value: unknown, max: number, field: string, required = true) => {
  if (value === undefined || value === null || value === "") {
    if (required) throw new Error(`Missing ${field}`);
    return "";
  }
  if (typeof value !== "string") throw new Error(`Invalid ${field}`);
  if (value.length > max) throw new Error(`${field} is too long`);
  return value.trim();
};

export function parseCoachRequest(body: unknown) {
  if (!body || typeof body !== "object") throw new Error("Invalid request");
  const b = body as Record<string, unknown>;
  const action = b.action as CoachAction;
  if (!ACTIONS.includes(action)) throw new Error("Unknown coach action");
  if (action === "hint") return { action, title: str(b.title, 200, "title"), brief: str(b.brief, 4000, "brief"), code: str(b.code, 12000, "code", false), output: str(b.output, 4000, "output", false) };
  if (action === "prompt_task") {
    const rubric = Array.isArray(b.rubric) ? b.rubric.slice(0, 6).map((r, i) => str(r, 300, `rubric ${i + 1}`)) : [];
    if (!rubric.length) throw new Error("Missing rubric");
    return { action, task: str(b.task, 3000, "task"), input: str(b.input, 6000, "input", false), rubric, prompt: str(b.prompt, 4000, "prompt") };
  }
  if (action === "speaking_feedback") return { action, prompt: str(b.prompt, 1500, "prompt"), transcript: str(b.transcript, 6000, "transcript"), language: str(b.language, 20, "language", false) || "English" };
  if (action === "conversation") {
    const raw = Array.isArray(b.messages) ? b.messages : [];
    if (!raw.length || raw.length > 24) throw new Error("Conversation must have 1–24 turns");
    const messages = raw.map((m, i) => {
      const role = (m as { role?: unknown })?.role;
      if (role !== "user" && role !== "assistant") throw new Error(`Invalid role in turn ${i + 1}`);
      return { role, content: str((m as { content?: unknown }).content, 1500, `turn ${i + 1}`) } as { role: "user" | "assistant"; content: string };
    });
    if (messages[messages.length - 1].role !== "user") throw new Error("The last turn must be the learner's");
    return { action, scenario: str(b.scenario, 600, "scenario"), language: str(b.language, 20, "language", false) || "English", messages };
  }
  return { action, system: str(b.system, 2000, "system", false), prompt: str(b.prompt, 4000, "prompt") };
}

export const HINT_SYSTEM = `You are a patient programming tutor for students in Pakistan learning in UK English.
Give ONE short, encouraging hint (max 90 words) that moves the learner to the next step.
Never write the full solution or complete code. You may show at most one line of illustrative code.
If there is an error message, explain in plain words what it means first.`;

export const PROMPT_RUN_SYSTEM = `Follow the user's prompt exactly as written. Keep the answer under 250 words.`;

export const PROMPT_GRADE_SYSTEM = `You assess prompt-engineering exercises for learners. Judge the learner's PROMPT (and the output it produced) against each rubric criterion.
Be fair and specific. Score 0-100. Feedback in UK English, friendly, max 2 sentences per criterion. "advice" is one concrete improvement (max 50 words).`;

export const SPEAKING_SYSTEM = (language: string) => `You are an experienced ${language} speaking examiner and coach. The learner answered a speaking prompt; you receive an automatic transcript of their speech (it may contain recognition errors, so do not penalise obvious transcription glitches).
Estimate IELTS-style bands (0-9, halves allowed) for fluency_coherence, lexical_resource, grammar. "overall" is their average rounded to the nearest half.
Give 2 strengths, 3 specific improvements quoting the learner's words where useful, and an improved model answer of similar length at about one band higher. Write feedback in UK English${language === "English" ? "" : `, with the model answer in ${language}`}.
These are practice estimates, not official scores.`;

export const CONVERSATION_SYSTEM = (scenario: string, language: string) => `You are a friendly conversation partner in a language-lab role-play.
Scenario: ${scenario}
Speak only ${language}. Keep each reply to 1-3 short sentences and end with a question so the learner keeps talking. Adapt to the learner's level.
In "tip", give one short correction or better phrasing of the learner's LAST message in UK English (max 30 words), or praise if it was correct.`;

export const GRADE_SCHEMA = {
  type: "object", additionalProperties: false, required: ["score", "criteria", "advice"],
  properties: {
    score: { type: "number" },
    advice: { type: "string" },
    criteria: { type: "array", items: { type: "object", additionalProperties: false, required: ["criterion", "met", "comment"],
      properties: { criterion: { type: "string" }, met: { type: "boolean" }, comment: { type: "string" } } } },
  },
};
export const SPEAKING_SCHEMA = {
  type: "object", additionalProperties: false,
  required: ["overall", "fluency_coherence", "lexical_resource", "grammar", "strengths", "improvements", "model_answer"],
  properties: {
    overall: { type: "number" }, fluency_coherence: { type: "number" }, lexical_resource: { type: "number" }, grammar: { type: "number" },
    strengths: { type: "array", items: { type: "string" } }, improvements: { type: "array", items: { type: "string" } }, model_answer: { type: "string" },
  },
};
export const CONVERSATION_SCHEMA = {
  type: "object", additionalProperties: false, required: ["reply", "tip"],
  properties: { reply: { type: "string" }, tip: { type: "string" } },
};

export const clampBand = (n: unknown) => {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return Math.round(Math.min(9, Math.max(0, v)) * 2) / 2;
};
export const clampScore = (n: unknown) => {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return Math.round(Math.min(100, Math.max(0, v)));
};
