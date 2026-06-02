# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Shakh — chess learning platform. Takes a player from absolute beginner to strong club level (1800–2200). The differentiator is an **AI coach in Italian** that explains the *why* of moves, anchored to objective data (Stockfish engine + Lichess API stats).

The product is built incrementally via numbered spec prompts `00`–`10` (Italian markdown files in the repo root, e.g. `00-fondamenta (1).md`, `01-scacchiera-core (1).md`). **Each prompt has hard scope boundaries — it explicitly forbids anticipating later prompts.** Read the relevant prompt file before building a module; it is the authoritative spec for that module's behavior, constraints, and deliverables. Current state: prompts `00`–`03` are built (foundations, chessboard core, Stockfish engine, game import + move-by-move analysis). Prompts `04`+ (coach AI, tactics, theory, guided path) are not yet implemented.

## Commands

```bash
npm run dev     # dev server (localhost:3000)
npm run build   # production build — must stay clean
npm run lint    # eslint (next lint)
```

No test setup exists yet. Database migrations live in `supabase/migrations/`; apply `0001_init.sql` via `supabase db push` or by pasting it into the Supabase SQL editor (it applies cleanly from zero).

Env vars (`.env.local`, never committed): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY` (reserved, unused until prompt 04), `NEXT_PUBLIC_APP_URL`.

## Stack

Next.js 15 (App Router, RSC + Server Actions) · TypeScript strict · Tailwind CSS 4 · Supabase (`@supabase/ssr`) · Framer Motion (micro-interactions) · GSAP (scene animations) · Lenis (smooth scroll). Path alias `@/*` → `src/*`. Chess libs `chess.js` + `chessground` are installed but not yet used.

## Architecture

**Auth & route protection.** Three Supabase clients, do not mix them:
- `src/lib/supabase/client.ts` — browser (Client Components)
- `src/lib/supabase/server.ts` — server (Server Components, Actions, Route Handlers); reads/writes cookies via `next/headers`
- `src/lib/supabase/middleware.ts` (`updateSession`) — called from `src/middleware.ts`, refreshes the session token and gates routes: everything under `/app` requires auth (else → `/login`); logged-in users on auth pages → `/app`. **Never put logic between `createServerClient` and `getUser()` in the middleware.** Layouts under `/app` also re-guard server-side as defense in depth.

**Database (`supabase/migrations/0001_init.sql`).** Single source of truth for the schema; the SQL in `00-fondamenta (1).md` §6 mirrors it. Key design choices, built now for layers not yet active:
- `profiles` extends `auth.users`; a trigger (`handle_new_user`) auto-creates a profile row on signup, pulling `display_name` from signup metadata. `updated_at` maintained by trigger.
- **Progress is tracked granularly** in `user_progress`: one row per `(user_id, dimension, key)` (e.g. tactic theme `fork`, opening `sicilian_najdorf`), with a `score` 0..1 — not boolean "completed" flags. This feeds the AI coach and the future instructor dashboard.
- **Layer 1 (instructor/club)** tables (`groups`, `group_members`, `assignments`) exist but are unused in the MVP. Group membership is optional; content is assignable to a user or a group.
- **RLS is on for every table with user data.** Users access only their own rows; instructors can *read* (not write) data of members in groups they own, via the `security definer` helper `is_group_instructor_of(target_user)` (avoids RLS recursion). `content_items`/`puzzles` are public-readable content, staff-writable.

**Design system (`src/styles/globals.css` + `src/config`).** Editorial, sober, "study tool" aesthetic — strict black/white/neutral-gray monochrome, no decorative accent color. Primary actions express by **inversion** (dark theme → light button; light theme → dark button), driven by `--accent`/`--accent-contrast` CSS variables. The **one exception**: `--eval-*` semantic colors (brilliant/best/good/inaccuracy/mistake/blunder) appear *only* in move analysis context, never in general UI.
- Dual theme, **dark by default**. Theme is a class (`dark`/`light`) on `<html>`, persisted to both localStorage and a cookie. An anti-FOUC inline script (`themeInitScript` in `theme-provider.tsx`) applies the theme in `<head>` before render; `ThemeProvider` reads the already-applied class to stay in sync.
- **Fonts** (`src/app/fonts.ts`) are self-hosted via `next/font` (GDPR — no runtime Google Fonts calls): Fraunces (display), Inter (UI), **JetBrains Mono for ALL chess notation** (SAN, FEN, PGN, ECO codes, evals like `+1.4`) — a product rule, not a style choice.
- UI primitives in `src/components/ui/` (re-exported from `index.ts`), composed with `cn()` (`src/lib/utils.ts` = clsx + tailwind-merge). No heavy external component libraries.

**App shell.** `src/components/layout/` holds AppShell/Sidebar/Topbar. `nav.ts` defines sidebar items; future-module items are present but marked `comingSoon` (a "presto" badge) so the full structure is visible. `/app/sandbox` (added in prompt 01) is a dev-only page, reachable by URL but never added to the sidebar.

## Conventions

- Code comments and all UI copy are in **Italian** (default locale `it`). Match this when editing.
- TypeScript strict; explicit types on component props and hook return values; avoid unjustified `any`.
- No third-party client-side font/resource calls (GDPR). Serve chess assets (piece sets, CSS) locally — no CDNs.
- When implementing a chess module: `chess.js` is the sole authority on rules and legality; `chessground` only renders and captures input (it must be told legal `dests`, never validates). Wrap chessground in a React component (`'use client'`, `dynamic(..., { ssr: false })`) and update it via `.set()` rather than recreating the instance.
