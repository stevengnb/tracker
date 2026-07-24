import {
  Activity,
  BookText,
  Bookmark,
  Brain,
  CalendarCheck,
  CalendarDays,
  FlaskConical,
  FolderOpen,
  LayoutDashboard,
  ListTodo,
  Pin,
  Repeat,
  ScrollText,
  Stamp,
  Target,
  type LucideIcon,
} from "lucide-react";

export const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Today", icon: LayoutDashboard },
  { href: "/challenges", label: "Challenges", icon: Brain },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/habits", label: "Habits", icon: Repeat },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/experiments", label: "Experiments", icon: FlaskConical },
  { href: "/queue", label: "Queue", icon: Bookmark },
  { href: "/pins", label: "Pins", icon: Pin },
  { href: "/files", label: "Files", icon: FolderOpen },
  { href: "/wiki", label: "Wiki", icon: BookText },
  { href: "/guides", label: "Guides", icon: ScrollText },
  { href: "/clock", label: "Clock Stamp", icon: Stamp },
  { href: "/analytics", label: "Analytics", icon: CalendarCheck },
  { href: "/hermes", label: "Hermes", icon: Activity },
];

// Apply a saved order + hidden set to NAV: ordered items first (unknown/new
// items appended in default order), then hidden ones filtered out.
export function arrangeNav(order: string[], hidden: string[]) {
  const byHref = new Map(NAV.map((n) => [n.href, n]));
  const seen = new Set<string>();
  const out: typeof NAV = [];
  for (const href of order) {
    const n = byHref.get(href);
    if (n && !seen.has(href)) {
      out.push(n);
      seen.add(href);
    }
  }
  for (const n of NAV) if (!seen.has(n.href)) out.push(n);
  return out.filter((n) => !hidden.includes(n.href));
}

export function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/challenges") return pathname.startsWith("/challenge");
  return pathname.startsWith(href);
}
