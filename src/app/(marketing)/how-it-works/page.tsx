export const metadata = { title: "How it works" };

const STEPS = [
  ["Answer a short intake", "Your goal, budget, available time, experience, skills, and interests."],
  ["Get scored recommendations", "A deterministic fit score ranks every opportunity for you, with the reasons shown."],
  ["Pick one and generate a plan", "The opportunity's launch plan becomes real tasks on your dashboard."],
  ["Execute and track", "Work the tasks, log leads and revenue, and see whether it is actually working."],
  ["Improve and scale", "Adjust your offer, double down on what works, and set the next goal."],
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">How it works</h1>
      <p className="mt-3 text-muted">
        Opportunity Engine is built around one loop: discover → evaluate → choose → plan → execute →
        track → improve → scale. It does not promise income. It helps you pick something realistic and
        actually do it.
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
    </div>
  );
}
