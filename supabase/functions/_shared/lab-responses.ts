// Request-scoped Lovable AI Gateway Responses calls for the interactive labs.
import { createOpenAI } from "npm:@ai-sdk/openai@3";
import { jsonSchema, Output, streamText, type ModelMessage } from "npm:ai@6";
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId } from "./lab-run-id.ts";

export const LAB_MODEL = "openai/gpt-6-astra";
const GATEWAY = "https://ai.gateway.lovable.dev/v1";

function provider(request: Request, apiKey: string) {
  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
  return createOpenAI({
    baseURL: GATEWAY,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });
}

const options = {
  openai: {
    forceReasoning: true,
    reasoningEffort: "low",
    reasoningSummary: "auto",
    store: false,
    include: ["reasoning.encrypted_content"],
  },
};

export class GatewayError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function wrap(error: unknown): never {
  const e = error as { statusCode?: number; status?: number; message?: string; responseBody?: string; lastError?: unknown };
  const inner = (e?.lastError ?? e) as typeof e;
  const status = inner?.statusCode ?? inner?.status ?? 503;
  let message = "The AI coach is temporarily unavailable. Please try again shortly.";
  if (status === 429) message = "The AI coach is busy. Please wait a minute and try again.";
  if (status === 402) message = "The centre's AI allowance has run out. Please tell your teacher.";
  if (status === 403) message = "The AI coach is not enabled for this centre right now.";
  throw new GatewayError(status, message);
}

export async function labText(request: Request, apiKey: string, system: string, messages: ModelMessage[]) {
  try {
    const result = streamText({
      model: provider(request, apiKey).responses(LAB_MODEL),
      system,
      messages,
      abortSignal: request.signal,
      providerOptions: options,
    });
    const text = (await result.text).trim();
    if (!text) throw new GatewayError(502, "The AI coach returned no answer. Please try again.");
    return text;
  } catch (error) {
    if (error instanceof GatewayError) throw error;
    wrap(error);
  }
}

export async function labObject<T>(request: Request, apiKey: string, system: string, messages: ModelMessage[], schema: Record<string, unknown>) {
  try {
    const result = streamText({
      model: provider(request, apiKey).responses(LAB_MODEL),
      system,
      messages,
      abortSignal: request.signal,
      providerOptions: options,
      output: Output.object({ schema: jsonSchema<T>(schema as never) }),
    });
    for await (const _ of result.textStream) { /* drain stream */ }
    const value = await result.output;
    if (!value) throw new GatewayError(502, "The AI coach returned no answer. Please try again.");
    return value as T;
  } catch (error) {
    if (error instanceof GatewayError) throw error;
    wrap(error);
  }
}
