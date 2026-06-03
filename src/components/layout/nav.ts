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

/**
 * Navigazione della shell autenticata. Le voci sono già tutte presenti per
 * mostrare la struttura; quelle dei moduli futuri (prompt 01–10) sono
 * disabilitate con badge "presto".
 */
export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/app", icon: LayoutDashboard },
  { label: "Impara", href: "/app/impara", icon: GraduationCap },
  { label: "Oggi", href: "/app/oggi", icon: CalendarCheck },
  { label: "Le mie partite", href: "/app/partite", icon: Swords },
  { label: "Gioca con un amico", href: "/app/gioca", icon: Gamepad2 },
  { label: "Punti deboli", href: "/app/debolezze", icon: Crosshair },
  { label: "Ripara errori", href: "/app/ripara", icon: Wrench },
  { label: "Tattiche", href: "/app/tattiche", icon: Target },
  { label: "Calcolo", href: "/app/calcolo", icon: Brain },
  { label: "Sparring", href: "/app/sparring", icon: Cpu },
  { label: "Trappole", href: "/app/trappole", icon: Zap },
  { label: "Teoria", href: "/app/teoria", icon: BookOpen },
  { label: "Repertorio", href: "/app/repertorio", icon: Library },
  { label: "Preparazione", href: "/app/preparazione", icon: Radar },
  { label: "Percorso", href: "/app/percorso", icon: Route },
  { label: "Coach", href: "/app/coach", icon: Bot },
  { label: "Gruppi", href: "/app/gruppi", icon: Users },
  { label: "Profilo", href: "/app/profilo", icon: User },
];
