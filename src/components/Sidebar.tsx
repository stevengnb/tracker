"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Brain,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings as SettingsIcon,
} from "lucide-react";
import { LOGOUT_URL } from "@/lib/types";
import { useSettings } from "@/lib/settings";
import { arrangeNav, isActive } from "./nav";

export function Sidebar() {
  const pathname = usePathname();
  const [settings] = useSettings();
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem("sidebar-collapsed") === "1");
    setReady(true);
  }, []);

  const toggle = () =>
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("sidebar-collapsed", next ? "1" : "0");
      return next;
    });

  const nav = arrangeNav(settings.sidebarOrder, settings.sidebarHidden);
  const rowClass = (active: boolean) =>
    `flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors ${
      collapsed ? "justify-center" : ""
    } ${
      active
        ? "bg-accent-soft font-medium text-accent"
        : "text-muted hover:bg-line/60 hover:text-text"
    }`;

  return (
    <aside
      className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-surface py-5 sm:flex ${
        collapsed ? "w-[64px] px-2" : "w-52 px-3"
      } ${ready ? "transition-[width] duration-200" : ""}`}
    >
      <div
        className={`mb-6 flex items-center px-1 ${
          collapsed ? "justify-center" : "justify-between"
        }`}
      >
        {!collapsed && (
          <Link
            href="/"
            className="flex items-center gap-2 px-1 text-[15px] font-semibold tracking-tight"
          >
            <span className="flex size-6 items-center justify-center rounded-md bg-accent-soft text-accent">
              <Brain className="size-4" />
            </span>
            Tracker
          </Link>
        )}
        <button
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex size-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-line/60 hover:text-text"
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </button>
      </div>

      <nav className="flex flex-col gap-0.5">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            title={collapsed ? label : undefined}
            className={rowClass(isActive(pathname, href))}
          >
            <Icon className="size-4 shrink-0" />
            {!collapsed && label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-0.5">
        <Link
          href="/settings"
          title={collapsed ? "Settings" : undefined}
          className={rowClass(pathname.startsWith("/settings"))}
        >
          <SettingsIcon className="size-4 shrink-0" />
          {!collapsed && "Settings"}
        </Link>
        <a
          href={LOGOUT_URL}
          title={collapsed ? "Log out" : undefined}
          className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] text-muted transition-colors hover:bg-line/60 hover:text-text ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <LogOut className="size-4 shrink-0" />
          {!collapsed && "Log out"}
        </a>
      </div>
    </aside>
  );
}
