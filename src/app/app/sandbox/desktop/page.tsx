"use client";

import { useState } from "react";
import {
  Compass,
  Target,
  Crosshair,
  Wrench,
  Flag,
  Library,
  ChevronRight,
  ArrowUpRight,
  Search,
  RotateCcw,
  Check,
  Play,
  Infinity as InfinityIcon,
  Timer,
  Upload,
  Plus,
  Swords,
  Globe,
  Clock,
  MessageSquare,
  Send,
  Sparkles,
  Pencil,
  Dumbbell,
  Lock,
  Circle,
  CircleDot,
  CheckCircle2,
  Users,
  KeyRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GlyphWatermark } from "@/components/layout/GlyphWatermark";

/**
 * SHOWCASE DESKTOP (dev-only, solo via URL): redesign desktop pagina per pagina,
 * mostrato dal vivo dentro una cornice "finestra browser" con la chrome desktop
 * (rail sidebar a sinistra). Dati finti, nessuna chiamata al DB. Non in sidebar.
 *
 * Si sceglie pagina + variante; quando una direzione va bene, la si applica alla
 * pagina reale (sezione `hidden md:block`).
 */

// ---- Dati finti coerenti col modello reale ----
const MOCK = {
  name: "Manuel",
  date: "Wednesday, June 4",
  rating: 1480,
  rd: 62,
  breakdown: [
    { label: "Tactics", value: 1520, delta: "+18" },
    { label: "Endgames", value: 1410, delta: "−4" },
    { label: "Calculation", value: 1455, delta: "+9" },
    { label: "Play", value: 1490, delta: "+12" },
  ],
  stats: [
    { label: "Level", value: "7", sub: "12 / 40 nodes" },
    { label: "Streak", value: "9", sub: "best 14" },
    { label: "Accuracy", value: "82%", sub: "23 games" },
    { label: "Solved", value: "340", sub: "tactics" },
  ],
  // Dimensioni dello Shakh rating come righe editoriali (variante A, colonna dx).
  dimensions: [
    { label: "Tactics", sub: "340 solved · sharp", value: 1520, delta: "+18" },
    { label: "Endgames", sub: "rook endings lag", value: 1410, delta: "−4" },
    { label: "Calculation", sub: "depth improving", value: 1455, delta: "+9" },
    { label: "Play", sub: "23 games analyzed", value: 1490, delta: "+12" },
    { label: "Openings", sub: "Najdorf repertoire", value: 1465, delta: "+6" },
  ],
  step: {
    kicker: "Next step",
    title: "Pin on the king",
    reason:
      "You missed 3 winning pins in your last games. A focused set drills the exact pattern until it becomes automatic.",
    cta: "Train now",
  },
  train: [
    { label: "Daily tactics", detail: "8 puzzles · ~6 min", icon: Target },
    { label: "Weaknesses", detail: "Pins, rook endgames", icon: Crosshair },
    { label: "Fix mistakes", detail: "3 blunders from games", icon: Wrench },
    { label: "Endgame drill", detail: "Lucena position", icon: Flag },
  ],
  activity: [
    { when: "Today", what: "Solved 8/8 daily tactics", tag: "+18" },
    { when: "Yesterday", what: "Analyzed 2 games vs Rossi", tag: "82%" },
    { when: "Mon", what: "Repertoire: Najdorf, 6.Be2 line", tag: "drill" },
    { when: "Sun", what: "Endgame: Lucena & Philidor", tag: "done" },
  ],
};

// Piano di oggi (mock coerente con buildDailyPlan: blocchi tipizzati + progresso).
const TODAY = {
  date: "Wednesday, June 4",
  totalMin: 28,
  blocks: [
    {
      kind: "review",
      title: "Review yesterday's misses",
      detail: "3 cards due · spaced repetition",
      done: 3,
      target: 3,
      estMin: 4,
      icon: RotateCcw,
    },
    {
      kind: "weakness",
      title: "Pins on the king",
      detail: "Your weakest pattern right now",
      done: 2,
      target: 6,
      estMin: 8,
      icon: Crosshair,
    },
    {
      kind: "tactics",
      title: "Daily tactics set",
      detail: "8 puzzles at your level",
      done: 0,
      target: 8,
      estMin: 6,
      icon: Target,
    },
    {
      kind: "endgame",
      title: "Rook endgame drill",
      detail: "Lucena position",
      done: 0,
      target: 4,
      estMin: 6,
      icon: Flag,
    },
    {
      kind: "repertoire",
      title: "Repertoire refresh",
      detail: "Najdorf, 6.Be2 main line",
      done: 0,
      target: 5,
      estMin: 4,
      icon: Library,
    },
  ],
};

// Tattiche (hub): rating tattico + serie + modalità + temi con padronanza.
const TACTICS = {
  rating: 1520,
  delta: "+18",
  streak: 9,
  best: 14,
  solved: 340,
  reviewDue: 6,
  modes: [
    {
      key: "adaptive",
      title: "Adaptive",
      desc: "Endless puzzles tuned to your level. The default training.",
      icon: InfinityIcon,
    },
    {
      key: "theme",
      title: "By theme",
      desc: "Drill one pattern — pins, forks, back-rank — until it sticks.",
      icon: Target,
    },
    {
      key: "review",
      title: "Review",
      desc: "Spaced repetition of puzzles you missed before.",
      icon: RotateCcw,
    },
    {
      key: "timed",
      title: "Timed",
      desc: "Race the clock. Sharpen speed and pattern recognition.",
      icon: Timer,
    },
  ],
  themes: [
    { label: "Forks", mastery: 0.82 },
    { label: "Pins", mastery: 0.41 },
    { label: "Skewers", mastery: 0.66 },
    { label: "Discovered", mastery: 0.58 },
    { label: "Back rank", mastery: 0.74 },
    { label: "Deflection", mastery: 0.49 },
    { label: "Sacrifice", mastery: 0.63 },
    { label: "Endgame", mastery: 0.37 },
  ],
};

// Teoria (hub): tre rami con lezioni (titolo, sommario, codice ECO) + sfoglia.
const THEORY = {
  branches: [
    {
      type: "opening",
      title: "Openings",
      glyph: "♟",
      browse: "Browse by ECO",
      lessons: [
        { title: "Italian Game", summary: "Classical 1.e4 e5 with quick development.", eco: "C50" },
        { title: "Sicilian Najdorf", summary: "Black's most combative answer to 1.e4.", eco: "B90" },
        { title: "Queen's Gambit", summary: "Fight for the centre with 1.d4 d5 2.c4.", eco: "D06" },
        { title: "Ruy Lopez", summary: "The Spanish: pressure on e5 from move three.", eco: "C60" },
      ],
    },
    {
      type: "middlegame",
      title: "Middlegame",
      glyph: "♞",
      browse: "Browse themes",
      lessons: [
        { title: "Pawn structures", summary: "Isolani, hanging pawns, pawn chains.", eco: null },
        { title: "Open files & outposts", summary: "Where rooks and knights belong.", eco: null },
        { title: "The bishop pair", summary: "Converting a long-term static edge.", eco: null },
      ],
    },
    {
      type: "endgame",
      title: "Endgames",
      glyph: "♚",
      browse: "Browse endgames",
      lessons: [
        { title: "Lucena position", summary: "The winning technique with a rook pawn.", eco: null },
        { title: "Philidor position", summary: "The essential rook-endgame draw.", eco: null },
        { title: "King & pawn", summary: "Opposition and the rule of the square.", eco: null },
        { title: "Opposite bishops", summary: "Why they so often draw.", eco: null },
      ],
    },
  ],
};

// Partite (lista + import): riepilogo record + tabella partite.
const GAMES = {
  summary: { wins: 14, draws: 5, losses: 4, avgAccuracy: 82, analyzed: 18, total: 23 },
  rows: [
    { date: "Jun 3", opponent: "Rossi", oppRating: 1532, color: "w", result: "win", opening: "Italian Game", eco: "C50", accuracy: 88, analyzed: true },
    { date: "Jun 2", opponent: "bishopHunter", oppRating: 1498, color: "b", result: "loss", opening: "Sicilian Najdorf", eco: "B90", accuracy: 74, analyzed: true },
    { date: "Jun 1", opponent: "Bianchi", oppRating: 1510, color: "w", result: "draw", opening: "Ruy Lopez", eco: "C60", accuracy: 81, analyzed: true },
    { date: "May 30", opponent: "knight_e5", oppRating: 1455, color: "b", result: "win", opening: "Caro-Kann", eco: "B12", accuracy: 85, analyzed: true },
    { date: "May 29", opponent: "Verdi", oppRating: 1601, color: "w", result: "loss", opening: "Queen's Gambit", eco: "D37", accuracy: 79, analyzed: false },
    { date: "May 28", opponent: "pawnstorm", oppRating: 1472, color: "b", result: "win", opening: "French Defence", eco: "C02", accuracy: 90, analyzed: true },
  ],
};

// Gioca (hub): locale (hotseat) + online (colore, tempo, partite in corso).
const PLAY = {
  times: ["3+2", "5+0", "10+0", "15+10", "30+0", "∞"],
  myGames: [
    { opp: "Bianchi", color: "w", tc: "10+0", status: "ongoing" },
    { opp: "waiting…", color: "b", tc: "5+0", status: "waiting" },
    { opp: "Rossi", color: "w", tc: "15+10", status: "over", result: "1–0" },
  ],
};

// Coach (AI in italiano): errori per fase + sintesi a parole + domande.
const COACH = {
  games: 23,
  moves: 1184,
  byPhase: [
    { phase: "Opening", moves: 412, inacc: 18, mistakes: 6, blunders: 1, score: 0.86 },
    { phase: "Middlegame", moves: 520, inacc: 31, mistakes: 14, blunders: 5, score: 0.61, worst: true },
    { phase: "Endgame", moves: 252, inacc: 12, mistakes: 7, blunders: 3, score: 0.7 },
  ],
  synthesis:
    "Il tuo gioco di apertura è solido: esci dalla teoria con buone posizioni. Il problema nasce nel mediogioco, dove perdi il filo nelle posizioni con tensione al centro — tendi a giocare mosse d'attesa proprio quando serve un piano concreto. In tre partite recenti hai sciupato vantaggi cedendo la colonna aperta. Lavoriamo sui piani tipici delle strutture isolate: chi controlla le case deboli, dove vanno i pezzi.",
  suggestions: [
    "Perché perdo il vantaggio nel mediogioco?",
    "Mostrami un piano contro il pedone isolato",
    "Quali errori ripeto in finale?",
  ],
};

// Repertorio: repertori per colore (mosse, padronanza, da ripassare).
const REPERTOIRE = [
  { name: "Najdorf Sicilian", color: "black", moves: 84, mastery: 0.72, due: 6 },
  { name: "Italian as White", color: "white", moves: 61, mastery: 0.58, due: 12 },
  { name: "Caro-Kann", color: "black", moves: 47, mastery: 0.81, due: 0 },
  { name: "London System", color: "white", moves: 38, mastery: 0.4, due: 9 },
  { name: "Queen's Gambit", color: "white", moves: 73, mastery: 0.66, due: 3 },
];

// Percorso: livelli con nodi (stato, progresso, attività).
const PATH = {
  currentLevel: 2,
  levels: [
    {
      level: 0,
      title: "Foundations",
      nodes: [
        { title: "How the pieces move", status: "completed", progress: 1, acts: ["Lesson"] },
        { title: "Check, mate, stalemate", status: "completed", progress: 1, acts: ["Lesson"] },
      ],
    },
    {
      level: 1,
      title: "First principles",
      nodes: [
        { title: "Opening principles", status: "completed", progress: 1, acts: ["Theory"] },
        { title: "Basic tactics", status: "completed", progress: 1, acts: ["Tactics"] },
        { title: "Mating patterns", status: "completed", progress: 1, acts: ["Drill"] },
      ],
    },
    {
      level: 2,
      title: "Club player",
      nodes: [
        { title: "Pins & forks in depth", status: "in_progress", progress: 0.45, acts: ["Tactics", "Theory"] },
        { title: "Rook endgames", status: "in_progress", progress: 0.2, acts: ["Endgame"] },
        { title: "Middlegame plans", status: "available", progress: 0, acts: ["Theory"] },
        { title: "Build a repertoire", status: "available", progress: 0, acts: ["Repertoire"] },
      ],
    },
    {
      level: 3,
      title: "Strong club",
      nodes: [
        { title: "Prophylaxis", status: "locked", progress: 0, acts: [] },
        { title: "Complex endgames", status: "locked", progress: 0, acts: [] },
      ],
    },
  ],
};

// Profilo: identità + competenze (radar) + andamenti + account collegati.
const PROFILE = {
  name: "Manuel Micheli",
  email: "manuel@example.com",
  level: 7,
  elo: 1480,
  joined: "Member since Mar 2026",
  locale: "Italiano",
  competence: [
    { label: "Openings", value: 0.7 },
    { label: "Tactics", value: 0.82 },
    { label: "Endgames", value: 0.48 },
    { label: "Calculation", value: 0.6 },
    { label: "Defense", value: 0.55 },
    { label: "Attack", value: 0.74 },
  ],
  ratingTrend: [1380, 1395, 1402, 1418, 1410, 1432, 1448, 1455, 1470, 1480],
  accuracyTrend: [71, 74, 73, 78, 76, 80, 79, 83, 81, 84],
  accounts: [
    { source: "Lichess", username: "manuel_m", rating: 1612, verified: true },
    { source: "Chess.com", username: "manuelM03", rating: 1340, verified: false },
  ],
};

// Gruppi: gruppi a cui appartieni (tipo, ruolo, membri) + crea + unisciti.
const GROUPS = [
  { name: "Circolo Scacchi Modena", type: "Club", role: "instructor", members: 24, initials: ["MR", "GB", "LV", "AC", "PS"] },
  { name: "Scuola media Pascoli — 2B", type: "Class", role: "instructor", members: 18, initials: ["EN", "TT", "RM", "FB"] },
  { name: "Allenamento del martedì", type: "Team", role: "member", members: 6, initials: ["MM", "DV", "SR"] },
];

type PageId =
  | "dashboard"
  | "today"
  | "tactics"
  | "theory"
  | "games"
  | "play"
  | "coach"
  | "repertoire"
  | "path"
  | "profile"
  | "groups";
type Variant =
  | "broadsheet"
  | "dossier"
  | "bento"
  | "session"
  | "timeline"
  | "arena"
  | "themesgrid"
  | "library"
  | "tableindex"
  | "ledger"
  | "gamecards"
  | "lobby"
  | "tableplay"
  | "briefing"
  | "conversation"
  | "collection"
  | "workbench"
  | "roadmap"
  | "atlas"
  | "passport"
  | "console"
  | "roster"
  | "directory";

const PAGES: { id: PageId; name: string; active: string }[] = [
  { id: "dashboard", name: "Dashboard", active: "Dashboard" },
  { id: "today", name: "Today", active: "Today" },
  { id: "tactics", name: "Tactics", active: "Tactics" },
  { id: "theory", name: "Theory", active: "Theory" },
  { id: "games", name: "Games", active: "Games" },
  { id: "play", name: "Play", active: "Play" },
  { id: "coach", name: "Coach", active: "Coach" },
  { id: "repertoire", name: "Repertoire", active: "Repertoire" },
  { id: "path", name: "Path", active: "Path" },
  { id: "profile", name: "Profile", active: "Profile" },
  { id: "groups", name: "Groups", active: "Groups" },
];

const VARIANTS: Record<PageId, { id: Variant; name: string; tag: string }[]> = {
  dashboard: [
    { id: "broadsheet", name: "A · Broadsheet", tag: "full-width masthead" },
    { id: "dossier", name: "B · Dossier", tag: "stat rail + main" },
    { id: "bento", name: "C · Bento", tag: "asymmetric tile grid" },
  ],
  today: [
    { id: "session", name: "A · Session", tag: "overview rail + blocks" },
    { id: "timeline", name: "B · Timeline", tag: "connected stepper" },
  ],
  tactics: [
    { id: "arena", name: "A · Arena", tag: "rating rail + mode cards" },
    { id: "themesgrid", name: "B · Themes", tag: "mastery-forward grid" },
  ],
  theory: [
    { id: "library", name: "A · Library", tag: "three shelves" },
    { id: "tableindex", name: "B · Index", tag: "editorial contents" },
  ],
  games: [
    { id: "ledger", name: "A · Ledger", tag: "summary band + data table" },
    { id: "gamecards", name: "B · Cards", tag: "import rail + game cards" },
  ],
  play: [
    { id: "lobby", name: "A · Lobby", tag: "two mode panels" },
    { id: "tableplay", name: "B · Table", tag: "board + configurator" },
  ],
  coach: [
    { id: "briefing", name: "A · Briefing", tag: "data + coach's note" },
    { id: "conversation", name: "B · Conversation", tag: "metrics rail + chat" },
  ],
  repertoire: [
    { id: "collection", name: "A · Collection", tag: "white / black columns" },
    { id: "workbench", name: "B · Workbench", tag: "create rail + cards" },
  ],
  path: [
    { id: "roadmap", name: "A · Roadmap", tag: "level bands + nodes" },
    { id: "atlas", name: "B · Atlas", tag: "level rail + nodes" },
  ],
  profile: [
    { id: "passport", name: "A · Passport", tag: "identity + stats board" },
    { id: "console", name: "B · Console", tag: "rail + tabbed sections" },
  ],
  groups: [
    { id: "roster", name: "A · Roster", tag: "group cards + action rail" },
    { id: "directory", name: "B · Directory", tag: "toolbar + table" },
  ],
};

const DEFAULT_VARIANT: Record<PageId, Variant> = {
  dashboard: "broadsheet",
  today: "session",
  tactics: "arena",
  theory: "library",
  games: "ledger",
  play: "lobby",
  coach: "briefing",
  repertoire: "collection",
  path: "roadmap",
  profile: "passport",
  groups: "roster",
};

export default function DesktopShowcasePage() {
  const [page, setPage] = useState<PageId>("dashboard");
  const [variant, setVariant] = useState<Variant>("broadsheet");

  function selectPage(id: PageId) {
    setPage(id);
    setVariant(DEFAULT_VARIANT[id]);
  }

  const activePage = PAGES.find((p) => p.id === page)!;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Desktop redesign · {activePage.name}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Live directions in a desktop window frame. Pick one and I&apos;ll apply
          it to the real page.
        </p>
      </header>

      {/* Selettore pagina */}
      <div className="flex flex-wrap gap-1 border-b border-border pb-px">
        {PAGES.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => selectPage(p.id)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm transition-colors",
              page === p.id
                ? "border-text font-medium text-text"
                : "border-transparent text-text-muted hover:text-text",
            )}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Selettore variante */}
      <div className="flex flex-wrap gap-2">
        {VARIANTS[page].map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setVariant(v.id)}
            className={cn(
              "rounded-lg border px-4 py-2 text-left transition-colors",
              variant === v.id
                ? "border-text bg-surface-2"
                : "border-border hover:bg-surface-2",
            )}
          >
            <span className="block text-sm font-medium">{v.name}</span>
            <span className="block text-xs text-text-muted">{v.tag}</span>
          </button>
        ))}
      </div>

      {/* Cornice finestra desktop */}
      <BrowserFrame>
        <div className="flex h-[760px] min-h-0">
          <DeskRail active={activePage.active} />
          <div className="flex min-w-0 flex-1 flex-col">
            <DeskTopbar />
            <div className="min-h-0 flex-1 overflow-y-auto bg-bg p-8">
              {variant === "broadsheet" && <Broadsheet />}
              {variant === "dossier" && <Dossier />}
              {variant === "bento" && <Bento />}
              {variant === "session" && <TodaySession />}
              {variant === "timeline" && <TodayTimeline />}
              {variant === "arena" && <TacticsArena />}
              {variant === "themesgrid" && <TacticsThemes />}
              {variant === "library" && <TheoryLibrary />}
              {variant === "tableindex" && <TheoryIndex />}
              {variant === "ledger" && <GamesLedger />}
              {variant === "gamecards" && <GamesCards />}
              {variant === "lobby" && <PlayLobby />}
              {variant === "tableplay" && <PlayTable />}
              {variant === "briefing" && <CoachBriefing />}
              {variant === "conversation" && <CoachConversation />}
              {variant === "collection" && <RepertoireCollection />}
              {variant === "workbench" && <RepertoireWorkbench />}
              {variant === "roadmap" && <PathRoadmap />}
              {variant === "atlas" && <PathAtlas />}
              {variant === "passport" && <ProfilePassport />}
              {variant === "console" && <ProfileConsole />}
              {variant === "roster" && <GroupsRoster />}
              {variant === "directory" && <GroupsDirectory />}
            </div>
          </div>
        </div>
      </BrowserFrame>
    </div>
  );
}

/* ============================================================
   Cornice finestra browser — barra titolo coi pallini, viewport.
   ============================================================ */
function BrowserFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
      <div className="flex h-9 items-center gap-2 border-b border-border bg-surface px-4">
        <span className="h-3 w-3 rounded-full border border-border" />
        <span className="h-3 w-3 rounded-full border border-border" />
        <span className="h-3 w-3 rounded-full border border-border" />
        <span className="mx-auto flex h-5 items-center rounded-md bg-surface-2 px-3 font-mono text-[11px] text-text-muted">
          shakh.app/app
        </span>
      </div>
      {children}
    </div>
  );
}

/* Rail sidebar desktop finto (chrome reale, non interattivo). */
function DeskRail({ active }: { active: string }) {
  const groups = [
    { label: null, items: ["Today", "Dashboard"] },
    { label: "Study", items: ["Learn", "Theory", "Repertoire"] },
    { label: "Train", items: ["Tactics", "Calculation", "Weaknesses"] },
    { label: "Play", items: ["Play", "Games", "Coach"] },
  ];
  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-surface lg:flex">
      <div className="flex h-14 items-center gap-2 px-5 font-display text-xl font-semibold tracking-tight">
        <span className="grid h-5 w-5 place-items-center font-display">♞</span>
        Shakh
      </div>
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-2 text-sm">
        {groups.map((g, gi) => (
          <div key={g.label ?? gi} className="space-y-1">
            {g.label && (
              <p className="px-3 py-1 text-xs font-semibold tracking-tight">
                {g.label}
              </p>
            )}
            {g.items.map((it) => (
              <span
                key={it}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2",
                  it === active
                    ? "bg-surface-2 font-medium text-text"
                    : "text-text-muted",
                )}
              >
                <span className="h-4 w-4 shrink-0 rounded-sm border border-current opacity-40" />
                {it}
              </span>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}

function DeskTopbar() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-6">
      <span className="text-sm text-text-muted">Hi, {MOCK.name}</span>
      <div className="flex items-center gap-3 text-text-muted">
        <Search className="h-4 w-4" />
        <span className="h-4 w-px bg-border" />
        <span className="grid h-8 w-8 place-items-center rounded-full bg-text text-xs font-semibold text-bg">
          M
        </span>
      </div>
    </header>
  );
}

/* ============================================================
   VARIANTE A — BROADSHEET
   Masthead editoriale a tutta larghezza, regola damier, poi una griglia:
   rating-hero incorniciato (sx) + breakdown e statistiche (dx). Sotto, il
   next-step come feature card larga affiancato a "Train now" a tessere.
   ============================================================ */
function Broadsheet() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Masthead */}
      <div className="relative">
        <div className="relative">
          <p className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
            {MOCK.date} · the picture of your progress
          </p>
          <h2 className="mt-2 font-display text-5xl font-semibold leading-[1.02] tracking-tight">
            Hi, {MOCK.name}.
          </h2>
        </div>
      </div>

      <div className="chess-rule h-1.5 w-full opacity-80" />

      {/* Rating hero + dimensioni */}
      <div className="grid grid-cols-[20rem_1fr] gap-8">
        {/* Card rating — hero curato: glifo, numero grande, trend + sparkline. */}
        <RatingCard />

        {/* Dimensioni dello Shakh rating come righe editoriali. */}
        <div className="divide-y divide-border border-y border-border">
          {MOCK.dimensions.map((d) => (
            <div
              key={d.label}
              className="flex items-baseline justify-between gap-4 py-4"
            >
              <div className="min-w-0">
                <p className="text-sm">{d.label}</p>
                <p className="mt-0.5 font-mono text-[11px] text-text-muted">
                  {d.sub}
                </p>
              </div>
              <p className="flex shrink-0 items-baseline gap-2 text-right">
                <span className="font-display text-3xl font-semibold tabular-nums">
                  {d.value}
                </span>
                <span className="w-8 font-mono text-xs text-text-muted">
                  {d.delta}
                </span>
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Next step (feature) + Train now (tessere) */}
      <div className="grid grid-cols-[1fr_22rem] gap-8">
        <FeatureNextStep />
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-text-muted">
            Train now
          </p>
          <div className="grid grid-cols-2 gap-3">
            {MOCK.train.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.label}
                  type="button"
                  className="group flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-text"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-surface-2">
                    <Icon className="h-[1.05rem] w-[1.05rem]" />
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{t.label}</span>
                    <span className="block text-xs text-text-muted">
                      {t.detail}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureNextStep() {
  return (
    <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-surface p-7">
      <GlyphWatermark glyph="♟" />
      <div className="relative">
        <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-text-muted">
          <Compass className="h-3.5 w-3.5" /> {MOCK.step.kicker}
        </span>
        <h3 className="mt-3 font-display text-3xl font-semibold tracking-tight">
          {MOCK.step.title}
        </h3>
        <p className="mt-2 max-w-md text-sm text-text-muted">
          {MOCK.step.reason}
        </p>
      </div>
      <button
        type="button"
        className="relative mt-6 inline-flex h-11 w-fit items-center gap-1.5 rounded-lg bg-text px-6 text-sm font-medium text-bg"
      >
        {MOCK.step.cta}
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/* Card rating: hero editoriale curato. Glifo cavallo in filigrana, numero
   grande mono, ± RD come pill, riga di trend e sparkline monocromatica. */
function RatingCard() {
  return (
    <div className="chess-corners relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface p-7">
      <GlyphWatermark glyph="♞" />

      <div className="relative flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.2em] text-text-muted">
          Shakh rating
        </span>
        <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-text-muted">
          OTB
        </span>
      </div>

      <div className="relative mt-5 flex items-baseline gap-3">
        <span className="font-mono text-[5.5rem] font-semibold leading-none tabular-nums tracking-tighter">
          {MOCK.rating}
        </span>
        <span className="mb-1 rounded-md bg-surface-2 px-2 py-1 font-mono text-xs text-text-muted">
          ± {MOCK.rd}
        </span>
      </div>

      <div className="relative mt-4 flex items-center gap-2 font-mono text-xs">
        <span className="inline-flex items-center gap-1 text-text">
          <ArrowUpRight className="h-3.5 w-3.5" />
          +45
        </span>
        <span className="text-text-muted">last 30 days</span>
      </div>

      <div className="relative mt-6">
        <Sparkline />
      </div>
    </div>
  );
}

/* Sparkline monocromatica: traiettoria rating recente. Stroke su `currentColor`,
   area sfumata leggera, punto finale evidenziato. Puramente decorativa. */
function Sparkline() {
  const pts = [1432, 1428, 1445, 1440, 1458, 1452, 1466, 1471, 1480];
  const w = 240;
  const h = 56;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = max - min || 1;
  const step = w / (pts.length - 1);
  const xy = pts.map((v, i) => [
    i * step,
    h - ((v - min) / span) * (h - 6) - 3,
  ]);
  const line = xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `0,${h} ${line} ${w},${h}`;
  const [lx, ly] = xy[xy.length - 1];

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-14 w-full text-text"
      preserveAspectRatio="none"
      aria-hidden
    >
      <polygon points={area} fill="currentColor" opacity={0.06} />
      <polyline
        points={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={lx} cy={ly} r={3} fill="currentColor" />
    </svg>
  );
}

/* ============================================================
   VARIANTE B — DOSSIER
   Colonna sinistra "fascicolo": rating + breakdown + statistiche impilati
   come un rail di dati. Colonna principale: next-step in evidenza, tessere
   train, attività recente come timeline editoriale.
   ============================================================ */
function Dossier() {
  return (
    <div className="mx-auto grid max-w-6xl grid-cols-[18rem_1fr] gap-8">
      {/* Rail dati */}
      <div className="space-y-6">
        <div className="relative">
          <p className="text-xs uppercase tracking-wider text-text-muted">
            {MOCK.date}
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight">
            Hi, {MOCK.name}
          </h2>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-text-muted">
            Shakh rating
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-5xl font-semibold tabular-nums tracking-tight">
              {MOCK.rating}
            </span>
            <span className="font-mono text-xs text-text-muted">± {MOCK.rd}</span>
          </div>
        </div>

        <div className="chess-rule h-1 w-full opacity-60" />

        <div className="space-y-3">
          {MOCK.breakdown.map((b) => (
            <div key={b.label} className="flex items-baseline justify-between">
              <span className="text-sm text-text-muted">{b.label}</span>
              <span className="flex items-baseline gap-2">
                <span className="font-mono text-base tabular-nums">{b.value}</span>
                <span className="w-8 text-right font-mono text-[11px] text-text-muted">
                  {b.delta}
                </span>
              </span>
            </div>
          ))}
        </div>

        <div className="chess-rule h-1 w-full opacity-60" />

        <div className="grid grid-cols-2 gap-4">
          {MOCK.stats.map((s) => (
            <div key={s.label}>
              <p className="font-display text-2xl font-semibold tabular-nums">
                {s.value}
              </p>
              <p className="text-xs text-text-muted">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Colonna principale */}
      <div className="space-y-6">
        <FeatureNextStep />

        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-text-muted">
            Train now
          </p>
          <div className="grid grid-cols-4 gap-3">
            {MOCK.train.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.label}
                  type="button"
                  className="group flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-text"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-surface-2">
                    <Icon className="h-[1.05rem] w-[1.05rem]" />
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{t.label}</span>
                    <span className="block text-xs text-text-muted">
                      {t.detail}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-text-muted">
            Recent activity
          </p>
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="divide-y divide-border">
              {MOCK.activity.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 bg-surface px-4 py-3"
                >
                  <span className="w-16 shrink-0 font-mono text-[11px] uppercase tracking-wide text-text-muted">
                    {a.when}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">{a.what}</span>
                  <span className="shrink-0 rounded-full border border-border px-2.5 py-0.5 font-mono text-[11px] tabular-nums text-text-muted">
                    {a.tag}
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   VARIANTE C — BENTO
   Griglia a tessere asimmetrica (bento-box). Riga d'apertura editoriale,
   poi una griglia 12 colonne con tessere di taglie diverse: rating-hero
   grande col glifo cavallo, next-step alto, statistiche piccole, train e
   attività. Densa ma ariosa, ogni tessera incorniciata.
   ============================================================ */
function Bento() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Apertura editoriale compatta */}
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
            {MOCK.date}
          </p>
          <h2 className="mt-1 font-display text-3xl font-semibold tracking-tight">
            Hi, {MOCK.name}
          </h2>
        </div>
        <div className="text-right">
          <p className="font-mono text-[11px] uppercase tracking-wide text-text-muted">
            Level {MOCK.stats[0].value} · {MOCK.stats[0].sub}
          </p>
        </div>
      </div>

      {/* Griglia bento 12 colonne */}
      <div className="grid grid-cols-12 gap-4">
        {/* Rating hero — grande, glifo cavallo */}
        <div className="chess-corners relative col-span-5 row-span-2 overflow-hidden rounded-2xl border border-border bg-surface p-6">
          <GlyphWatermark glyph="♞" />
          <div className="relative flex h-full flex-col">
            <p className="text-xs uppercase tracking-wider text-text-muted">
              Shakh rating
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-mono text-7xl font-semibold tabular-nums tracking-tighter">
                {MOCK.rating}
              </span>
              <span className="font-mono text-sm text-text-muted">
                ± {MOCK.rd}
              </span>
            </div>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-text-muted">
              OTB scale
            </p>
            <div className="my-5 chess-rule h-1 w-full opacity-60" />
            <div className="mt-auto grid grid-cols-2 gap-x-4 gap-y-3">
              {MOCK.breakdown.map((b) => (
                <div key={b.label}>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-mono text-lg tabular-nums">
                      {b.value}
                    </span>
                    <span className="font-mono text-[11px] text-text-muted">
                      {b.delta}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted">{b.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Next step — tessera alta a destra */}
        <div className="relative col-span-7 row-span-2 flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-surface p-6">
          <GlyphWatermark glyph="♟" />
          <div className="relative">
            <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-text-muted">
              <Compass className="h-3.5 w-3.5" /> {MOCK.step.kicker}
            </span>
            <h3 className="mt-3 font-display text-3xl font-semibold tracking-tight">
              {MOCK.step.title}
            </h3>
            <p className="mt-2 max-w-md text-sm text-text-muted">
              {MOCK.step.reason}
            </p>
          </div>
          <button
            type="button"
            className="relative mt-6 inline-flex h-11 w-fit items-center gap-1.5 rounded-lg bg-text px-6 text-sm font-medium text-bg"
          >
            {MOCK.step.cta}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Statistiche — tessere piccole (3 col) */}
        {MOCK.stats.slice(1).map((s) => (
          <div
            key={s.label}
            className="col-span-4 rounded-2xl border border-border bg-surface p-5"
          >
            <p className="font-display text-3xl font-semibold tabular-nums">
              {s.value}
            </p>
            <p className="mt-1 text-sm">{s.label}</p>
            <p className="font-mono text-[11px] text-text-muted">{s.sub}</p>
          </div>
        ))}

        {/* Train now — fascia larga a tessere (7 col) */}
        <div className="col-span-7 rounded-2xl border border-border bg-surface p-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-text-muted">
            Train now
          </p>
          <div className="grid grid-cols-2 gap-3">
            {MOCK.train.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.label}
                  type="button"
                  className="group flex items-center gap-3 rounded-xl border border-border bg-bg p-3 text-left transition-colors hover:border-text"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-2">
                    <Icon className="h-[1.05rem] w-[1.05rem]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{t.label}</span>
                    <span className="block truncate text-xs text-text-muted">
                      {t.detail}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Attività — colonna stretta (5 col) */}
        <div className="col-span-5 rounded-2xl border border-border bg-surface p-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-text-muted">
            Recent activity
          </p>
          <div className="divide-y divide-border">
            {MOCK.activity.map((a, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5">
                <span className="w-12 shrink-0 font-mono text-[10px] uppercase tracking-wide text-text-muted">
                  {a.when}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{a.what}</span>
                <span className="shrink-0 font-mono text-[11px] tabular-nums text-text-muted">
                  {a.tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   TODAY — VARIANTE A · SESSION
   Colonna sinistra "pannello di sessione": tempo stimato, anello di progresso,
   streak, CTA per avviare la sessione. Colonna principale: blocchi numerati.
   ============================================================ */
function TodayProgressRing({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? done / total : 0;
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid h-32 w-32 place-items-center">
      <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90 text-text">
        <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth="6" opacity={0.12} />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <div className="absolute text-center">
        <p className="font-mono text-2xl font-semibold tabular-nums">
          {done}/{total}
        </p>
        <p className="text-[10px] uppercase tracking-wide text-text-muted">blocks</p>
      </div>
    </div>
  );
}

function TodaySession() {
  const doneCount = TODAY.blocks.filter((b) => b.done >= b.target).length;
  return (
    <div className="mx-auto grid max-w-6xl grid-cols-[20rem_1fr] gap-8">
      {/* Pannello sessione */}
      <div className="space-y-6">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
            {TODAY.date}
          </p>
          <h2 className="mt-1 font-display text-3xl font-semibold tracking-tight">
            Today
          </h2>
        </div>

        <div className="chess-corners relative flex flex-col items-center gap-5 overflow-hidden rounded-2xl border border-border bg-surface p-7">
          <TodayProgressRing done={doneCount} total={TODAY.blocks.length} />
          <div className="text-center">
            <p className="font-mono text-4xl font-semibold tabular-nums">
              ~{TODAY.totalMin}
              <span className="text-2xl">′</span>
            </p>
            <p className="mt-1 text-xs uppercase tracking-wide text-text-muted">
              estimated time
            </p>
          </div>
          <button
            type="button"
            className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-text text-sm font-medium text-bg"
          >
            <Play className="h-4 w-4" />
            Start session
          </button>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
          <span className="text-sm text-text-muted">Streak</span>
          <span className="flex items-baseline gap-2">
            <span className="font-display text-xl font-semibold tabular-nums">9</span>
            <span className="font-mono text-[11px] text-text-muted">best 14</span>
          </span>
        </div>
      </div>

      {/* Blocchi */}
      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
          The plan
        </p>
        {TODAY.blocks.map((b, i) => (
          <BlockRowDesktop key={b.kind} block={b} index={i + 1} />
        ))}
      </div>
    </div>
  );
}

function BlockRowDesktop({
  block,
}: {
  block: (typeof TODAY.blocks)[number];
  index: number;
}) {
  const done = block.done >= block.target;
  const pct =
    block.target > 0
      ? Math.min(100, Math.round((block.done / block.target) * 100))
      : 0;
  const Icon = block.icon;
  return (
    <button
      type="button"
      className={cn(
        "group flex w-full items-center gap-4 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-text",
        done && "opacity-60",
      )}
    >
      <span
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-lg",
          done ? "bg-text text-bg" : "bg-surface-2 text-text",
        )}
      >
        {done ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">{block.title}</span>
          <span className="shrink-0 font-mono text-[11px] text-text-muted">
            {block.done}/{block.target}
          </span>
        </span>
        <span className="block truncate text-xs text-text-muted">
          {block.detail}
        </span>
        <span className="mt-2 block h-1 w-full overflow-hidden rounded-full bg-surface-2">
          <span
            className="block h-full rounded-full bg-text transition-all"
            style={{ width: `${pct}%` }}
          />
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className="font-mono text-[11px] text-text-muted">~{block.estMin}′</span>
        <ChevronRight className="h-4 w-4 text-text-muted" />
      </span>
    </button>
  );
}

/* ============================================================
   TODAY — VARIANTE B · TIMELINE
   Stepper verticale connesso: ogni blocco è un nodo su una linea continua.
   Fatti = pieni; corrente = evidenziato con CTA; futuri = tenui.
   ============================================================ */
function TodayTimeline() {
  const doneCount = TODAY.blocks.filter((b) => b.done >= b.target).length;
  const currentIdx = TODAY.blocks.findIndex((b) => b.done < b.target);
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Testata */}
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
            {TODAY.date}
          </p>
          <h2 className="mt-1 font-display text-4xl font-semibold tracking-tight">
            Today&apos;s training
          </h2>
          <p className="mt-2 text-text-muted">
            A short, focused session built from your data. Sit down and train.
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-3xl font-semibold tabular-nums">
            ~{TODAY.totalMin}′
          </p>
          <p className="text-xs uppercase tracking-wide text-text-muted">
            {doneCount}/{TODAY.blocks.length} done
          </p>
        </div>
      </div>

      <div className="chess-rule h-1 w-full opacity-70" />

      {/* Stepper */}
      <ol className="relative space-y-0">
        {TODAY.blocks.map((b, i) => {
          const done = b.done >= b.target;
          const current = i === currentIdx;
          const Icon = b.icon;
          const last = i === TODAY.blocks.length - 1;
          return (
            <li key={b.kind} className="relative flex gap-5 pb-6">
              {!last && (
                <span
                  aria-hidden
                  className="absolute left-5 top-10 h-[calc(100%-1.25rem)] w-px bg-border"
                />
              )}
              <span
                className={cn(
                  "relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border-2",
                  done
                    ? "border-text bg-text text-bg"
                    : current
                      ? "border-text bg-bg text-text"
                      : "border-border bg-bg text-text-muted",
                )}
              >
                {done ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Icon className="h-[1.1rem] w-[1.1rem]" />
                )}
              </span>
              <div
                className={cn(
                  "min-w-0 flex-1 rounded-xl border bg-surface p-4 transition-colors",
                  current ? "border-text" : "border-border",
                  !done && !current && "opacity-70",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-medium">{b.title}</p>
                  <span className="shrink-0 font-mono text-[11px] text-text-muted">
                    {b.done}/{b.target} · ~{b.estMin}′
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-text-muted">{b.detail}</p>
                {current && (
                  <button
                    type="button"
                    className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg bg-text px-4 text-sm font-medium text-bg"
                  >
                    Continue
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* Barra padronanza tema: filo mono con riempimento, percentuale. */
function MasteryBar({ label, mastery }: { label: string; mastery: number }) {
  const pct = Math.round(mastery * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm">{label}</span>
        <span className="font-mono text-[11px] tabular-nums text-text-muted">
          {pct}%
        </span>
      </div>
      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-text transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ============================================================
   TACTICS — VARIANTE A · ARENA
   Sinistra: card rating tattico (hero) + serie/record/risolti. Destra: le 4
   modalità come feature card 2×2. In fondo: padronanza per tema a barre.
   ============================================================ */
function TacticsArena() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Masthead */}
      <div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
          Tactical vision · sharpen your eye
        </p>
        <h2 className="mt-2 font-display text-5xl font-semibold leading-[1.02] tracking-tight">
          Tactics
        </h2>
      </div>

      <div className="chess-rule h-1.5 w-full opacity-80" />

      <div className="grid grid-cols-[20rem_1fr] gap-8">
        {/* Card rating tattico */}
        <div className="space-y-4">
          <div className="chess-corners relative overflow-hidden rounded-2xl border border-border bg-surface p-7">
            <GlyphWatermark glyph="♝" />
            <div className="relative flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.2em] text-text-muted">
                Tactical rating
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-xs text-text">
                <ArrowUpRight className="h-3.5 w-3.5" />
                {TACTICS.delta}
              </span>
            </div>
            <div className="relative mt-5 font-mono text-7xl font-semibold leading-none tabular-nums tracking-tighter">
              {TACTICS.rating}
            </div>
            <div className="relative mt-6 grid grid-cols-3 gap-2">
              {[
                { label: "Streak", value: TACTICS.streak },
                { label: "Best", value: TACTICS.best },
                { label: "Solved", value: TACTICS.solved },
              ].map((s) => (
                <div key={s.label}>
                  <p className="font-mono text-xl font-semibold tabular-nums">
                    {s.value}
                  </p>
                  <p className="text-[10px] uppercase tracking-wide text-text-muted">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modalità 2×2 */}
        <div className="grid grid-cols-2 gap-4">
          {TACTICS.modes.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.key}
                type="button"
                className="group flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 text-left transition-colors hover:border-text"
              >
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-surface-2">
                    <Icon className="h-5 w-5" />
                  </span>
                  {m.key === "review" && TACTICS.reviewDue > 0 && (
                    <span className="rounded-full bg-text px-2 py-0.5 text-[10px] font-medium text-bg">
                      {TACTICS.reviewDue} due
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-display text-lg font-semibold tracking-tight">
                    {m.title}
                  </p>
                  <p className="mt-1 text-sm text-text-muted">{m.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Padronanza per tema */}
      <div>
        <p className="mb-4 text-xs font-medium uppercase tracking-wider text-text-muted">
          Mastery by theme
        </p>
        <div className="grid grid-cols-4 gap-x-8 gap-y-5">
          {TACTICS.themes.map((t) => (
            <MasteryBar key={t.label} label={t.label} mastery={t.mastery} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   TACTICS — VARIANTE B · THEMES
   Banda rating in alto (numero inline + chip), modalità in riga compatta,
   poi i temi in primo piano come griglia di card con padronanza.
   ============================================================ */
function TacticsThemes() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Banda rating */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
            Tactical vision
          </p>
          <h2 className="mt-1 font-display text-4xl font-semibold tracking-tight">
            Tactics
          </h2>
        </div>
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-5xl font-semibold tabular-nums tracking-tight">
            {TACTICS.rating}
          </span>
          <span className="flex gap-2">
            {[
              { label: "streak", value: TACTICS.streak },
              { label: "best", value: TACTICS.best },
              { label: "solved", value: TACTICS.solved },
            ].map((s) => (
              <span
                key={s.label}
                className="rounded-full border border-border px-3 py-1 font-mono text-xs tabular-nums"
              >
                <span className="text-text-muted">{s.label} </span>
                {s.value}
              </span>
            ))}
          </span>
        </div>
      </div>

      {/* Modalità in riga */}
      <div className="grid grid-cols-4 gap-3">
        {TACTICS.modes.map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.key}
              type="button"
              className="group flex items-center gap-3 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-text"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-2">
                <Icon className="h-[1.05rem] w-[1.05rem]" />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-sm font-medium">
                  {m.title}
                  {m.key === "review" && TACTICS.reviewDue > 0 && (
                    <span className="rounded-full bg-text px-1.5 py-0.5 text-[9px] font-medium text-bg">
                      {TACTICS.reviewDue}
                    </span>
                  )}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="chess-rule h-1 w-full opacity-70" />

      {/* Temi in griglia */}
      <div>
        <div className="mb-4 flex items-baseline justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Train a theme
          </p>
          <p className="font-mono text-[11px] text-text-muted">
            sorted by what needs work
          </p>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[...TACTICS.themes]
            .sort((a, b) => a.mastery - b.mastery)
            .map((t) => (
              <button
                key={t.label}
                type="button"
                className="group rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-text"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{t.label}</span>
                  <span className="font-mono text-[11px] tabular-nums text-text-muted">
                    {Math.round(t.mastery * 100)}%
                  </span>
                </div>
                <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-text"
                    style={{ width: `${Math.round(t.mastery * 100)}%` }}
                  />
                </div>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   THEORY — VARIANTE A · LIBRARY
   Tre "scaffali" affiancati (Aperture / Mediogioco / Finali). Ogni colonna:
   glifo del ramo, titolo, lezioni come righe, link "sfoglia" in fondo.
   ============================================================ */
function TheoryLibrary() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
          The library · understand the why
        </p>
        <h2 className="mt-2 font-display text-5xl font-semibold leading-[1.02] tracking-tight">
          Theory
        </h2>
      </div>

      <div className="chess-rule h-1.5 w-full opacity-80" />

      <div className="grid grid-cols-3 gap-6">
        {THEORY.branches.map((b) => (
          <div
            key={b.type}
            className="flex flex-col rounded-2xl border border-border bg-surface"
          >
            {/* Testata scaffale */}
            <div className="relative overflow-hidden border-b border-border p-5">
              <span
                aria-hidden
                className="pointer-events-none absolute -right-2 -top-4 select-none font-display text-[6rem] leading-none text-text opacity-[0.07]"
              >
                {b.glyph}
              </span>
              <h3 className="relative font-display text-2xl font-semibold tracking-tight">
                {b.title}
              </h3>
              <p className="relative mt-1 font-mono text-[11px] uppercase tracking-wide text-text-muted">
                {b.lessons.length} lessons
              </p>
            </div>

            {/* Lezioni */}
            <div className="flex-1 divide-y divide-border">
              {b.lessons.map((l) => (
                <button
                  key={l.title}
                  type="button"
                  className="group flex w-full items-start gap-2 p-4 text-left transition-colors hover:bg-surface-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {l.title}
                      </span>
                      {l.eco && (
                        <span className="shrink-0 font-mono text-[11px] text-text-muted">
                          {l.eco}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs text-text-muted">
                      {l.summary}
                    </span>
                  </span>
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
                </button>
              ))}
            </div>

            {/* Sfoglia */}
            <button
              type="button"
              className="flex items-center justify-center gap-1.5 border-t border-border p-3 text-sm font-medium text-text-muted transition-colors hover:text-text"
            >
              {b.browse}
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   THEORY — VARIANTE B · INDEX
   Indice editoriale: ogni ramo è una sezione con testata + regola damier,
   lezioni come righe numerate (no card), ECO in mono a destra.
   ============================================================ */
function TheoryIndex() {
  return (
    <div className="mx-auto max-w-4xl space-y-12">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
          Table of contents
        </p>
        <h2 className="mt-2 font-display text-5xl font-semibold leading-[1.02] tracking-tight">
          Theory
        </h2>
        <p className="mt-3 max-w-2xl text-text-muted">
          The reasoning behind the moves — openings, middlegame plans, and the
          endgames every club player must know.
        </p>
      </div>

      {THEORY.branches.map((b) => (
        <section key={b.type} className="space-y-4">
          <div className="flex items-baseline gap-4">
            <h3 className="font-display text-2xl font-semibold tracking-tight">
              {b.title}
            </h3>
            <div className="chess-rule h-1 flex-1 opacity-60" />
            <button
              type="button"
              className="shrink-0 text-sm text-text-muted transition-colors hover:text-text"
            >
              {b.browse} →
            </button>
          </div>

          <ol className="divide-y divide-border border-y border-border">
            {b.lessons.map((l, i) => (
              <li key={l.title}>
                <button
                  type="button"
                  className="group flex w-full items-baseline gap-4 py-4 text-left"
                >
                  <span className="w-6 shrink-0 font-mono text-sm text-text-muted">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-medium transition-colors group-hover:text-text">
                      {l.title}
                    </span>
                    <span className="mt-0.5 block text-sm text-text-muted">
                      {l.summary}
                    </span>
                  </span>
                  {l.eco && (
                    <span className="shrink-0 font-mono text-xs text-text-muted">
                      {l.eco}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" />
                </button>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

/* Pallino colore pezzo giocato (bianco/nero) come da scacchiera. */
function ColorDot({ color }: { color: string }) {
  return (
    <span
      className={cn(
        "inline-block h-2.5 w-2.5 rounded-full border",
        color === "w" ? "border-border bg-bg" : "border-text bg-text",
      )}
      title={color === "w" ? "White" : "Black"}
    />
  );
}

/* Esito come glifo editoriale: ½ per patta, segno per vittoria/sconfitta. */
function ResultMark({ result }: { result: string }) {
  const map: Record<string, { mark: string; label: string }> = {
    win: { mark: "1", label: "win" },
    loss: { mark: "0", label: "loss" },
    draw: { mark: "½", label: "draw" },
  };
  const r = map[result];
  return (
    <span
      className={cn(
        "inline-grid h-6 w-6 place-items-center rounded-md border font-mono text-xs",
        result === "win" && "border-text bg-text text-bg",
        result === "loss" && "border-border text-text-muted",
        result === "draw" && "border-border text-text",
      )}
      title={r.label}
    >
      {r.mark}
    </span>
  );
}

/* Barra di import compatta (Lichess / Chess.com / PGN). Non interattiva. */
function ImportToolbar() {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-2">
      <span className="px-2 text-xs uppercase tracking-wide text-text-muted">
        Import
      </span>
      <div className="flex h-9 flex-1 items-center gap-2 rounded-lg bg-surface-2 px-3 font-mono text-sm text-text-muted">
        <Search className="h-4 w-4" />
        Lichess or Chess.com username…
      </div>
      <button
        type="button"
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-surface-2"
      >
        <Upload className="h-4 w-4" />
        Paste PGN
      </button>
      <button
        type="button"
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-text px-4 text-sm font-medium text-bg"
      >
        <Plus className="h-4 w-4" />
        Import
      </button>
    </div>
  );
}

/* ============================================================
   GAMES — VARIANTE A · LEDGER
   Testata + barra import, banda riepilogo (record / accuratezza / analizzate),
   poi le partite come tabella dati densa, mono, colonne allineate.
   ============================================================ */
function GamesLedger() {
  const { summary } = GAMES;
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
            Your games · learn from every result
          </p>
          <h2 className="mt-2 font-display text-4xl font-semibold tracking-tight">
            Games
          </h2>
        </div>
      </div>

      <ImportToolbar />

      {/* Banda riepilogo */}
      <div className="grid grid-cols-4 divide-x divide-border rounded-xl border border-border bg-surface">
        <div className="p-5">
          <p className="font-mono text-2xl font-semibold tabular-nums">
            {summary.wins}–{summary.draws}–{summary.losses}
          </p>
          <p className="mt-1 text-xs uppercase tracking-wide text-text-muted">
            W–D–L
          </p>
        </div>
        <div className="p-5">
          <p className="font-mono text-2xl font-semibold tabular-nums">
            {summary.avgAccuracy}%
          </p>
          <p className="mt-1 text-xs uppercase tracking-wide text-text-muted">
            Avg accuracy
          </p>
        </div>
        <div className="p-5">
          <p className="font-mono text-2xl font-semibold tabular-nums">
            {summary.analyzed}/{summary.total}
          </p>
          <p className="mt-1 text-xs uppercase tracking-wide text-text-muted">
            Analyzed
          </p>
        </div>
        <div className="p-5">
          <p className="font-mono text-2xl font-semibold tabular-nums">
            {Math.round((summary.wins / summary.total) * 100)}%
          </p>
          <p className="mt-1 text-xs uppercase tracking-wide text-text-muted">
            Win rate
          </p>
        </div>
      </div>

      {/* Tabella partite */}
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-left font-mono text-[11px] uppercase tracking-wide text-text-muted">
              <th className="px-4 py-2.5 font-medium">Date</th>
              <th className="px-4 py-2.5 font-medium">Opponent</th>
              <th className="px-4 py-2.5 font-medium">Opening</th>
              <th className="px-4 py-2.5 text-center font-medium">Result</th>
              <th className="px-4 py-2.5 text-right font-medium">Accuracy</th>
              <th className="px-4 py-2.5 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {GAMES.rows.map((g, i) => (
              <tr
                key={i}
                className="bg-surface transition-colors hover:bg-surface-2"
              >
                <td className="whitespace-nowrap px-4 py-3 font-mono text-text-muted">
                  {g.date}
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2">
                    <ColorDot color={g.color} />
                    <span className="font-medium">{g.opponent}</span>
                    <span className="font-mono text-[11px] text-text-muted">
                      {g.oppRating}
                    </span>
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-text-muted">{g.opening}</span>
                    <span className="font-mono text-[11px] text-text-muted">
                      {g.eco}
                    </span>
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex justify-center">
                    <ResultMark result={g.result} />
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">
                  {g.accuracy}%
                </td>
                <td className="px-4 py-3 text-right">
                  {g.analyzed ? (
                    <span className="font-mono text-[11px] text-text-muted">
                      analyzed
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-text px-2 py-0.5 text-[10px] font-medium text-bg">
                      analyze
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================================
   GAMES — VARIANTE B · CARDS
   Sinistra: rail import + riepilogo record. Destra: partite come card con
   esito, avversario, apertura e barra di accuratezza.
   ============================================================ */
function GamesCards() {
  const { summary } = GAMES;
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
          Your games
        </p>
        <h2 className="mt-1 font-display text-4xl font-semibold tracking-tight">
          Games
        </h2>
      </div>

      <div className="grid grid-cols-[19rem_1fr] gap-6">
        {/* Rail import + riepilogo */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-xs uppercase tracking-wider text-text-muted">
              Import a game
            </p>
            <div className="mt-3 flex h-10 items-center gap-2 rounded-lg bg-surface-2 px-3 font-mono text-sm text-text-muted">
              <Search className="h-4 w-4" />
              username…
            </div>
            <button
              type="button"
              className="mt-2 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-text text-sm font-medium text-bg"
            >
              <Plus className="h-4 w-4" />
              Import from account
            </button>
            <button
              type="button"
              className="mt-2 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-border text-sm font-medium transition-colors hover:bg-surface-2"
            >
              <Upload className="h-4 w-4" />
              Paste PGN
            </button>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-xs uppercase tracking-wider text-text-muted">
              This season
            </p>
            <p className="mt-2 font-mono text-3xl font-semibold tabular-nums">
              {summary.wins}–{summary.draws}–{summary.losses}
            </p>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Avg accuracy</span>
                <span className="font-mono tabular-nums">
                  {summary.avgAccuracy}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Analyzed</span>
                <span className="font-mono tabular-nums">
                  {summary.analyzed}/{summary.total}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card partite */}
        <div className="space-y-3">
          {GAMES.rows.map((g, i) => (
            <button
              key={i}
              type="button"
              className="group flex w-full items-center gap-4 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-text"
            >
              <ResultMark result={g.result} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <ColorDot color={g.color} />
                  <span className="font-medium">{g.opponent}</span>
                  <span className="font-mono text-[11px] text-text-muted">
                    {g.oppRating}
                  </span>
                  <span className="font-mono text-[11px] text-text-muted">
                    · {g.date}
                  </span>
                </span>
                <span className="mt-0.5 block truncate text-sm text-text-muted">
                  {g.opening} · {g.eco}
                </span>
              </span>
              <span className="flex w-28 shrink-0 flex-col items-end gap-1">
                <span className="font-mono text-sm tabular-nums">
                  {g.accuracy}%
                </span>
                <span className="block h-1 w-full overflow-hidden rounded-full bg-surface-2">
                  <span
                    className="block h-full rounded-full bg-text"
                    style={{ width: `${g.accuracy}%` }}
                  />
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Scacchiera statica decorativa: posizione iniziale, monocromatica. Pezzi
   bianchi = glifi "outline", neri = glifi "filled", entrambi su currentColor;
   il riempimento li distingue su qualsiasi tema. Solo mock, niente regole. */
const START_RANKS = [
  "rnbqkbnr",
  "pppppppp",
  "........",
  "........",
  "........",
  "........",
  "PPPPPPPP",
  "RNBQKBNR",
];
const PIECE_GLYPH: Record<string, string> = {
  r: "♜", n: "♞", b: "♝", q: "♛", k: "♚", p: "♟",
  R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔", P: "♙",
};
function MiniBoard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "grid aspect-square w-full grid-cols-8 overflow-hidden rounded-lg border border-border",
        className,
      )}
    >
      {START_RANKS.flatMap((rank, r) =>
        rank.split("").map((ch, c) => {
          const dark = (r + c) % 2 === 1;
          const glyph = ch !== "." ? PIECE_GLYPH[ch] : null;
          return (
            <div
              key={`${r}-${c}`}
              className={cn(
                "grid place-items-center",
                dark ? "bg-surface-2" : "bg-surface",
              )}
            >
              {glyph && (
                <span className="font-display text-[clamp(0.9rem,2.4vw,1.8rem)] leading-none text-text">
                  {glyph}
                </span>
              )}
            </div>
          );
        }),
      )}
    </div>
  );
}

/* ============================================================
   PLAY — VARIANTE A · LOBBY
   Due pannelli affiancati: gioco locale (hotseat) e gioco online (colore +
   tempo + crea). Sotto l'online, le partite in corso.
   ============================================================ */
function PlayLobby() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
          Sit down and play
        </p>
        <h2 className="mt-2 font-display text-4xl font-semibold tracking-tight">
          Play
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Locale */}
        <div className="flex flex-col rounded-2xl border border-border bg-surface p-6">
          <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-text-muted">
            <Swords className="h-3.5 w-3.5" /> Local
          </span>
          <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight">
            Pass and play
          </h3>
          <p className="mt-1 text-sm text-text-muted">
            One board, two players on the same screen. No clock unless you want
            one.
          </p>
          <button
            type="button"
            className="mt-5 inline-flex h-11 w-fit items-center gap-1.5 rounded-lg bg-text px-6 text-sm font-medium text-bg"
          >
            <Play className="h-4 w-4" />
            Start hotseat
          </button>
        </div>

        {/* Online */}
        <div className="rounded-2xl border border-border bg-surface p-6">
          <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-text-muted">
            <Globe className="h-3.5 w-3.5" /> Online
          </span>
          <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight">
            Challenge a friend
          </h3>

          <div className="mt-5 space-y-4">
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-text-muted">
                Your color
              </p>
              <div className="flex gap-2">
                {["White", "Black", "Random"].map((c, i) => (
                  <button
                    key={c}
                    type="button"
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-sm transition-colors",
                      i === 0
                        ? "border-text bg-text text-bg"
                        : "border-border text-text-muted hover:text-text",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-text-muted">
                Time control
              </p>
              <div className="flex flex-wrap gap-2">
                {PLAY.times.map((tc, i) => (
                  <button
                    key={tc}
                    type="button"
                    className={cn(
                      "rounded-md border px-3 py-1.5 font-mono text-sm transition-colors",
                      i === 2
                        ? "border-text bg-surface-2 text-text"
                        : "border-border text-text-muted hover:text-text",
                    )}
                  >
                    {tc}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-text px-6 text-sm font-medium text-bg"
            >
              Create game
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Partite in corso */}
      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-text-muted">
          Your games
        </p>
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="divide-y divide-border">
            {PLAY.myGames.map((g, i) => (
              <PlayGameRow key={i} game={g} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayGameRow({ game }: { game: (typeof PLAY.myGames)[number] }) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 bg-surface px-4 py-3 text-left transition-colors hover:bg-surface-2"
    >
      <ColorDot color={game.color} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm">vs {game.opp}</span>
        <span className="block font-mono text-[11px] text-text-muted">
          {game.color === "w" ? "White" : "Black"} · {game.tc}
        </span>
      </span>
      <PlayStatus status={game.status} result={game.result} />
      <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" />
    </button>
  );
}

function PlayStatus({ status, result }: { status: string; result?: string }) {
  if (status === "ongoing")
    return (
      <span className="rounded-full bg-text px-2 py-0.5 text-[10px] font-medium text-bg">
        in progress
      </span>
    );
  if (status === "waiting")
    return (
      <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-text-muted">
        waiting
      </span>
    );
  return (
    <span className="font-mono text-xs text-text-muted">{result ?? "over"}</span>
  );
}

/* ============================================================
   PLAY — VARIANTE B · TABLE
   Scacchiera a sinistra (anteprima posizione iniziale), configuratore a
   destra (locale/online, colore, tempo, crea) + partite in corso.
   ============================================================ */
function PlayTable() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
          Sit down and play
        </p>
        <h2 className="mt-1 font-display text-4xl font-semibold tracking-tight">
          Play
        </h2>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_22rem] gap-8">
        {/* Scacchiera */}
        <div className="mx-auto w-full max-w-lg">
          <MiniBoard />
          <p className="mt-3 text-center font-mono text-[11px] uppercase tracking-wide text-text-muted">
            Starting position · white to move
          </p>
        </div>

        {/* Configuratore */}
        <div className="space-y-4">
          {/* Tab modalità */}
          <div className="flex rounded-lg border border-border p-1">
            <button
              type="button"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-surface-2 px-3 py-2 text-sm font-medium"
            >
              <Globe className="h-4 w-4" /> Online
            </button>
            <button
              type="button"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm text-text-muted"
            >
              <Swords className="h-4 w-4" /> Local
            </button>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-text-muted">
                Your color
              </p>
              <div className="flex gap-2">
                {["White", "Black", "Random"].map((c, i) => (
                  <button
                    key={c}
                    type="button"
                    className={cn(
                      "flex-1 rounded-md border px-2 py-1.5 text-sm transition-colors",
                      i === 0
                        ? "border-text bg-text text-bg"
                        : "border-border text-text-muted hover:text-text",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wide text-text-muted">
                <Clock className="h-3.5 w-3.5" /> Time control
              </p>
              <div className="grid grid-cols-3 gap-2">
                {PLAY.times.map((tc, i) => (
                  <button
                    key={tc}
                    type="button"
                    className={cn(
                      "rounded-md border px-2 py-2 font-mono text-sm transition-colors",
                      i === 2
                        ? "border-text bg-surface-2 text-text"
                        : "border-border text-text-muted hover:text-text",
                    )}
                  >
                    {tc}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="mt-5 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-text text-sm font-medium text-bg"
            >
              Create game
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Partite in corso */}
          <div className="rounded-2xl border border-border bg-surface p-2">
            <p className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-text-muted">
              Your games
            </p>
            <div className="divide-y divide-border">
              {PLAY.myGames.map((g, i) => (
                <PlayGameRow key={i} game={g} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Riga fase con barra qualità. Fase peggiore marcata (contesto analisi:
   è l'unico punto in cui i colori --eval-* sono ammessi). */
function PhaseRow({ p }: { p: (typeof COACH.byPhase)[number] }) {
  const pct = Math.round(p.score * 100);
  return (
    <div className="py-3">
      <div className="flex items-baseline justify-between">
        <span className="flex items-center gap-2 text-sm font-medium">
          {p.phase}
          {p.worst && (
            <span className="font-mono text-[10px] uppercase tracking-wide text-eval-mistake">
              weakest
            </span>
          )}
        </span>
        <span className="font-mono text-sm tabular-nums">{pct}%</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className={cn(
            "h-full rounded-full",
            p.worst ? "bg-eval-mistake" : "bg-text",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 flex gap-4 font-mono text-[11px] text-text-muted">
        <span>{p.moves} moves</span>
        <span>{p.inacc} inacc</span>
        <span>{p.mistakes} mist</span>
        <span>{p.blunders} blun</span>
      </div>
    </div>
  );
}

/* ============================================================
   COACH — VARIANTE A · BRIEFING
   Sinistra: errori per fase a barre di qualità. Destra: "nota del coach",
   la sintesi AI in italiano come blocco editoriale firmato.
   ============================================================ */
function CoachBriefing() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
          Your coach · {COACH.games} games · {COACH.moves} of your moves
        </p>
        <h2 className="mt-2 font-display text-4xl font-semibold tracking-tight">
          Coach
        </h2>
      </div>

      <div className="grid grid-cols-[20rem_1fr] gap-8">
        {/* Errori per fase */}
        <div className="rounded-2xl border border-border bg-surface p-6">
          <p className="text-xs uppercase tracking-wider text-text-muted">
            Quality by phase
          </p>
          <div className="mt-3 divide-y divide-border">
            {COACH.byPhase.map((p) => (
              <PhaseRow key={p.phase} p={p} />
            ))}
          </div>
        </div>

        {/* Nota del coach */}
        <div className="chess-corners relative overflow-hidden rounded-2xl border border-border bg-surface p-8">
          <GlyphWatermark glyph="♞" />
          <div className="relative">
            <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-text-muted">
              <Sparkles className="h-3.5 w-3.5" /> The coach&apos;s note
            </span>
            <p className="mt-5 font-display text-2xl font-medium leading-[1.45] tracking-tight">
              {COACH.synthesis}
            </p>
            <div className="mt-6 flex items-center gap-3 border-t border-border pt-5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-text font-display text-bg">
                ♞
              </span>
              <div>
                <p className="text-sm font-medium">Shakh Coach</p>
                <p className="font-mono text-[11px] text-text-muted">
                  reads your data · speaks Italian
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Domande suggerite */}
      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-text-muted">
          Ask the coach
        </p>
        <div className="flex flex-wrap gap-2">
          {COACH.suggestions.map((q) => (
            <button
              key={q}
              type="button"
              className="rounded-full border border-border bg-surface px-4 py-2 text-sm text-text-muted transition-colors hover:border-text hover:text-text"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   COACH — VARIANTE B · CONVERSATION
   Sinistra: rail metriche per fase compatto. Destra: il coach come chat —
   bolla di sintesi, chip di domande suggerite, barra di input.
   ============================================================ */
function CoachConversation() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
          Your coach
        </p>
        <h2 className="mt-1 font-display text-4xl font-semibold tracking-tight">
          Coach
        </h2>
      </div>

      <div className="grid grid-cols-[18rem_1fr] gap-6">
        {/* Rail metriche */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-xs uppercase tracking-wider text-text-muted">
              Quality by phase
            </p>
            <div className="mt-2 divide-y divide-border">
              {COACH.byPhase.map((p) => (
                <PhaseRow key={p.phase} p={p} />
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5 text-sm">
            <p className="text-text-muted">Based on</p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
              {COACH.games} games
            </p>
            <p className="font-mono text-[11px] text-text-muted">
              {COACH.moves} of your moves analyzed
            </p>
          </div>
        </div>

        {/* Chat */}
        <div className="flex min-h-[34rem] flex-col rounded-2xl border border-border bg-surface">
          <div className="flex items-center gap-2 border-b border-border px-5 py-3">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-text font-display text-bg">
              ♞
            </span>
            <div>
              <p className="text-sm font-medium">Shakh Coach</p>
              <p className="font-mono text-[10px] text-text-muted">
                reads your data · speaks Italian
              </p>
            </div>
          </div>

          {/* Messaggi */}
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            <div className="flex gap-3">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-2 font-display">
                ♞
              </span>
              <div className="max-w-2xl rounded-2xl rounded-tl-sm border border-border bg-bg px-4 py-3">
                <p className="text-[0.95rem] leading-relaxed">
                  {COACH.synthesis}
                </p>
              </div>
            </div>

            {/* Domande suggerite */}
            <div className="ml-11 flex flex-wrap gap-2">
              {COACH.suggestions.map((q) => (
                <button
                  key={q}
                  type="button"
                  className="rounded-full border border-border bg-bg px-3 py-1.5 text-xs text-text-muted transition-colors hover:border-text hover:text-text"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-border p-3">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-bg px-3 py-2">
              <MessageSquare className="h-4 w-4 shrink-0 text-text-muted" />
              <span className="flex-1 text-sm text-text-muted">
                Ask about your games, a position, a plan…
              </span>
              <button
                type="button"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-text text-bg"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Card di un repertorio: pallino colore, nome, mosse, padronanza, azioni. */
function RepCard({ r }: { r: (typeof REPERTOIRE)[number] }) {
  const pct = Math.round(r.mastery * 100);
  return (
    <div className="group rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-text">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <ColorDot color={r.color === "white" ? "w" : "b"} />
          <div>
            <p className="font-medium">{r.name}</p>
            <p className="font-mono text-[11px] text-text-muted">
              {r.color} · {r.moves} moves
            </p>
          </div>
        </div>
        {r.due > 0 && (
          <span className="shrink-0 rounded-full bg-text px-2 py-0.5 text-[10px] font-medium text-bg">
            {r.due} due
          </span>
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between">
          <span className="text-xs uppercase tracking-wide text-text-muted">
            Mastery
          </span>
          <span className="font-mono text-[11px] tabular-nums text-text-muted">
            {pct}%
          </span>
        </div>
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-text"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-surface-2 text-sm font-medium transition-colors hover:bg-surface"
        >
          <Pencil className="h-3.5 w-3.5" /> Editor
        </button>
        <button
          type="button"
          className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md bg-text text-sm font-medium text-bg"
        >
          <Dumbbell className="h-3.5 w-3.5" /> Train
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   REPERTOIRE — VARIANTE A · COLLECTION
   Due colonne per colore (con il Bianco / con il Nero). Ogni colonna: card
   repertorio con padronanza e azioni, più una tessera "nuovo repertorio".
   ============================================================ */
function RepertoireCollection() {
  const white = REPERTOIRE.filter((r) => r.color === "white");
  const black = REPERTOIRE.filter((r) => r.color === "black");
  const columns: { key: string; label: string; items: typeof REPERTOIRE }[] = [
    { key: "w", label: "With White", items: white },
    { key: "b", label: "With Black", items: black },
  ];
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
          Your openings · what you play and why
        </p>
        <h2 className="mt-2 font-display text-4xl font-semibold tracking-tight">
          Repertoire
        </h2>
      </div>

      {/* Barra crea-repertorio */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface p-4">
        <div className="flex-1 min-w-[14rem] space-y-1.5">
          <label className="text-xs uppercase tracking-wide text-text-muted">
            New repertoire
          </label>
          <div className="flex h-10 items-center rounded-lg bg-surface-2 px-3 font-mono text-sm text-text-muted">
            Name…
          </div>
        </div>
        <div className="space-y-1.5">
          <span className="block text-xs uppercase tracking-wide text-text-muted">
            Color
          </span>
          <div className="flex rounded-lg border border-border p-0.5">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-md bg-text px-3 py-1.5 text-sm font-medium text-bg"
            >
              <ColorDot color="w" /> White
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-text-muted"
            >
              <ColorDot color="b" /> Black
            </button>
          </div>
        </div>
        <button
          type="button"
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-text px-5 text-sm font-medium text-bg"
        >
          <Plus className="h-4 w-4" /> Create
        </button>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {columns.map((col) => (
          <div key={col.key} className="space-y-3">
            <div className="flex items-center gap-3">
              <ColorDot color={col.key} />
              <h3 className="font-display text-xl font-semibold tracking-tight">
                {col.label}
              </h3>
              <span className="font-mono text-[11px] text-text-muted">
                {col.items.length}
              </span>
            </div>
            {col.items.map((r) => (
              <RepCard key={r.name} r={r} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   REPERTOIRE — VARIANTE B · WORKBENCH
   Sinistra: form crea-nuovo + riepilogo (mosse totali, da ripassare). Destra:
   repertori come griglia di card con padronanza e azioni.
   ============================================================ */
function RepertoireWorkbench() {
  const totalMoves = REPERTOIRE.reduce((s, r) => s + r.moves, 0);
  const totalDue = REPERTOIRE.reduce((s, r) => s + r.due, 0);
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
          Your openings
        </p>
        <h2 className="mt-1 font-display text-4xl font-semibold tracking-tight">
          Repertoire
        </h2>
      </div>

      <div className="grid grid-cols-[19rem_1fr] gap-6">
        {/* Rail crea + riepilogo */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-xs uppercase tracking-wider text-text-muted">
              New repertoire
            </p>
            <div className="mt-3 flex h-10 items-center rounded-lg bg-surface-2 px-3 font-mono text-sm text-text-muted">
              Name…
            </div>
            <div className="mt-2 flex rounded-lg border border-border p-0.5">
              <button
                type="button"
                className="flex-1 rounded-md bg-text px-3 py-1.5 text-sm font-medium text-bg"
              >
                White
              </button>
              <button
                type="button"
                className="flex-1 rounded-md px-3 py-1.5 text-sm text-text-muted"
              >
                Black
              </button>
            </div>
            <button
              type="button"
              className="mt-2 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-text text-sm font-medium text-bg"
            >
              <Plus className="h-4 w-4" /> Create
            </button>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-xs uppercase tracking-wider text-text-muted">
              Overview
            </p>
            <div className="mt-3 space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-text-muted">Repertoires</span>
                <span className="font-mono text-lg tabular-nums">
                  {REPERTOIRE.length}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-text-muted">Total moves</span>
                <span className="font-mono text-lg tabular-nums">
                  {totalMoves}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-text-muted">Due to review</span>
                <span className="font-mono text-lg tabular-nums">{totalDue}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Griglia card */}
        <div className="grid grid-cols-2 gap-4">
          {REPERTOIRE.map((r) => (
            <RepCard key={r.name} r={r} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* Icona per stato del nodo del percorso. */
const NODE_ICON: Record<string, typeof Circle> = {
  locked: Lock,
  available: Circle,
  in_progress: CircleDot,
  completed: CheckCircle2,
};
const NODE_LABEL: Record<string, string> = {
  locked: "locked",
  available: "available",
  in_progress: "in progress",
  completed: "done",
};

type PathNode = { title: string; status: string; progress: number; acts: string[] };

/* Card nodo: icona stato, titolo, eventuale barra, attività come chip. */
function NodeCardDesktop({ node }: { node: PathNode }) {
  const Icon = NODE_ICON[node.status];
  const locked = node.status === "locked";
  const completed = node.status === "completed";
  return (
    <div
      className={cn(
        "rounded-xl border bg-surface p-4",
        completed ? "border-text/40" : "border-border",
        locked && "opacity-55",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Icon
            className={cn(
              "mt-0.5 h-5 w-5 shrink-0",
              completed ? "text-text" : "text-text-muted",
            )}
          />
          <h4 className="font-display font-medium leading-tight">
            {node.title}
          </h4>
        </div>
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-text-muted">
          {NODE_LABEL[node.status]}
        </span>
      </div>

      {node.status === "in_progress" && (
        <div className="mt-3 flex items-center gap-2">
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
            <span
              className="block h-full rounded-full bg-text"
              style={{ width: `${Math.round(node.progress * 100)}%` }}
            />
          </span>
          <span className="font-mono text-xs text-text-muted">
            {Math.round(node.progress * 100)}%
          </span>
        </div>
      )}

      {!locked && node.acts.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {node.acts.map((a) => (
            <span
              key={a}
              className="inline-flex h-7 items-center rounded-md border border-border px-2.5 text-xs font-medium text-text-muted"
            >
              {a}
            </span>
          ))}
        </div>
      )}

      {locked && (
        <p className="mt-3 text-xs text-text-muted">
          Complete the previous level to unlock.
        </p>
      )}
    </div>
  );
}

/* ============================================================
   PATH — VARIANTE A · ROADMAP
   Next-step in evidenza, poi i livelli come bande: testata con titolo,
   progresso e barra, nodi in griglia. Senso di salita continua.
   ============================================================ */
function PathRoadmap() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
          Your journey · beginner to strong club player
        </p>
        <h2 className="mt-2 font-display text-4xl font-semibold tracking-tight">
          Path
        </h2>
      </div>

      <FeatureNextStep />

      <div className="space-y-10">
        {PATH.levels.map((lv) => {
          const done = lv.nodes.filter((n) => n.status === "completed").length;
          const current = lv.level === PATH.currentLevel;
          return (
            <section key={lv.level} className="space-y-4">
              <div className="flex items-center gap-4">
                <span
                  className={cn(
                    "grid h-10 w-10 shrink-0 place-items-center rounded-lg font-mono text-lg font-semibold",
                    current ? "bg-text text-bg" : "bg-surface-2 text-text-muted",
                  )}
                >
                  {lv.level}
                </span>
                <div>
                  <h3 className="font-display text-xl font-semibold tracking-tight">
                    {lv.title}
                  </h3>
                  {current && (
                    <p className="font-mono text-[11px] uppercase tracking-wide text-text-muted">
                      you are here
                    </p>
                  )}
                </div>
                <div className="chess-rule h-1 flex-1 opacity-50" />
                <span className="shrink-0 font-mono text-sm text-text-muted">
                  {done}/{lv.nodes.length}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {lv.nodes.map((n) => (
                  <NodeCardDesktop key={n.title} node={n} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   PATH — VARIANTE B · ATLAS
   Rail sinistro: scala dei livelli (corrente evidenziato, conteggi). Destra:
   next-step compatto + nodi del percorso per livello.
   ============================================================ */
function PathAtlas() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
          Your journey
        </p>
        <h2 className="mt-1 font-display text-4xl font-semibold tracking-tight">
          Path
        </h2>
      </div>

      <div className="grid grid-cols-[16rem_1fr] gap-8">
        {/* Scala livelli */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-xs uppercase tracking-wider text-text-muted">
              Current level
            </p>
            <p className="mt-1 font-mono text-5xl font-semibold tabular-nums">
              {PATH.currentLevel}
            </p>
            <p className="font-mono text-[11px] text-text-muted">
              {PATH.levels[PATH.currentLevel].title}
            </p>
          </div>

          <ol className="relative space-y-0 pl-1">
            {PATH.levels.map((lv, i) => {
              const done = lv.nodes.filter((n) => n.status === "completed").length;
              const complete = done === lv.nodes.length;
              const current = lv.level === PATH.currentLevel;
              const last = i === PATH.levels.length - 1;
              return (
                <li key={lv.level} className="relative flex gap-3 pb-4">
                  {!last && (
                    <span
                      aria-hidden
                      className="absolute left-[15px] top-8 h-[calc(100%-1rem)] w-px bg-border"
                    />
                  )}
                  <span
                    className={cn(
                      "relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border font-mono text-xs font-semibold",
                      complete
                        ? "border-text bg-text text-bg"
                        : current
                          ? "border-text bg-bg text-text"
                          : "border-border bg-bg text-text-muted",
                    )}
                  >
                    {lv.level}
                  </span>
                  <div className={cn("pt-1", !current && !complete && "opacity-70")}>
                    <p className="text-sm font-medium leading-tight">{lv.title}</p>
                    <p className="font-mono text-[11px] text-text-muted">
                      {done}/{lv.nodes.length} done
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Nodi */}
        <div className="space-y-8">
          <FeatureNextStep />
          {PATH.levels
            .filter((lv) => lv.level >= PATH.currentLevel)
            .map((lv) => (
              <section key={lv.level} className="space-y-3">
                <div className="flex items-baseline gap-3">
                  <h3 className="font-display text-lg font-semibold tracking-tight">
                    Level {lv.level} · {lv.title}
                  </h3>
                  <div className="chess-rule h-1 flex-1 opacity-50" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {lv.nodes.map((n) => (
                    <NodeCardDesktop key={n.title} node={n} />
                  ))}
                </div>
              </section>
            ))}
        </div>
      </div>
    </div>
  );
}

/* Radar competenze: n assi, anelli guida, poligono dei valori. Monocromatico. */
function RadarChart({
  areas,
  size = 260,
}: {
  areas: { label: string; value: number }[];
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 38;
  const n = areas.length;
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pt = (i: number, r: number): [number, number] => [
    cx + r * Math.cos(angle(i)),
    cy + r * Math.sin(angle(i)),
  ];
  const poly = areas
    .map((a, i) => pt(i, R * a.value).map((v) => v.toFixed(1)).join(","))
    .join(" ");
  const rings = [0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-auto w-full max-w-[260px] text-text">
      {/* Anelli */}
      {rings.map((r) => (
        <polygon
          key={r}
          points={areas
            .map((_, i) => pt(i, R * r).map((v) => v.toFixed(1)).join(","))
            .join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth={1}
          opacity={0.12}
        />
      ))}
      {/* Spokes */}
      {areas.map((_, i) => {
        const [x, y] = pt(i, R);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="currentColor"
            strokeWidth={1}
            opacity={0.12}
          />
        );
      })}
      {/* Valori */}
      <polygon points={poly} fill="currentColor" opacity={0.1} />
      <polygon
        points={poly}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {areas.map((a, i) => {
        const [x, y] = pt(i, R * a.value);
        return <circle key={i} cx={x} cy={y} r={2.5} fill="currentColor" />;
      })}
      {/* Etichette */}
      {areas.map((a, i) => {
        const [x, y] = pt(i, R + 18);
        return (
          <text
            key={a.label}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-text-muted font-mono"
            style={{ fontSize: 9 }}
          >
            {a.label}
          </text>
        );
      })}
    </svg>
  );
}

/* Grafico di andamento: linea con area, asse base, valore finale evidenziato. */
function TrendChart({
  points,
  suffix = "",
}: {
  points: number[];
  suffix?: string;
}) {
  const w = 480;
  const h = 120;
  const pad = 6;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = (w - pad * 2) / (points.length - 1);
  const xy = points.map((v, i): [number, number] => [
    pad + i * step,
    h - pad - ((v - min) / span) * (h - pad * 2),
  ]);
  const line = xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${pad},${h - pad} ${line} ${w - pad},${h - pad}`;
  const [lx, ly] = xy[xy.length - 1];

  return (
    <div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-28 w-full text-text"
        preserveAspectRatio="none"
      >
        <polygon points={area} fill="currentColor" opacity={0.06} />
        <polyline
          points={line}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <circle cx={lx} cy={ly} r={3} fill="currentColor" />
      </svg>
      <div className="mt-1 flex justify-between font-mono text-[11px] text-text-muted">
        <span>
          {min}
          {suffix}
        </span>
        <span className="text-text">
          {points[points.length - 1]}
          {suffix} now
        </span>
        <span>
          {max}
          {suffix}
        </span>
      </div>
    </div>
  );
}

/* Riga account collegato: fonte, username, rating, stato verifica. */
function AccountRow({ a }: { a: (typeof PROFILE.accounts)[number] }) {
  return (
    <div className="flex items-center justify-between gap-3 bg-surface px-4 py-3">
      <div className="flex items-center gap-3">
        <Globe className="h-4 w-4 text-text-muted" />
        <div>
          <p className="text-sm font-medium">{a.source}</p>
          <p className="font-mono text-[11px] text-text-muted">@{a.username}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm tabular-nums">{a.rating}</span>
        {a.verified ? (
          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-text-muted">
            <Check className="h-3.5 w-3.5" /> verified
          </span>
        ) : (
          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-text-muted">
            verify
          </span>
        )}
      </div>
    </div>
  );
}

/* Intestazione identità: avatar, nome, email, chip livello/elo/lingua. */
function IdentityHeader() {
  return (
    <div className="flex items-center gap-5">
      <span className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-text font-display text-3xl font-semibold text-bg">
        {PROFILE.name.charAt(0)}
      </span>
      <div>
        <h2 className="font-display text-3xl font-semibold tracking-tight">
          {PROFILE.name}
        </h2>
        <p className="mt-1 text-sm text-text-muted">{PROFILE.email}</p>
        <div className="mt-3 flex flex-wrap gap-2 font-mono text-xs">
          {[
            `Level ${PROFILE.level}`,
            `Shakh ${PROFILE.elo}`,
            PROFILE.locale,
            PROFILE.joined,
          ].map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-border px-3 py-1 text-text-muted"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PROFILE — VARIANTE A · PASSPORT
   Testata identità + tutto in vista: competenze (radar + barre), andamenti
   (rating e accuratezza), account collegati. Niente tab: il desktop ha spazio.
   ============================================================ */
function ProfilePassport() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <IdentityHeader />

      <div className="chess-rule h-1.5 w-full opacity-80" />

      {/* Competenze + andamenti */}
      <div className="grid grid-cols-[22rem_1fr] gap-8">
        {/* Radar competenze */}
        <div className="rounded-2xl border border-border bg-surface p-6">
          <p className="text-xs uppercase tracking-wider text-text-muted">
            Competence
          </p>
          <div className="mt-4 grid place-items-center">
            <RadarChart areas={PROFILE.competence} />
          </div>
          <div className="mt-4 divide-y divide-border">
            {PROFILE.competence.map((c) => (
              <div
                key={c.label}
                className="flex items-center justify-between py-2 text-sm"
              >
                <span>{c.label}</span>
                <span className="font-mono text-text-muted">
                  {Math.round(c.value * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Andamenti */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface p-6">
            <p className="text-xs uppercase tracking-wider text-text-muted">
              Rating history
            </p>
            <div className="mt-4">
              <TrendChart points={PROFILE.ratingTrend} />
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-6">
            <p className="text-xs uppercase tracking-wider text-text-muted">
              Accuracy
            </p>
            <div className="mt-4">
              <TrendChart points={PROFILE.accuracyTrend} suffix="%" />
            </div>
          </div>
        </div>
      </div>

      {/* Account collegati */}
      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-text-muted">
          Linked accounts
        </p>
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="divide-y divide-border">
            {PROFILE.accounts.map((a) => (
              <AccountRow key={a.source} a={a} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PROFILE — VARIANTE B · CONSOLE
   Rail sinistro: identità compatta + navigazione sezioni. Destra: contenuto
   della sezione attiva (Stats mostrato: radar + andamenti + account).
   ============================================================ */
function ProfileConsole() {
  const nav = ["Statistics", "Account & links", "Preferences", "Privacy"];
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h2 className="font-display text-3xl font-semibold tracking-tight">
        Profile
      </h2>

      <div className="grid grid-cols-[16rem_1fr] gap-8">
        {/* Rail identità + nav */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface p-5 text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-text font-display text-2xl font-semibold text-bg">
              {PROFILE.name.charAt(0)}
            </span>
            <p className="mt-3 font-medium">{PROFILE.name}</p>
            <p className="font-mono text-[11px] text-text-muted">
              {PROFILE.email}
            </p>
            <div className="mt-3 flex justify-center gap-2 font-mono text-[11px] text-text-muted">
              <span className="rounded-full border border-border px-2 py-0.5">
                Lv {PROFILE.level}
              </span>
              <span className="rounded-full border border-border px-2 py-0.5">
                {PROFILE.elo}
              </span>
            </div>
          </div>

          <nav className="space-y-1">
            {nav.map((n, i) => (
              <button
                key={n}
                type="button"
                className={cn(
                  "flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors",
                  i === 0
                    ? "bg-surface-2 font-medium text-text"
                    : "text-text-muted hover:bg-surface-2 hover:text-text",
                )}
              >
                {n}
              </button>
            ))}
          </nav>
        </div>

        {/* Contenuto sezione */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-border bg-surface p-6">
              <p className="text-xs uppercase tracking-wider text-text-muted">
                Competence
              </p>
              <div className="mt-2 grid place-items-center">
                <RadarChart areas={PROFILE.competence} size={220} />
              </div>
            </div>
            <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-6">
              <p className="text-xs uppercase tracking-wider text-text-muted">
                Rating history
              </p>
              <TrendChart points={PROFILE.ratingTrend} />
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-xs uppercase tracking-wider text-text-muted">
                  Accuracy
                </p>
                <TrendChart points={PROFILE.accuracyTrend} suffix="%" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-2">
            <p className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-text-muted">
              Linked accounts
            </p>
            <div className="divide-y divide-border">
              {PROFILE.accounts.map((a) => (
                <AccountRow key={a.source} a={a} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Stack di avatar membri (iniziali, sovrapposti). */
function AvatarStack({ initials }: { initials: string[] }) {
  const shown = initials.slice(0, 4);
  const extra = initials.length - shown.length;
  return (
    <div className="flex items-center">
      {shown.map((ini, i) => (
        <span
          key={i}
          className="grid h-7 w-7 place-items-center rounded-full border-2 border-surface bg-surface-2 font-mono text-[10px] font-medium"
          style={{ marginLeft: i === 0 ? 0 : -8 }}
        >
          {ini}
        </span>
      ))}
      {extra > 0 && (
        <span
          className="grid h-7 w-7 place-items-center rounded-full border-2 border-surface bg-text font-mono text-[10px] font-medium text-bg"
          style={{ marginLeft: -8 }}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}

/* ============================================================
   GROUPS — VARIANTE A · ROSTER
   Sinistra: i tuoi gruppi come card (tipo, ruolo, stack membri). Destra: rail
   con crea-gruppo e unisciti-con-codice.
   ============================================================ */
function GroupsRoster() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
          Clubs, classes and teams
        </p>
        <h2 className="mt-2 font-display text-4xl font-semibold tracking-tight">
          Groups
        </h2>
      </div>

      <div className="grid grid-cols-[1fr_20rem] gap-8">
        {/* Gruppi */}
        <div className="space-y-3">
          {GROUPS.map((g) => (
            <button
              key={g.name}
              type="button"
              className="group flex w-full items-center gap-4 rounded-2xl border border-border bg-surface p-5 text-left transition-colors hover:border-text"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-surface-2">
                <Users className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="font-medium">{g.name}</span>
                  {g.role === "instructor" && (
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-text-muted">
                      instructor
                    </span>
                  )}
                </span>
                <span className="font-mono text-[11px] text-text-muted">
                  {g.type} · {g.members} members
                </span>
              </span>
              <AvatarStack initials={g.initials} />
              <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" />
            </button>
          ))}
        </div>

        {/* Rail azioni */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-text-muted">
              <Plus className="h-3.5 w-3.5" /> Create a group
            </span>
            <p className="mt-2 text-sm text-text-muted">
              Start a club, class or team and invite players.
            </p>
            <div className="mt-3 flex h-10 items-center rounded-lg bg-surface-2 px-3 font-mono text-sm text-text-muted">
              Group name…
            </div>
            <button
              type="button"
              className="mt-2 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-text text-sm font-medium text-bg"
            >
              Create
            </button>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-text-muted">
              <KeyRound className="h-3.5 w-3.5" /> Join with a code
            </span>
            <p className="mt-2 text-sm text-text-muted">
              Got an invite code from an instructor? Enter it here.
            </p>
            <div className="mt-3 flex h-10 items-center rounded-lg bg-surface-2 px-3 font-mono text-sm tracking-[0.3em] text-text-muted">
              ABC-123
            </div>
            <button
              type="button"
              className="mt-2 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-border text-sm font-medium transition-colors hover:bg-surface-2"
            >
              Join
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   GROUPS — VARIANTE B · DIRECTORY
   Toolbar in alto (crea / unisciti), poi i gruppi come tabella: nome, tipo,
   ruolo, membri, stack avatar.
   ============================================================ */
function GroupsDirectory() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
            Clubs, classes and teams
          </p>
          <h2 className="mt-1 font-display text-4xl font-semibold tracking-tight">
            Groups
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-surface-2"
          >
            <KeyRound className="h-4 w-4" /> Join with code
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-text px-4 text-sm font-medium text-bg"
          >
            <Plus className="h-4 w-4" /> Create group
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-left font-mono text-[11px] uppercase tracking-wide text-text-muted">
              <th className="px-4 py-2.5 font-medium">Group</th>
              <th className="px-4 py-2.5 font-medium">Type</th>
              <th className="px-4 py-2.5 font-medium">Role</th>
              <th className="px-4 py-2.5 text-right font-medium">Members</th>
              <th className="px-4 py-2.5 text-right font-medium">Team</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {GROUPS.map((g) => (
              <tr
                key={g.name}
                className="bg-surface transition-colors hover:bg-surface-2"
              >
                <td className="px-4 py-3">
                  <span className="flex items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-2">
                      <Users className="h-4 w-4" />
                    </span>
                    <span className="font-medium">{g.name}</span>
                  </span>
                </td>
                <td className="px-4 py-3 text-text-muted">{g.type}</td>
                <td className="px-4 py-3">
                  {g.role === "instructor" ? (
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-text-muted">
                      instructor
                    </span>
                  ) : (
                    <span className="font-mono text-[11px] text-text-muted">
                      member
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">
                  {g.members}
                </td>
                <td className="px-4 py-3">
                  <span className="flex justify-end">
                    <AvatarStack initials={g.initials} />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
