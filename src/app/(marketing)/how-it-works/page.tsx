import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import { Faq } from "@/components/ui/faq";

export const metadata = { title: "How it works" };

const STEPS = [
  ["Answer a short intake", "Your goal, budget, available time, experience, skills, and interests."],
  ["Get scored recommendations", "A deterministic fit score ranks every opportunity for you, and shows the reasons behind it."],
  ["Pick one and generate a plan", "The opportunity's launch plan becomes real tasks on your dashboard."],
  ["Execute and track", "Work the tasks, log leads and revenue, and see whether it is actually working."],
  ["Improve and scale", "Adjust your offer, double down on what works, and set the next goal."],
];

const FAQS = [
  {
    q: "Does Opportunity Engine guarantee I'll make money?",
    a: "No. It helps you pick a realistic path and execute it. Every economic figure is described as typical, possible, or estimated — never promised. Your results depend on your effort, your market, and factors outside anyone's control.",
  },
  {
    q: "How is the fit score calculated?",
    a: "A deterministic formula weighs skill fit, budget fit, time fit, goal alignment, demand vs. competition, difficulty, scalability, and location dependence. It runs before any AI, so it's reproducible and the reasons are always shown. It's a ranking tool, not a prediction.",
  },
  {
    q: "Do I need the AI features?",
    a: "No. The core loop — discover, plan, execute, track — works without any AI. The assistant and generators are optional accelerators. Without an AI key they fall back to templates and a plain summary of your own data, clearly labelled.",
  },
  {
    q: "Where does opportunity data come from?",
    a: "A curated library maintained by the team, describing how each business model typically works. It is reference material, not a list of get-rich schemes.",
  },
  {
    q: "Is my data private?",
    a: "Your projects, leads, revenue, notes, and AI history are isolated to your account and never shown to other users. Analytics events exclude free-text and financial amounts. See the privacy page.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <ScrollProgress topOffset={64} />
      <div className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">How it works</h1>
        <p className="mt-3 text-muted">
          Opportunity Engine is built around one loop: discover → evaluate → choose → plan → execute
          → track → improve → scale. It does not promise income. It helps you pick something realistic
          and actually do it.
        </p>

        <ol className="mt-8 space-y-6">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="flex gap-4">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-sm text-accent-fg">
                {i + 1}
              </span>
              <div>
                <h2 className="font-semibold">{title}</h2>
                <p className="text-sm text-muted">{body}</p>
              </div>
            </li>
          ))}
        </ol>

        <h2 className="mt-12 text-xl font-semibold tracking-tight">Common questions</h2>
        <Faq items={FAQS} className="mt-4" />

        <div className="mt-10">
          <Link href="/sign-in" className={buttonVariants({ size: "lg" })}>
            Start exploring
          </Link>
        </div>
      </div>
    </>
  );
}
