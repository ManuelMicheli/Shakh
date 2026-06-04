import type { Metadata } from "next";
import { LegalShell } from "@/components/legal/LegalShell";
import { ConsentPreferencesButton } from "@/components/consent/ConsentPreferencesButton";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "The cookies Shakh uses: strictly necessary technical and preference cookies. No advertising tracking or profiling.",
};

export default function CookiePolicyPage() {
  return (
    <LegalShell title="Cookie Policy" updated="June 2026">
      <p>
        Shakh uses a minimal number of cookies. We do not use advertising
        profiling cookies or third-party tracking tools.
      </p>

      <h2>Technical cookies (necessary)</h2>
      <p>
        Essential to operation: authentication session (Supabase), security,
        theme preference, and language preference. They do not require consent
        and are always on.
      </p>

      <h2>Preference cookies</h2>
      <p>
        They remember non-essential choices to improve your experience. They are
        only set after your explicit consent and can be withdrawn at any time.
      </p>

      <h2>Managing consent</h2>
      <p>
        On your first visit, a banner lets you accept or reject non-necessary
        cookies with equal prominence and in a single click. You can review your
        choice at any time:
      </p>
      <p>
        <ConsentPreferencesButton label="Manage cookie preferences" />
      </p>
    </LegalShell>
  );
}
