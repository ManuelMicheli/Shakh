import type { Metadata } from "next";
import { LegalShell } from "@/components/legal/LegalShell";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms and conditions of use for the Shakh platform.",
};

// Bozza strutturata da validare legalmente.
export default function TerminiPage() {
  return (
    <LegalShell title="Terms of Service" updated="June 2026">
      <p>
        By using Shakh, you agree to these terms. Draft pending legal review.
      </p>

      <h2>The service</h2>
      <p>
        Shakh is a chess learning platform with AI-assisted analysis. The
        coach&apos;s explanations are for educational purposes and are anchored to
        engine data: they do not constitute a guarantee of results.
      </p>

      <h2>Account</h2>
      <p>
        You are responsible for keeping your credentials confidential. Users
        under 14 require the consent of a parent or guardian.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Do not attempt to circumvent technical limits or abuse the APIs.</li>
        <li>Do not use the service for unlawful purposes or to harm third parties.</li>
      </ul>

      <h2>Third-party content</h2>
      <p>
        Statistics and play data come from Lichess under its respective terms.
        AI analysis is provided through Anthropic.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        The service is provided &quot;as is.&quot; To the extent permitted by law,
        all liability for indirect damages arising from use is excluded.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms; material changes will be communicated to
        users.
      </p>
    </LegalShell>
  );
}
