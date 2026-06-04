import type { Metadata } from "next";
import { LegalShell } from "@/components/legal/LegalShell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Shakh processes personal data: purposes, legal bases, data processors, minors, and data subject rights.",
};

// Bozza strutturata: i contenuti sostanziali (basi giuridiche, sub-processori,
// gestione minori) vanno validati da un legale prima della pubblicazione.
export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="June 2026">
      <p>
        This policy describes how the personal data of Shakh users is processed
        under Regulation (EU) 2016/679 (GDPR) and the Italian Privacy Code. Draft
        pending legal review.
      </p>

      <h2>Data Controller</h2>
      <p>
        [Company name / controller], [address], privacy contact: [email].
        DPO, if any: [contact].
      </p>

      <h2>Data processed and purposes</h2>
      <ul>
        <li>
          Account data (email, display name, username): authentication and
          profile management.
        </li>
        <li>
          Play and study data (imported games, progress, repertoires, puzzle
          attempts): service delivery and personalization of your learning path.
        </li>
        <li>
          Date of birth / age range: verification of digital consent and
          management of minor users (see below).
        </li>
      </ul>

      <h2>Data processors (sub-processors)</h2>
      <ul>
        <li>
          <strong>Supabase</strong> — database and authentication, in the EU
          region (DPA in place).
        </li>
        <li>
          <strong>Vercel</strong> — application hosting.
        </li>
        <li>
          <strong>Anthropic</strong> — third-party AI service for analysis:
          processes positions and moves only (FEN/SAN/evaluations),
          <strong> never</strong> identifying personal data.
        </li>
        <li>
          <strong>Lichess</strong> — opening statistics, tablebase, and game
          imports (play data).
        </li>
        <li>
          <strong>Resend</strong> — sending transactional emails and invites (if
          enabled).
        </li>
      </ul>

      <h2>Minors</h2>
      <p>
        In Italy, the threshold for independent digital consent is 14 years. We
        collect the date of birth during registration. For users under 14, a
        parent/guardian&apos;s consent is required. For minors managed through a
        club or school, the organization is informed of its role, and the student
        (or parent) is made aware that the instructor can view their progress.
      </p>

      <h2>Data subject rights</h2>
      <p>
        You can access, rectify, export, and delete your data. From your profile
        you&apos;ll find <strong>data export</strong> (JSON/PGN format) and{" "}
        <strong>account deletion</strong>, which permanently removes your profile
        and related data. You also have the right to lodge a complaint with the
        Italian Data Protection Authority (Garante).
      </p>

      <h2>Retention</h2>
      <p>
        Data is retained for as long as necessary to provide the service and is
        deleted upon request or when the account is closed.
      </p>
    </LegalShell>
  );
}
