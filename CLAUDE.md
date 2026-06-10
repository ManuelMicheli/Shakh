# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Shakh — chess learning platform. Takes a player from absolute beginner to strong club level (1800–2200). The differentiator is an **AI coach in Italian** that explains the *why* of moves, anchored to objective data (Stockfish engine + Lichess API stats).

The product is built incrementally via numbered spec prompts `00`–`10` (Italian markdown files in the repo root, e.g. `00-fondamenta (1).md`, `01-scacchiera-core (1).md`). **Each prompt has hard scope boundaries — it explicitly forbids anticipating later prompts.** Read the relevant prompt file before changing a module; it is the authoritative spec for that module's behavior, constraints, and deliverables. Current state: **prompts `00`–`10` are all built** — foundations, chessboard core, Stockfish engine, game import + analysis, coach AI, tactics, theory (openings/endgames/middlegame/traps + repertoire), guided path, progress dashboard, instructor/club layer, and the GDPR/i18n/SEO/security/deploy hardening pass. The suite is feature-complete; further work is maintenance and deploy, not new modules.

## Commands

```bash
npm run dev     # dev server (localhost:3000)
npm run build   # production build — must stay clean
npm run lint    # eslint (next lint)
```

Tests: `npm test` (vitest, config in `vitest.config.ts`) — unit test sui moduli puri (`src/lib/**/*.test.ts`: parsing PGN, SRS, encode/decode delle valutazioni, formato coach). Niente test DOM/E2E. Database migrations live in `supabase/migrations/` (`0001`–`0012`); apply via `supabase db push` or the Supabase SQL editor — they apply cleanly in order from zero. `DEPLOY.md` is the pre-launch checklist (Vercel env, Node runtime for AI routes, wasm MIME, RLS, region UE).

Env vars (`.env.local`, never committed): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY` (coach AI, server-only), `NEXT_PUBLIC_APP_URL`, `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` (coach rate limit — no-op if absent), `RESEND_API_KEY` (transactional email/invites, optional). See `.env.example`.

## Stack

Next.js 15 (App Router, RSC + Server Actions) · TypeScript strict · Tailwind CSS 4 · Supabase (`@supabase/ssr`) · `chess.js` (rules/legality) + `chessground` (board render/input) · `@anthropic-ai/sdk` (coach, server-only) · `next-intl` (i18n) · `@upstash/ratelimit` + `@upstash/redis` (AI route rate limit) · Framer Motion (micro-interactions) · GSAP (scene animations) · Lenis (smooth scroll). Path alias `@/*` → `src/*`.

## Architecture

**Auth & route protection.** Three Supabase clients, do not mix them:
- `src/lib/supabase/client.ts` — browser (Client Components)
- `src/lib/supabase/server.ts` — server (Server Components, Actions, Route Handlers); reads/writes cookies via `next/headers`
- `src/lib/supabase/middleware.ts` (`updateSession`) — called from `src/middleware.ts`, refreshes the session token and gates routes: everything under `/app` requires auth (else → `/login`); logged-in users on auth pages → `/app`. **Never put logic between `createServerClient` and `getUser()` in the middleware.** Layouts under `/app` also re-guard server-side as defense in depth.
- `src/lib/supabase/admin.ts` (`createAdminClient`, service role) — server-only, `import 'server-only'`. **Sole legitimate use: deleting the `auth.users` row for account erasure** (cascades via FKs). Never use it to bypass RLS on data.

`src/middleware.ts` also generates a **per-request CSP nonce** (`src/lib/security/csp.ts`), sets it on request headers (Next applies it to its own scripts) + the response CSP header; the root layout reads `x-nonce` to sign the anti-FOUC inline script. Static security headers (HSTS, nosniff, Referrer-Policy, X-Frame-Options, Permissions-Policy) live in `next.config.ts` `headers()`. **No COOP/COEP** (keeps the Stockfish lite single-thread build, prompt 02).

**Database (`supabase/migrations/`, `0001_init.sql` is the base).** Single source of truth for the schema; the SQL in `00-fondamenta (1).md` §6 mirrors the base. Later migrations add tactics, theory/repertoire, traps, guided path, dashboard, instructor layer, and GDPR fields. Key design choices:
- `profiles` extends `auth.users`; a trigger (`handle_new_user`) auto-creates a profile row on signup, pulling `display_name` and (from `0012`) `birth_date` + parental-consent fields from signup metadata. `updated_at` maintained by trigger.
- **Progress is tracked granularly** in `user_progress`: one row per `(user_id, dimension, key)` (e.g. tactic theme `fork`, opening `sicilian_najdorf`), with a `score` 0..1 — not boolean "completed" flags. This feeds the AI coach and the instructor dashboard.
- **Layer 1 (instructor/club)** tables (`groups`, `group_members`, `assignments`, …) are **active** (built in prompt 09). Group membership is optional; content is assignable to a user or a group.
- **GDPR (`0012_gdpr_minors.sql`):** `profiles.birth_date` drives the 14-yr digital-consent threshold (parental consent flow at signup for <14). Account erasure cascades through `on delete cascade` FKs; data export reads the user's own rows (RLS-scoped).
- **RLS is on for every table with user data.** Users access only their own rows; instructors can *read* (not write) data of members in groups they own, via the `security definer` helper `is_group_instructor_of(target_user)` (avoids RLS recursion). `content_items`/`puzzles` are public-readable content, staff-writable.

**Design system (`src/styles/globals.css` + `src/config`).** Editorial, sober, "study tool" aesthetic — strict black/white/neutral-gray monochrome, no decorative accent color. Primary actions express by **inversion** (dark theme → light button; light theme → dark button), driven by `--accent`/`--accent-contrast` CSS variables. The **one exception**: `--eval-*` semantic colors (brilliant/best/good/inaccuracy/mistake/blunder) appear *only* in move analysis context, never in general UI.
- Dual theme: **la scelta salvata vince; al primo accesso segue `prefers-color-scheme`, fallback dark**. Theme is a class (`dark`/`light`) on `<html>`, persisted to both localStorage and a cookie. An anti-FOUC inline script (`themeInitScript` in `theme-provider.tsx`) applies the theme in `<head>` before render; `ThemeProvider` reads the already-applied class to stay in sync.
- **Fonts** (`src/app/fonts.ts`) are self-hosted via `next/font` (GDPR — no runtime Google Fonts calls): Fraunces (display), Inter (UI), **JetBrains Mono for ALL chess notation** (SAN, FEN, PGN, ECO codes, evals like `+1.4`) — a product rule, not a style choice.
- UI primitives in `src/components/ui/` (re-exported from `index.ts`), composed with `cn()` (`src/lib/utils.ts` = clsx + tailwind-merge). No heavy external component libraries.

**App shell.** `src/components/layout/` holds AppShell/Sidebar/Topbar. `nav.ts` defines sidebar items. `/app/sandbox` (added in prompt 01) is a dev-only page, reachable by URL but never added to the sidebar. `SiteFooter` (`layout/site-footer.tsx`) carries the legal links + cookie-preferences reopen on public pages.

**i18n & compliance (prompt 10).** `next-intl` **without URL routing**: locale resolves from the `NEXT_LOCALE` cookie (kept in sync with `profiles.locale` by the profile action), default `it`; config in `src/i18n/`, strings in `src/messages/{it,en}.json`. Only the public surface (landing, footer, consent) is fully translated — deep app components still hold inline Italian and can be migrated incrementally; the infra is additive, no refactor needed. **Cookie consent** (`src/components/consent/`, `src/lib/consent/`) is a custom Garante-conforming banner (Accept/Reject parity, no wall, no preselected non-necessary categories, reopenable from the footer) — no third-party CMP. **Coach AI routes** (`/api/coach/*`) are rate-limited per-user + per-IP via Upstash (`src/lib/security/ratelimit.ts`, no-op without env) and validate FEN/question input (`src/lib/security/validate.ts`). **SEO:** `sitemap.ts`/`robots.ts` (dynamic), JSON-LD via `src/components/seo/JsonLd.tsx`, `/app` is `noindex`. Legal pages `/privacy`, `/cookie-policy`, `/termini` are structured drafts pending legal review.

## Conventions

- Code comments and all UI copy are in **Italian** (default locale `it`). Match this when editing. New public-surface copy goes through `next-intl` (`src/messages/`); deep app copy stays inline Italian until migrated.
- TypeScript strict; explicit types on component props and hook return values; avoid unjustified `any`.
- No third-party client-side font/resource calls (GDPR). Serve chess assets (piece sets, CSS) locally — no CDNs.
- When implementing a chess module: `chess.js` is the sole authority on rules and legality; `chessground` only renders and captures input (it must be told legal `dests`, never validates). Wrap chessground in a React component (`'use client'`, `dynamic(..., { ssr: false })`) and update it via `.set()` rather than recreating the instance.

## Design System

Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there
(direzione "Sala Torneo": carbone caldo + accento arancio segnale + Archivo + diagonale 45°).
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.
Note: DESIGN.md supersedes the monochrome/inversion description in the
"Design system" paragraph above where the two conflict; implementation status is tracked in DESIGN.md.
