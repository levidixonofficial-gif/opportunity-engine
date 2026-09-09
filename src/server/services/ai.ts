import { db } from "@/lib/db";
import { z } from "zod";
import { chat, aiMode, AiNotConfiguredError, type ChatMessage } from "@/lib/ai";
import { assistantSystemPrompt } from "@/lib/ai/prompts";
import { runGenerator, type GeneratorContext, type GeneratorKindT } from "@/lib/ai/generators";
import { GeneratorKind } from "@/lib/validations/enums";
import { consumeUsage } from "@/lib/usage";
import { rateLimit, RL } from "@/lib/ratelimit";
import { RateLimitError } from "@/lib/errors";
import { captureException } from "@/lib/observability";
import { getScorerProfile } from "@/server/services/profile";
import { recommendationsFor } from "@/server/services/opportunities";
import { GOAL_LABELS } from "@/lib/validations/enums";

/** Assemble non-sensitive user context for AI prompts (no raw financial rows). */
async function buildContext(userId: string): Promise<{ text: string; generator: GeneratorContext }> {
  const [profileRow, scorer, recs, openTasks, activeProject, revenueAgg] = await Promise.all([
    db.profile.findUnique({ where: { userId } }),
    getScorerProfile(userId),
    recommendationsFor(userId, 3),
    db.task.findMany({ where: { userId, status: "todo" }, select: { title: true }, take: 5 }),
    db.savedOpportunity.findFirst({
      where: { userId, state: "selected" },
      include: { opportunity: true },
    }),
    db.transaction.aggregate({ where: { userId, type: "revenue" }, _sum: { amountCents: true } }),
  ]);

  const skillLabels = await db.skill
    .findMany({ where: { slug: { in: scorer.skillSlugs } }, select: { label: true } })
    .then((r) => r.map((s) => s.label));

  const lines = [
    `Goal: ${profileRow?.primaryGoal ? GOAL_LABELS[profileRow.primaryGoal as keyof typeof GOAL_LABELS] : "unspecified"}.`,
    `Budget band: ${profileRow?.budgetBand ?? "unspecified"}. Time band: ${profileRow?.timeBand ?? "unspecified"}. Experience: ${profileRow?.experienceLevel ?? "unspecified"}.`,
    `Skills: ${skillLabels.join(", ") || "none listed"}.`,
    activeProject
      ? `Current focus opportunity: ${activeProject.opportunity.name}.`
      : `No focus opportunity selected. Top matches: ${recs.map((r) => r.opportunity.name).join("; ")}.`,
    openTasks.length ? `Open tasks: ${openTasks.map((t) => t.title).join("; ")}.` : "No open tasks.",
    `Revenue logged so far (rough): $${((revenueAgg._sum.amountCents ?? 0) / 100).toFixed(0)}.`,
  ];

  const opp = activeProject?.opportunity ?? recs[0]?.opportunity ?? null;
  return {
    text: lines.join("\n"),
    generator: {
      opportunity: opp
        ? {
            name: opp.name,
            summary: opp.summary,
            category: "",
            revenueModel: opp.revenueModel,
            targetCustomer: opp.targetCustomer,
            monetizationNotes: opp.monetizationNotes,
            isServiceBased: opp.isServiceBased,
          }
        : null,
      profile: {
        primaryGoal: profileRow?.primaryGoal ?? null,
        budgetBand: profileRow?.budgetBand ?? null,
        timeBand: profileRow?.timeBand ?? null,
        skillLabels,
      },
    },
  };
}

// --- Assistant -----------------------------------------------------------

/** Fetch only the most recent conversation of a kind (with its messages). */
export async function getLatestConversation(userId: string, kind = "assistant") {
  return db.aiConversation.findFirst({
    where: { userId, kind },
    orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 100 } },
  });
}

/** Conversation list WITHOUT message bodies (for a future history sidebar). */
export async function listConversations(userId: string) {
  return db.aiConversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: { id: true, title: true, kind: true, updatedAt: true, _count: { select: { messages: true } } },
  });
}

export async function getConversation(userId: string, id: string) {
  return db.aiConversation.findFirst({
    where: { id, userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
}

export interface AssistantReply {
  conversationId: string;
  reply: string;
  mode: "anthropic" | "rule-based";
}

export async function sendAssistantMessage(
  userId: string,
  input: { conversationId?: string; message: string },
): Promise<AssistantReply> {
  const message = z.string().trim().min(1).max(4000).parse(input.message);

  const rl = await rateLimit("ai", userId, RL.ai);
  if (!rl.success) throw new RateLimitError();

  // Atomically consume 1 message from the monthly allowance (refunded on failure).
  const usage = await consumeUsage(userId, "ai_message");

  let conversation = input.conversationId
    ? await db.aiConversation.findFirst({ where: { id: input.conversationId, userId } })
    : null;
  if (!conversation) {
    conversation = await db.aiConversation.create({
      data: { userId, kind: "assistant", title: message.slice(0, 60) },
    });
  }

  const history = await db.aiMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  await db.aiMessage.create({
    data: { conversationId: conversation.id, role: "user", content: message },
  });

  const ctx = await buildContext(userId);
  let reply: string;
  let model: string | null = null;
  let tokensIn = 0;
  let tokensOut = 0;

  if (aiMode() === "anthropic") {
    const msgs: ChatMessage[] = [
      ...history.map((h) => ({ role: h.role === "assistant" ? ("assistant" as const) : ("user" as const), content: h.content })),
      { role: "user", content: message },
    ];
    try {
      const res = await chat(assistantSystemPrompt(ctx.text), msgs, { maxTokens: 900 });
      reply = res.text;
      model = res.model;
      tokensIn = res.tokensIn;
      tokensOut = res.tokensOut;
    } catch (err) {
      if (err instanceof AiNotConfiguredError) {
        reply = ruleBasedAnswer(message, ctx.text);
      } else {
        // Provider error — refund the message and surface a generic failure.
        await usage.release(false);
        captureException(err, { where: "sendAssistantMessage" });
        throw new Error("The AI provider is having trouble right now. Try again shortly.");
      }
    }
  } else {
    reply = ruleBasedAnswer(message, ctx.text);
  }

  await db.aiMessage.create({
    data: { conversationId: conversation.id, role: "assistant", content: reply, model, tokensIn, tokensOut },
  });
  await db.aiConversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });
  await usage.release(true);

  return { conversationId: conversation.id, reply, mode: aiMode() };
}

function ruleBasedAnswer(question: string, context: string): string {
  return [
    "Conversational AI coaching is not enabled on this deployment (no ANTHROPIC_API_KEY).",
    "",
    "Here is what the app already knows, which is what a coach would start from:",
    "",
    context,
    "",
    `Your question: "${question}"`,
    "",
    "Concrete next step from your data: open Opportunities, pick the highest-fit one, and generate its plan — that turns advice into tasks you can actually do this week. To unlock back-and-forth coaching, add an Anthropic API key (see docs/ai.md).",
  ].join("\n");
}

// --- Generators ---------------------------------------------------------

export async function runAndSaveGenerator(
  userId: string,
  kind: GeneratorKindT,
  inputText: string,
  opts: { opportunityId?: string; projectId?: string } = {},
) {
  GeneratorKind.parse(kind);
  const cleanInput = z.string().trim().min(1).max(2000).parse(inputText);

  const rl = await rateLimit("generator", userId, RL.generator);
  if (!rl.success) throw new RateLimitError();

  const usage = await consumeUsage(userId, "generator_run");

  const ctx = await buildContext(userId);
  if (opts.opportunityId) {
    const opp = await db.opportunity.findFirst({
      where: { id: opts.opportunityId, status: "published" },
      include: { category: true },
    });
    if (opp) {
      ctx.generator.opportunity = {
        name: opp.name,
        summary: opp.summary,
        category: opp.category.label,
        revenueModel: opp.revenueModel,
        targetCustomer: opp.targetCustomer,
        monetizationNotes: opp.monetizationNotes,
        isServiceBased: opp.isServiceBased,
      };
    }
  }

  let result;
  try {
    result = await runGenerator(kind, cleanInput, ctx.generator);
  } catch (err) {
    await usage.release(false);
    captureException(err, { where: "runAndSaveGenerator", kind });
    throw new Error("The generator hit an error. Try again shortly.");
  }

  const saved = await db.generatorOutput.create({
    data: {
      userId,
      kind,
      provider: result.provider,
      model: result.model,
      opportunityId: opts.opportunityId ?? null,
      projectId: opts.projectId ?? null,
      inputJson: JSON.stringify({ input: cleanInput }),
      outputJson: JSON.stringify(result.data),
    },
  });
  await usage.release(true);

  return { id: saved.id, ...result };
}

export async function listGeneratorOutputs(userId: string, kind?: GeneratorKindT) {
  return db.generatorOutput.findMany({
    where: { userId, ...(kind ? { kind } : {}) },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
}

// Error types are centralized in @/lib/errors (RateLimitError, LimitReachedError).
