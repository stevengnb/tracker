"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brain, LogOut } from "lucide-react";
import { LOGOUT_URL } from "@/lib/types";
import { isActive, NAV } from "./nav";

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-52 shrink-0 flex-col border-r border-line bg-surface px-3 py-5 sm:flex">
      <Link
        href="/"
        className="mb-6 flex items-center gap-2 px-2 text-[15px] font-semibold tracking-tight"
      >
        <span className="flex size-6 items-center justify-center rounded-md bg-accent-soft text-accent">
          <Brain className="size-4" />
        </span>
        Tracker
      </Link>
      <nav className="flex flex-col gap-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors ${
                active
                  ? "bg-accent-soft font-medium text-accent"
                  : "text-muted hover:bg-line/60 hover:text-text"
              }`}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <a
        href={LOGOUT_URL}
        className="mt-auto flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] text-muted transition-colors hover:bg-line/60 hover:text-text"
      >
        <LogOut className="size-4" />
        Log out
      </a>
    </aside>
  );
}
