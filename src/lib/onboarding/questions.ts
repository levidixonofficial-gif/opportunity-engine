import { z } from "zod";
import { BudgetBand, ExperienceLevel, PrimaryGoal, TimeBand } from "@/lib/validations/enums";

/**
 * The 5-step onboarding flow (spec §3). Steps 1-3 are single-select radio
 * groups; steps 4-5 are multi-select against the Skill / Interest catalogs
 * (loaded from the DB, not hard-coded here).
 */

export interface ChoiceStep {
  id: "goal" | "budget" | "time" | "experience";
  title: string;
  helper?: string;
  options: { value: string; label: string; description?: string }[];
}

export const CHOICE_STEPS: ChoiceStep[] = [
  {
    id: "goal",
    title: "What are you trying to accomplish?",
    options: [
      { value: "first_100", label: "Make my first $100", description: "Get one small win as fast as possible" },
      { value: "side_income", label: "Build a side income", description: "A few hundred a month alongside other work" },
      { value: "build_business", label: "Build a business", description: "Something that can grow past just you" },
      { value: "replace_income", label: "Replace my current income", description: "Full-time replacement over time" },
      { value: "learn_skill", label: "Learn a valuable skill", description: "Skill first, income second" },
      { value: "explore", label: "Explore opportunities", description: "Not sure yet — show me options" },
    ],
  },
  {
    id: "budget",
    title: "What resources do you have to start?",
    helper: "This is money you could put toward tools, ads, or inventory — not a requirement.",
    options: [
      { value: "lt_50", label: "Less than $50" },
      { value: "50_250", label: "$50–$250" },
      { value: "250_1000", label: "$250–$1,000" },
      { value: "1000_plus", label: "$1,000+" },
    ],
  },
  {
    id: "time",
    title: "How much time can you spend?",
    options: [
      { value: "30_min", label: "30 minutes/day" },
      { value: "1_hr", label: "1 hour/day" },
      { value: "2_3_hr", label: "2–3 hours/day" },
      { value: "4_plus_hr", label: "4+ hours/day" },
    ],
  },
  {
    id: "experience",
    title: "How much online business experience do you have?",
    options: [
      { value: "none", label: "None yet", description: "Complete beginner" },
      { value: "some", label: "Some", description: "Tried a thing or two" },
      { value: "experienced", label: "Experienced", description: "I've earned money online before" },
    ],
  },
];

export const onboardingSubmissionSchema = z.object({
  primaryGoal: PrimaryGoal,
  budgetBand: BudgetBand,
  timeBand: TimeBand,
  experienceLevel: ExperienceLevel,
  skillSlugs: z.array(z.string().min(1)).max(20).default([]),
  interestSlugs: z.array(z.string().min(1)).max(20).default([]),
});

export type OnboardingSubmission = z.infer<typeof onboardingSubmissionSchema>;
