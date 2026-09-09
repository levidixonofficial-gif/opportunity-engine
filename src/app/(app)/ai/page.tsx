import { PhaseStub } from "@/components/phase-stub";

export const metadata = { title: "AI Tools" };

export default function AiPage() {
  return (
    <PhaseStub
      title="AI Tools"
      phase="Phase 4"
      description="An AI business coach with context on your profile, goals, tasks, and progress — plus focused generators for offers, outreach, content, and action plans."
      bullets={[
        "Assistant grounded in your data (not a blank chatbot)",
        "Generators: offer, outreach, content plan, business idea, digital product, action plan",
        "Pinecone semantic search over the opportunity + knowledge library",
        "Per-plan usage limits and token caps (entitlements + UsageCounter)",
        "No guaranteed-income or spam output",
      ]}
    />
  );
}
