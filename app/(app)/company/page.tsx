import { CompanyForm } from "./CompanyForm";

// Plan 3c: migrated off the legacy server `requireRole("employer")` + direct
// `db()` read (lib/auth) to a pure client page. CompanyForm now self-fetches
// GET /api/me/company and saves via PUT /api/me/company (owner-only enforced
// server-side in lib/server/services/companies.ts#updateOwnCompany — the
// client never carries the trust). No company yet → CompanyForm shows a prompt
// to finish onboarding.
export default function CompanyPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Company</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          How your organisation appears on listings and intern profiles.
        </p>
      </div>
      <CompanyForm />
    </div>
  );
}
