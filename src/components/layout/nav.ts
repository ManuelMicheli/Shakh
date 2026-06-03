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
      { label: "Oggi", href: "/app/oggi", icon: CalendarCheck },
      { label: "Percorso", href: "/app/percorso", icon: Route },
      { label: "Coach", href: "/app/coach", icon: Bot },
    ],
  },
  {
    label: "Studia",
    items: [
      { label: "Impara", href: "/app/impara", icon: GraduationCap },
      { label: "Teoria", href: "/app/teoria", icon: BookOpen },
      { label: "Repertorio", href: "/app/repertorio", icon: Library },
      { label: "Preparazione", href: "/app/preparazione", icon: Radar },
    ],
  },
  {
    label: "Allenati",
    items: [
      { label: "Tattiche", href: "/app/tattiche", icon: Target },
      { label: "Calcolo", href: "/app/calcolo", icon: Brain },
      { label: "Trappole", href: "/app/trappole", icon: Zap },
      { label: "Sparring", href: "/app/sparring", icon: Cpu },
    ],
  },
  {
    label: "Gioca e analizza",
    items: [
      { label: "Gioca con un amico", href: "/app/gioca", icon: Gamepad2 },
      { label: "Le mie partite", href: "/app/partite", icon: Swords },
      { label: "Punti deboli", href: "/app/debolezze", icon: Crosshair },
      { label: "Ripara errori", href: "/app/ripara", icon: Wrench },
    ],
  },
];

/** Voci ancorate in fondo alla sidebar: gestione e account. */
export const navFooter: NavItem[] = [
  { label: "Gruppi", href: "/app/gruppi", icon: Users },
  { label: "Profilo", href: "/app/profilo", icon: User },
];
