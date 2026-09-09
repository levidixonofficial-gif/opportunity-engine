import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isOnboarded } from "@/server/services/profile";
import { OnboardingFlow } from "./OnboardingFlow";

export const metadata = { title: "Get started" };

export default async function OnboardingPage() {
  const user = await requireUser();
  if (await isOnboarded(user.id)) redirect("/dashboard");

  const [skills, interests] = await Promise.all([
    db.skill.findMany({ orderBy: { label: "asc" } }),
    db.interest.findMany({ orderBy: { label: "asc" } }),
  ]);

  return (
    <div className="flex min-h-full flex-col justify-center px-5 py-16">
      <div className="mx-auto mb-10 max-w-xl text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Let&apos;s find something realistic for you</h1>
        <p className="mt-2 text-sm text-muted">
          Six quick steps. No email spam, no guarantees — just a personalized starting point.
        </p>
      </div>
      <OnboardingFlow skills={skills} interests={interests} />
    </div>
  );
}
