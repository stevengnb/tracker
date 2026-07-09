import {
  Activity,
  Bookmark,
  Brain,
  CalendarCheck,
  FlaskConical,
  FolderOpen,
  LayoutDashboard,
  ListTodo,
  Repeat,
  Target,
  type LucideIcon,
} from "lucide-react";

export const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Today", icon: LayoutDashboard },
  { href: "/challenges", label: "Challenges", icon: Brain },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/habits", label: "Habits", icon: Repeat },
  { href: "/experiments", label: "Experiments", icon: FlaskConical },
  { href: "/queue", label: "Queue", icon: Bookmark },
  { href: "/files", label: "Files", icon: FolderOpen },
  { href: "/analytics", label: "Analytics", icon: CalendarCheck },
  { href: "/hermes", label: "Hermes", icon: Activity },
];

export function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/challenges") return pathname.startsWith("/challenge");
  return pathname.startsWith(href);
}
