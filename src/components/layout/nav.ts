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
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
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
  /** Etichetta della sezione. Assente = ancore principali senza intestazione. */
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
      { label: "Dashboard", href: "/app", icon: LayoutDashboard },
      { label: "Today", href: "/app/oggi", icon: CalendarCheck },
      { label: "Path", href: "/app/percorso", icon: Route },
      { label: "Coach", href: "/app/coach", icon: Bot },
    ],
  },
  {
    label: "Study",
    items: [
      { label: "Learn", href: "/app/impara", icon: GraduationCap },
      { label: "Theory", href: "/app/teoria", icon: BookOpen },
      { label: "Repertoire", href: "/app/repertorio", icon: Library },
      { label: "Preparation", href: "/app/preparazione", icon: Radar },
    ],
  },
  {
    label: "Train",
    items: [
      { label: "Tactics", href: "/app/tattiche", icon: Target },
      { label: "Calculation", href: "/app/calcolo", icon: Brain },
      { label: "Traps", href: "/app/trappole", icon: Zap },
      { label: "Sparring", href: "/app/sparring", icon: Cpu },
    ],
  },
  {
    label: "Play & analyze",
    items: [
      { label: "Play a friend", href: "/app/gioca", icon: Gamepad2 },
      { label: "My games", href: "/app/partite", icon: Swords },
      { label: "Weaknesses", href: "/app/debolezze", icon: Crosshair },
      { label: "Fix mistakes", href: "/app/ripara", icon: Wrench },
    ],
  },
];

/** Voci ancorate in fondo alla sidebar: gestione e account. */
export const navFooter: NavItem[] = [
  { label: "Groups", href: "/app/gruppi", icon: Users },
  { label: "Profile", href: "/app/profilo", icon: User },
];
