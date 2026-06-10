import {
  LayoutDashboard,
  GraduationCap,
  CalendarCheck,
  Swords,
  Crosshair,
  Wrench,
  Target,
  Brain,
  Cpu,
  Zap,
  BookOpen,
  Library,
  Radar,
  Route,
  Bot,
  Users,
  User,
  Gamepad2,
  Shield,
  Trophy,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  /** Chiave i18n (namespace "nav") tradotta a runtime dai componenti. */
  label: string;
  href: string;
  icon: LucideIcon;
  /** Voce visibile ma non ancora attiva (badge "presto"). */
  comingSoon?: boolean;
}

/** Attiva la voce su match esatto per la dashboard, per prefisso altrove. */
export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(href + "/");
}

export interface NavGroup {
  /** Chiave i18n della sezione. Assente = ancore principali senza intestazione. */
  label?: string;
  items: NavItem[];
}

/**
 * Navigazione della shell autenticata, organizzata per fasi del percorso di
 * apprendimento: ancore fisse (dove sono / cosa faccio ora), poi Studia →
 * Allenati → Gioca e analizza. Profilo e Gruppi vivono nel footer.
 */
export const navGroups: NavGroup[] = [
  {
    // Ancore: orientamento e guida quotidiana. Il percorso è la spina dorsale.
    items: [
      { label: "item.dashboard", href: "/app", icon: LayoutDashboard },
      { label: "item.today", href: "/app/oggi", icon: CalendarCheck },
      { label: "item.path", href: "/app/percorso", icon: Route },
      { label: "item.coach", href: "/app/coach", icon: Bot },
    ],
  },
  {
    label: "group.study",
    items: [
      { label: "item.learn", href: "/app/impara", icon: GraduationCap },
      { label: "item.theory", href: "/app/teoria", icon: BookOpen },
      { label: "item.famousGames", href: "/app/indimenticabili", icon: Sparkles },
      { label: "item.repertoire", href: "/app/repertorio", icon: Library },
      { label: "item.preparation", href: "/app/preparazione", icon: Radar },
    ],
  },
  {
    label: "group.train",
    items: [
      { label: "item.tactics", href: "/app/tattiche", icon: Target },
      { label: "item.calculation", href: "/app/calcolo", icon: Brain },
      { label: "item.traps", href: "/app/trappole", icon: Zap },
      { label: "item.sparring", href: "/app/sparring", icon: Cpu },
    ],
  },
  {
    label: "group.playAnalyze",
    items: [
      { label: "item.playFriend", href: "/app/gioca", icon: Gamepad2 },
      { label: "item.league", href: "/app/lega", icon: Shield },
      { label: "item.championship", href: "/app/campionato", icon: Trophy },
      { label: "item.myGames", href: "/app/partite", icon: Swords },
      { label: "item.weaknesses", href: "/app/debolezze", icon: Crosshair },
      { label: "item.fixMistakes", href: "/app/ripara", icon: Wrench },
    ],
  },
];

/** Voci ancorate in fondo alla sidebar: gestione e account. */
export const navFooter: NavItem[] = [
  { label: "item.groups", href: "/app/gruppi", icon: Users },
  { label: "item.profile", href: "/app/profilo", icon: User },
];
