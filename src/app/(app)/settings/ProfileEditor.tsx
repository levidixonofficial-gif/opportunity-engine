"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/form-fields";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { CHOICE_STEPS } from "@/lib/onboarding/questions";
import { updateProfile } from "./actions";

interface CatItem {
  slug: string;
  label: string;
}

const opts = (id: string) => CHOICE_STEPS.find((s) => s.id === id)!.options.map((o) => ({ value: o.value, label: o.label }));

export function ProfileEditor({
  current,
  skills,
  interests,
  activeSkills,
  activeInterests,
}: {
  current: { primaryGoal: string; budgetBand: string; timeBand: string; experienceLevel: string };
  skills: CatItem[];
  interests: CatItem[];
  activeSkills: string[];
  activeInterests: string[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [skillSel, setSkillSel] = useState<string[]>(activeSkills);
  const [interestSel, setInterestSel] = useState<string[]>(activeInterests);

  function toggle(list: string[], set: (v: string[]) => void, slug: string) {
    set(list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug]);
  }

  function save(formData: FormData) {
    start(async () => {
      const res = await updateProfile({
        primaryGoal: formData.get("primaryGoal"),
        budgetBand: formData.get("budgetBand"),
        timeBand: formData.get("timeBand"),
        experienceLevel: formData.get("experienceLevel"),
        skillSlugs: skillSel,
        interestSlugs: interestSel,
      });
      if (res.ok) {
        toast({ tone: "success", title: "Profile updated", description: "Recommendations re-scored." });
        router.refresh();
      }
    });
  }

  return (
    <form action={save} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField label="Primary goal" name="primaryGoal" defaultValue={current.primaryGoal} options={opts("goal")} />
        <SelectField label="Budget" name="budgetBand" defaultValue={current.budgetBand} options={opts("budget")} />
        <SelectField label="Time" name="timeBand" defaultValue={current.timeBand} options={opts("time")} />
        <SelectField label="Experience" name="experienceLevel" defaultValue={current.experienceLevel} options={opts("experience")} />
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium">Skills</p>
        <div className="flex flex-wrap gap-1.5">
          {skills.map((s) => (
            <button
              type="button"
              key={s.slug}
              onClick={() => toggle(skillSel, setSkillSel, s.slug)}
              aria-pressed={skillSel.includes(s.slug)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs transition-colors",
                skillSel.includes(s.slug) ? "border-accent bg-accent text-accent-fg" : "hover:bg-surface-2",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium">Interests</p>
        <div className="flex flex-wrap gap-1.5">
          {interests.map((s) => (
            <button
              type="button"
              key={s.slug}
              onClick={() => toggle(interestSel, setInterestSel, s.slug)}
              aria-pressed={interestSel.includes(s.slug)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs transition-colors",
                interestSel.includes(s.slug) ? "border-accent bg-accent text-accent-fg" : "hover:bg-surface-2",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
