import {
  LayoutDashboard,
  Swords,
  Target,
  BookOpen,
  Library,
  Route,
  Bot,
  User,
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
  { label: "Le mie partite", href: "/app/partite", icon: Swords },
  { label: "Tattiche", href: "/app/tattiche", icon: Target },
  { label: "Teoria", href: "/app/teoria", icon: BookOpen },
  { label: "Repertorio", href: "/app/repertorio", icon: Library },
  { label: "Percorso", href: "/app/percorso", icon: Route, comingSoon: true },
  { label: "Coach", href: "/app/coach", icon: Bot },
  { label: "Profilo", href: "/app/profilo", icon: User, comingSoon: true },
];
