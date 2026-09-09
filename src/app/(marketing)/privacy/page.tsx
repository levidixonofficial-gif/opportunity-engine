import { LegalShell } from "../_Legal";

export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy">
      <p>
        This is placeholder policy text for the Phase 1 build. Before launch this page will describe
        exactly what data Opportunity Engine collects (account details via Clerk, the profile and
        progress data you enter, and product analytics), how it is stored (Supabase Postgres with
        row-level isolation), and how to request deletion.
      </p>
      <p>We do not sell personal data. Analytics events exclude free-text and financial figures.</p>
    </LegalShell>
  );
}
