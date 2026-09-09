import "server-only";
import { z } from "zod";
import { GeneratorKind } from "@/lib/validations/enums";
import { aiMode, chatJson } from "@/lib/ai";
import { SAFETY_RULES } from "@/lib/ai/prompts";

/**
 * One-shot structured generators.
 *
 * Every generator has:
 *   - a Zod output schema (the contract shown in the UI + stored)
 *   - an AI path (chatJson -> validate -> retry once)
 *   - a deterministic "rule-based" builder used when AI is not configured OR the
 *     AI output fails validation twice.
 *
 * Rule-based output is genuinely useful scaffolding derived from the opportunity
 * + the user's profile. Where a real specific is unknown it uses an explicit
 * "[bracketed placeholder]" — it never fabricates names, numbers, or results.
 */

// ---------------------------------------------------------------------------
// Shared context
// ---------------------------------------------------------------------------

export interface GeneratorContext {
  opportunity?: {
    name: string;
    summary: string;
    category: string;
    revenueModel: string;
    targetCustomer: string;
    monetizationNotes: string;
    isServiceBased: boolean;
  } | null;
  profile?: {
    primaryGoal: string | null;
    budgetBand: string | null;
    timeBand: string | null;
    skillLabels: string[];
  } | null;
}

function contextBlock(ctx: GeneratorContext): string {
  const o = ctx.opportunity;
  const p = ctx.profile;
  return [
    o &&
      `Opportunity: ${o.name} (${o.category}). ${o.summary} Typical model: ${o.revenueModel} Target customer: ${o.targetCustomer || "not specified"}.`,
    p &&
      `User goal: ${p.primaryGoal ?? "unspecified"}. Budget band: ${p.budgetBand ?? "unspecified"}. Time band: ${p.timeBand ?? "unspecified"}. Skills: ${p.skillLabels.join(", ") || "none listed"}.`,
  ]
    .filter(Boolean)
    .join("\n");
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const offerSchema = z.object({
  name: z.string(),
  targetCustomer: z.string(),
  problem: z.string(),
  solution: z.string(),
  deliverables: z.array(z.string()).min(2).max(8),
  pricingStructure: z.string(),
  positioning: z.string(),
  guaranteeOrRiskReversal: z.string(),
});

export const outreachSchema = z.object({
  channel: z.string(),
  subjectLines: z.array(z.string()).min(2).max(5),
  message: z.string(),
  followUps: z.array(z.object({ afterDays: z.number(), message: z.string() })).min(1).max(3),
  personalizationTips: z.array(z.string()).min(2).max(6),
});

export const contentPlanSchema = z.object({
  audience: z.string(),
  pillars: z.array(z.string()).min(3).max(6),
  hooks: z.array(z.string()).min(4).max(12),
  weeklyCadence: z.string(),
  ideas: z.array(z.object({ title: z.string(), format: z.string(), angle: z.string() })).min(5).max(15),
});

export const businessIdeaSchema = z.object({
  ideas: z
    .array(
      z.object({
        name: z.string(),
        who: z.string(),
        offer: z.string(),
        firstCustomerPath: z.string(),
        whyItFits: z.string(),
        mainRisk: z.string(),
      }),
    )
    .min(2)
    .max(5),
});

export const digitalProductSchema = z.object({
  concepts: z
    .array(
      z.object({
        title: z.string(),
        format: z.string(),
        problemSolved: z.string(),
        outline: z.array(z.string()).min(3).max(10),
        pricingIdea: z.string(),
      }),
    )
    .min(2)
    .max(4),
});

export const actionPlanSchema = z.object({
  title: z.string(),
  weeks: z
    .array(
      z.object({
        label: z.string(),
        focus: z.string(),
        tasks: z.array(z.string()).min(2).max(7),
      }),
    )
    .min(2)
    .max(6),
});

export const analysisSchema = z.object({
  summary: z.string(),
  strengths: z.array(z.string()).min(1).max(6),
  weaknesses: z.array(z.string()).min(1).max(6),
  risks: z.array(z.string()).min(1).max(6),
  openQuestions: z.array(z.string()).min(1).max(6),
  recommendedNextSteps: z.array(z.string()).min(2).max(6),
});

const SCHEMAS = {
  offer: offerSchema,
  outreach: outreachSchema,
  content_plan: contentPlanSchema,
  business_idea: businessIdeaSchema,
  digital_product: digitalProductSchema,
  action_plan: actionPlanSchema,
  analysis: analysisSchema,
} as const;

export type GeneratorKindT = keyof typeof SCHEMAS;
export type GeneratorOutputFor<K extends GeneratorKindT> = z.infer<(typeof SCHEMAS)[K]>;

// ---------------------------------------------------------------------------
// Prompt shapes
// ---------------------------------------------------------------------------

const PROMPTS: Record<GeneratorKindT, (input: string, ctx: string) => string> = {
  offer: (input, ctx) =>
    `${ctx}\n\nUser input: "${input}"\nCreate ONE concrete service/product offer. JSON keys: name, targetCustomer, problem, solution, deliverables (array), pricingStructure, positioning, guaranteeOrRiskReversal.`,
  outreach: (input, ctx) =>
    `${ctx}\n\nUser input: "${input}"\nWrite a cold outreach sequence. JSON keys: channel, subjectLines (array), message, followUps (array of {afterDays, message}), personalizationTips (array). Keep the message under 120 words, specific, no hype.`,
  content_plan: (input, ctx) =>
    `${ctx}\n\nUser input: "${input}"\nCreate a content plan. JSON keys: audience, pillars (array), hooks (array), weeklyCadence, ideas (array of {title, format, angle}).`,
  business_idea: (input, ctx) =>
    `${ctx}\n\nUser constraints/input: "${input}"\nGenerate 2-4 realistic business ideas that fit. JSON key: ideas (array of {name, who, offer, firstCustomerPath, whyItFits, mainRisk}).`,
  digital_product: (input, ctx) =>
    `${ctx}\n\nUser input: "${input}"\nBrainstorm 2-4 digital product concepts. JSON key: concepts (array of {title, format, problemSolved, outline (array), pricingIdea}).`,
  action_plan: (input, ctx) =>
    `${ctx}\n\nUser input/goal: "${input}"\nBreak this into a 4-week action plan. JSON keys: title, weeks (array of {label, focus, tasks (array)}).`,
  analysis: (input, ctx) =>
    `${ctx}\n\nIdea to analyze: "${input}"\nGive a candid analysis. JSON keys: summary, strengths, weaknesses, risks, openQuestions, recommendedNextSteps.`,
};

// ---------------------------------------------------------------------------
// Public entrypoint
// ---------------------------------------------------------------------------

export interface GenerateResult<K extends GeneratorKindT = GeneratorKindT> {
  kind: K;
  provider: "anthropic" | "rule-based";
  model: string | null;
  data: GeneratorOutputFor<K>;
  tokensIn: number;
  tokensOut: number;
  /** Shown in the UI so the user knows how this was produced. */
  disclaimer: string;
}

export async function runGenerator<K extends GeneratorKindT>(
  kind: K,
  input: string,
  ctx: GeneratorContext,
  opts: { model?: string } = {},
): Promise<GenerateResult<K>> {
  GeneratorKind.parse(kind);
  const schema = SCHEMAS[kind];
  const contextStr = contextBlock(ctx);

  if (aiMode() === "anthropic") {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { object, result } = await chatJson(
          `${SAFETY_RULES}\nYou output ONLY JSON matching the requested shape.`,
          PROMPTS[kind](input, contextStr),
          { model: opts.model, maxTokens: 1500 },
        );
        const parsed = schema.safeParse(object);
        if (parsed.success) {
          return {
            kind,
            provider: "anthropic",
            model: result.model,
            data: parsed.data as GeneratorOutputFor<K>,
            tokensIn: result.tokensIn,
            tokensOut: result.tokensOut,
            disclaimer: "AI-generated suggestion. Review before using — none of this is verified.",
          };
        }
      } catch {
        // fall through to retry / rule-based
      }
    }
  }

  return {
    kind,
    provider: "rule-based",
    model: null,
    data: buildRuleBased(kind, input, ctx) as GeneratorOutputFor<K>,
    tokensIn: 0,
    tokensOut: 0,
    disclaimer:
      "Generated locally from a template (no AI key configured). It is a starting scaffold — fill in the bracketed parts.",
  };
}

// ---------------------------------------------------------------------------
// Deterministic builders
// ---------------------------------------------------------------------------

function buildRuleBased(kind: GeneratorKindT, input: string, ctx: GeneratorContext): unknown {
  const o = ctx.opportunity;
  const oppName = o?.name ?? "your opportunity";
  const target = o?.targetCustomer || "[your target customer]";
  const niche = input.trim() || "[your chosen niche]";

  switch (kind) {
    case "offer":
      return {
        name: `${oppName} for ${niche}`,
        targetCustomer: target,
        problem: `${target} needs a result related to "${niche}" but lacks the time or skill to do it well themselves.`,
        solution: o?.summary ?? `A focused ${o?.isServiceBased ? "done-for-you service" : "product"} that delivers that result.`,
        deliverables: [
          "A clear scope document (what's included / not included)",
          "The core deliverable, produced to an agreed standard",
          "One round of revisions",
          "A short handoff call or written summary",
        ],
        pricingStructure:
          o?.monetizationNotes ??
          "Start with a fixed project price for the first few clients, then move to a monthly retainer once scope is predictable. Do not undercharge to win the first one.",
        positioning: `Not the cheapest — the one who actually understands ${niche} and ships on time.`,
        guaranteeOrRiskReversal:
          "Offer a specific, bounded guarantee you can honor (e.g. 'first milestone by day 7 or the deposit is refunded'). Never guarantee an income or sales result for the client.",
      } satisfies GeneratorOutputFor<"offer">;

    case "outreach":
      return {
        channel: "email",
        subjectLines: [
          `Quick idea for ${niche}`,
          `${target} — one thing I noticed`,
          `Helping with ${niche}?`,
        ],
        message: `Hi [first name],\n\nI work with ${target} on ${niche}. I looked at [specific thing about their business] and saw [specific, honest observation].\n\nI put together [small, concrete offer]. Worth a 15-minute call this week?\n\n[Your name]`,
        followUps: [
          { afterDays: 3, message: "Bumping this up in case it got buried — happy to send a quick example instead of a call if that's easier." },
          { afterDays: 7, message: "Last note from me — if timing's off, no problem. I'll leave the door open." },
        ],
        personalizationTips: [
          "Reference something only true of THIS prospect in the first line.",
          "One ask, one link at most. No attachments on a cold email.",
          "Send in small batches and reply within an hour when they respond.",
          "Keep it under 120 words.",
        ],
      } satisfies GeneratorOutputFor<"outreach">;

    case "content_plan":
      return {
        audience: target,
        pillars: [
          `How ${niche} actually works (education)`,
          "Behind the scenes of real work",
          "Common mistakes and how to avoid them",
          "Results and case studies (only real ones)",
        ],
        hooks: [
          `The #1 mistake ${target} make with ${niche}`,
          `I reviewed 10 [things] — here's what the good ones had in common`,
          `You don't need [expensive thing] to start ${niche}`,
          `What ${niche} looks like when it's done right`,
          "Steal this checklist",
        ],
        weeklyCadence: "3 short posts + 1 longer piece per week. Consistency beats volume.",
        ideas: [
          { title: `${niche}: a 5-step starter`, format: "carousel / thread", angle: "education" },
          { title: "A real project, start to finish", format: "short video", angle: "behind the scenes" },
          { title: "Before / after (with permission)", format: "image + caption", angle: "proof" },
          { title: "3 myths about " + niche, format: "thread", angle: "contrarian" },
          { title: "Answering a common question", format: "short video", angle: "education" },
        ],
      } satisfies GeneratorOutputFor<"content_plan">;

    case "business_idea":
      return {
        ideas: [
          {
            name: `${niche} — done-for-you`,
            who: target,
            offer: "A focused service that removes one specific recurring headache.",
            firstCustomerPath: "Direct outreach to 20 businesses that visibly have the problem.",
            whyItFits: `Uses your stated skills (${ctx.profile?.skillLabels.join(", ") || "—"}) and fits a ${ctx.profile?.timeBand ?? "part-time"} schedule.`,
            mainRisk: "Scope creep — define what's NOT included up front.",
          },
          {
            name: `${niche} — productized`,
            who: `${target} who want a fixed-price, fast turnaround`,
            offer: "The same result packaged as a fixed scope + fixed price tier.",
            firstCustomerPath: "A simple landing page + answering questions where your audience already gathers.",
            whyItFits: "Easier to scale than hourly work; predictable delivery.",
            mainRisk: "Lower price point means you need volume or an upsell.",
          },
        ],
      } satisfies GeneratorOutputFor<"business_idea">;

    case "digital_product":
      return {
        concepts: [
          {
            title: `The ${niche} starter kit`,
            format: "template / checklist bundle",
            problemSolved: `${target} don't know where to start with ${niche}.`,
            outline: ["Overview & how to use", "The core template", "A filled-in example", "A checklist", "Next steps"],
            pricingIdea: "$19–$39 one-time; bundle 2–3 later for a higher tier.",
          },
          {
            title: `${niche}: the field guide`,
            format: "short guide / mini-course",
            problemSolved: "Scattered, contradictory free advice wastes their time.",
            outline: ["The 20% that matters", "Step-by-step walkthrough", "Common failure modes", "Tools", "Where to go deeper"],
            pricingIdea: "$29–$79 depending on depth and whether you add video.",
          },
        ],
      } satisfies GeneratorOutputFor<"digital_product">;

    case "action_plan":
      return {
        title: `${input.trim() || oppName}: 4-week plan`,
        weeks: [
          { label: "Week 1", focus: "Decide and prepare", tasks: ["Pick one narrow niche", "Write a one-sentence offer", "List 20 potential customers"] },
          { label: "Week 2", focus: "Build proof", tasks: ["Create 2–3 portfolio examples", "Set up a simple one-page site or profile", "Draft your outreach message"] },
          { label: "Week 3", focus: "Outreach", tasks: ["Contact 5 prospects/day", "Log every reply", "Book at least 2 calls"] },
          { label: "Week 4", focus: "Close and review", tasks: ["Send a proposal to interested prospects", "Deliver or start one paid engagement", "Review what worked and adjust"] },
        ],
      } satisfies GeneratorOutputFor<"action_plan">;

    case "analysis":
      return {
        summary: `"${input.trim() || "This idea"}" is plausible but unproven. The analysis below is a checklist prompt, not a verdict.`,
        strengths: ["Low cost to test", "Uses skills you already have"],
        weaknesses: ["No demand signal yet", "Success depends heavily on consistent outreach"],
        risks: ["You may spend weeks before the first customer", "Competing on price is a trap"],
        openQuestions: ["Who exactly is the first customer?", "What would make them choose you over doing nothing?", "How will you reach 20 of them this month?"],
        recommendedNextSteps: ["Talk to 5 potential customers before building anything", "Define the smallest paid version of this", "Set a 2-week test with a clear go/no-go"],
      } satisfies GeneratorOutputFor<"analysis">;
  }
}
