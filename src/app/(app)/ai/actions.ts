"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { track } from "@/lib/analytics";
import { sendAssistantMessage, runAndSaveGenerator, AiLimitError } from "@/server/services/ai";
import { AiNotConfiguredError } from "@/lib/ai";
import { GeneratorKind } from "@/lib/validations/enums";
import type { GeneratorKindT } from "@/lib/ai/generators";

export interface AssistantResult {
  conversationId?: string;
  reply?: string;
  mode?: "anthropic" | "rule-based";
  error?: string;
  limited?: boolean;
}

export async function sendMessageAction(
  conversationId: string | undefined,
  message: string,
): Promise<AssistantResult> {
  const user = await requireUser();
  try {
    const res = await sendAssistantMessage(user.id, { conversationId, message });
    await track(user.id, "ai_request_made", { kind: "assistant", mode: res.mode });
    revalidatePath("/ai");
    return res;
  } catch (e) {
    if (e instanceof AiLimitError) return { error: e.message, limited: true };
    if (e instanceof AiNotConfiguredError) return { error: e.message };
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export interface GeneratorResultPayload {
  id?: string;
  kind?: string;
  provider?: "anthropic" | "rule-based";
  data?: unknown;
  disclaimer?: string;
  error?: string;
  limited?: boolean;
}

export async function runGeneratorAction(
  kind: string,
  input: string,
  opportunityId?: string,
): Promise<GeneratorResultPayload> {
  const user = await requireUser();
  const parsedKind = GeneratorKind.safeParse(kind);
  if (!parsedKind.success) return { error: "Unknown generator." };
  const text = z.string().trim().min(1).max(2000).safeParse(input);
  if (!text.success) return { error: "Add a short brief first." };

  try {
    const res = await runAndSaveGenerator(user.id, parsedKind.data as GeneratorKindT, text.data, {
      opportunityId,
    });
    await track(user.id, "generator_run", { kind: parsedKind.data, provider: res.provider });
    revalidatePath("/ai");
    return {
      id: res.id,
      kind: res.kind,
      provider: res.provider,
      data: res.data,
      disclaimer: res.disclaimer,
    };
  } catch (e) {
    if (e instanceof AiLimitError) return { error: e.message, limited: true };
    return { error: e instanceof Error ? e.message : "Generation failed." };
  }
}
