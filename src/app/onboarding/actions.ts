"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { onboardingSubmissionSchema } from "@/lib/onboarding/questions";
import { submitOnboarding } from "@/server/services/onboarding";

export interface OnboardingActionState {
  error?: string;
}

export async function submitOnboardingAction(
  _prev: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const user = await requireUser();

  const parsed = onboardingSubmissionSchema.safeParse({
    primaryGoal: formData.get("primaryGoal"),
    budgetBand: formData.get("budgetBand"),
    timeBand: formData.get("timeBand"),
    experienceLevel: formData.get("experienceLevel"),
    skillSlugs: formData.getAll("skillSlugs"),
    interestSlugs: formData.getAll("interestSlugs"),
  });

  if (!parsed.success) {
    return { error: "Please answer every step before continuing." };
  }

  await submitOnboarding(user.id, parsed.data);
  redirect("/dashboard");
}
