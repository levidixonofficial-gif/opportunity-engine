import { PhaseStub } from "@/components/phase-stub";

export const metadata = { title: "Leads" };

export default function LeadsPage() {
  return (
    <PhaseStub
      title="Leads"
      phase="Phase 5"
      description="A lightweight CRM: contacts, deals, and a simple pipeline so you can track outreach for whatever opportunity you're working."
      bullets={[
        "Pipeline: Lead → Contacted → Interested → Negotiating → Won / Lost",
        "Contacts with source, notes, and next follow-up",
        "Interaction log per contact",
        "Requires the Pro plan (entitlement: crm)",
      ]}
    />
  );
}
