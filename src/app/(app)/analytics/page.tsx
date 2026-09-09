import { PhaseStub } from "@/components/phase-stub";

export const metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  return (
    <PhaseStub
      title="Analytics"
      phase="Phase 5"
      description="Your own performance view: activity streak, tasks completed over time, revenue trend, lead conversion, and progress toward goals."
      bullets={[
        "Personal metrics only — not fabricated platform stats",
        "Revenue and profit trend from your logged transactions",
        "Funnel: opportunities viewed → saved → selected → plan → revenue",
        "Advanced analytics gated to Pro (entitlement: advanced_analytics)",
      ]}
    />
  );
}
