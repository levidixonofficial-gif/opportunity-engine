import { PhaseStub } from "@/components/phase-stub";

export const metadata = { title: "Money" };

export default function MoneyPage() {
  return (
    <PhaseStub
      title="Money"
      phase="Phase 5"
      description="A simple income tracker: log revenue and expenses, tag them to a project or client, and see profit over time."
      bullets={[
        "Revenue / expense entries with category, date, project, and client",
        "Totals: revenue, expenses, estimated profit, monthly revenue",
        "Revenue by opportunity and by project",
        "No financial advice and no guaranteed-outcome framing",
      ]}
    />
  );
}
