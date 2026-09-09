"use client";

import { useActionState, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CHOICE_STEPS } from "@/lib/onboarding/questions";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import { submitOnboardingAction, type OnboardingActionState } from "./actions";

interface CatalogItem {
  slug: string;
  label: string;
  category?: string | null;
}

export function OnboardingFlow({ skills, interests }: { skills: CatalogItem[]; interests: CatalogItem[] }) {
  const [step, setStep] = useState(0);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [skillSlugs, setSkillSlugs] = useState<string[]>([]);
  const [interestSlugs, setInterestSlugs] = useState<string[]>([]);
  const [state, formAction, pending] = useActionState<OnboardingActionState, FormData>(
    submitOnboardingAction,
    {},
  );

  const totalSteps = CHOICE_STEPS.length + 2; // + skills + interests
  const progress = (step / (totalSteps - 1)) * 100;

  const skillsByCategory = useMemo(() => {
    const map = new Map<string, CatalogItem[]>();
    for (const s of skills) {
      const key = s.category ?? "Other";
      map.set(key, [...(map.get(key) ?? []), s]);
    }
    return [...map.entries()];
  }, [skills]);

  const currentChoice = step < CHOICE_STEPS.length ? CHOICE_STEPS[step] : null;
  const canAdvance = currentChoice
    ? !!choices[currentChoice.id]
    : step === CHOICE_STEPS.length
      ? skillSlugs.length > 0
      : true;

  function toggle(list: string[], set: (v: string[]) => void, slug: string) {
    set(list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug]);
  }

  const isLast = step === totalSteps - 1;

  return (
    <div className="mx-auto w-full max-w-xl">
      <Progress value={progress} className="mb-8" />

      <form action={formAction}>
        {/* hidden inputs carry the full submission */}
        <input type="hidden" name="primaryGoal" value={choices.goal ?? ""} />
        <input type="hidden" name="budgetBand" value={choices.budget ?? ""} />
        <input type="hidden" name="timeBand" value={choices.time ?? ""} />
        <input type="hidden" name="experienceLevel" value={choices.experience ?? ""} />
        {skillSlugs.map((s) => (
          <input key={s} type="hidden" name="skillSlugs" value={s} />
        ))}
        {interestSlugs.map((s) => (
          <input key={s} type="hidden" name="interestSlugs" value={s} />
        ))}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {currentChoice && (
              <fieldset>
                <legend className="text-xl font-semibold tracking-tight">{currentChoice.title}</legend>
                {currentChoice.helper && (
                  <p className="mt-1 text-sm text-muted">{currentChoice.helper}</p>
                )}
                <div className="mt-5 space-y-2">
                  {currentChoice.options.map((opt) => {
                    const selected = choices[currentChoice.id] === opt.value;
                    return (
                      <button
                        type="button"
                        key={opt.value}
                        aria-pressed={selected}
                        onClick={() => setChoices((c) => ({ ...c, [currentChoice.id]: opt.value }))}
                        className={cn(
                          "flex w-full flex-col rounded-md border p-3 text-left transition-colors",
                          selected
                            ? "border-accent bg-accent-subtle ring-1 ring-accent"
                            : "hover:bg-surface-2",
                        )}
                      >
                        <span className="text-sm font-medium">{opt.label}</span>
                        {opt.description && (
                          <span className="text-xs text-muted">{opt.description}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {step === CHOICE_STEPS.length && (
              <fieldset>
                <legend className="text-xl font-semibold tracking-tight">What are you good at?</legend>
                <p className="mt-1 text-sm text-muted">Pick at least one. This drives your fit scores.</p>
                <div className="mt-5 space-y-4">
                  {skillsByCategory.map(([category, items]) => (
                    <div key={category}>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">{category}</p>
                      <div className="flex flex-wrap gap-2">
                        {items.map((s) => (
                          <Chip
                            key={s.slug}
                            active={skillSlugs.includes(s.slug)}
                            onClick={() => toggle(skillSlugs, setSkillSlugs, s.slug)}
                          >
                            {s.label}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </fieldset>
            )}

            {step === CHOICE_STEPS.length + 1 && (
              <fieldset>
                <legend className="text-xl font-semibold tracking-tight">What interests you?</legend>
                <p className="mt-1 text-sm text-muted">Optional — helps break ties between similar opportunities.</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {interests.map((s) => (
                    <Chip
                      key={s.slug}
                      active={interestSlugs.includes(s.slug)}
                      onClick={() => toggle(interestSlugs, setInterestSlugs, s.slug)}
                    >
                      {s.label}
                    </Chip>
                  ))}
                </div>
              </fieldset>
            )}
          </motion.div>
        </AnimatePresence>

        {state.error && <p className="mt-4 text-sm text-danger" role="alert">{state.error}</p>}

        <div className="mt-8 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || pending}
          >
            Back
          </Button>

          {isLast ? (
            <Button type="submit" disabled={pending || !canAdvance}>
              {pending ? "Building your dashboard…" : "Finish"}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => setStep((s) => Math.min(totalSteps - 1, s + 1))}
              disabled={!canAdvance}
            >
              Continue
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm transition-colors",
        active ? "border-accent bg-accent text-accent-fg" : "hover:bg-surface-2",
      )}
    >
      {children}
    </button>
  );
}
