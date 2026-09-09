import { PhaseStub } from "@/components/phase-stub";

export const metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    <PhaseStub
      title="Projects"
      phase="Phase 3"
      description="Projects turn a chosen opportunity into a tracked initiative with its own status, revenue target, tasks, and deadline."
      bullets={[
        "Statuses: Idea → Planning → Active → Paused → Completed",
        "Link tasks, revenue, and deals to a project",
        "Per-project revenue vs. target",
      ]}
    />
  );
}
