import "server-only";
import { env, integrations } from "@/lib/env";

/**
 * AI provider abstraction.
 *
 *  - integrations.anthropic === true  -> real Claude via the Messages API
 *  - otherwise                        -> "rule-based" mode: generators fall back
 *    to deterministic template builders (see ai/generators.ts) and the assistant
 *    returns an honest data summary. Nothing is presented as an AI answer when it
 *    is not one.
 */

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResult {
  text: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
}

export function aiMode(): "anthropic" | "rule-based" {
  return integrations.anthropic ? "anthropic" : "rule-based";
}

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

export async function chat(
  system: string,
  messages: ChatMessage[],
  opts: { model?: string; maxTokens?: number } = {},
): Promise<ChatResult> {
  if (!integrations.anthropic) {
    throw new AiNotConfiguredError();
  }
  const model = opts.model ?? env.AI_MODEL_DEFAULT;
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY as string,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: Math.min(opts.maxTokens ?? 1024, 4096),
      system,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Anthropic ${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    content: { type: string; text?: string }[];
    usage?: { input_tokens?: number; output_tokens?: number };
    model?: string;
  };
  const text = data.content
    .filter((c) => c.type === "text")
    .map((c) => c.text ?? "")
    .join("\n")
    .trim();

  return {
    text,
    model: data.model ?? model,
    tokensIn: data.usage?.input_tokens ?? 0,
    tokensOut: data.usage?.output_tokens ?? 0,
  };
}

/**
 * Ask for a JSON object matching a described shape. Returns the raw parsed
 * object; the caller validates with its Zod schema.
 */
export async function chatJson<T = unknown>(
  system: string,
  userPrompt: string,
  opts: { model?: string; maxTokens?: number } = {},
): Promise<{ object: T; result: ChatResult }> {
  const result = await chat(
    `${system}\n\nRespond with ONLY a single valid JSON object and no prose, no code fences.`,
    [{ role: "user", content: userPrompt }],
    opts,
  );
  const jsonText = extractJson(result.text);
  return { object: JSON.parse(jsonText) as T, result };
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first >= 0 && last > first) return text.slice(first, last + 1);
  return text;
}

export class AiNotConfiguredError extends Error {
  constructor() {
    super("AI is not configured. Set ANTHROPIC_API_KEY to enable conversational features.");
    this.name = "AiNotConfiguredError";
  }
}
