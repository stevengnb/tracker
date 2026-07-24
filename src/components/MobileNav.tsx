"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Brain, LogOut, Menu, Settings as SettingsIcon, X } from "lucide-react";
import { LOGOUT_URL } from "@/lib/types";
import { useSettings } from "@/lib/settings";
import { arrangeNav, isActive } from "./nav";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [settings] = useSettings();
  const pathname = usePathname();

  const nav = arrangeNav(settings.sidebarOrder, settings.sidebarHidden);

  useEffect(() => setMounted(true), []);

  // Close the drawer on navigation and lock scroll while open.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="sm:hidden">
      <button
        onClick={() => setOpen(true)}
        title="Menu"
        aria-label="Open menu"
        className="flex size-[30px] items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-accent hover:text-text"
      >
        <Menu className="size-4" />
      </button>

      {/* Rendered via portal to <body>: the header's backdrop-filter would
          otherwise become the containing block for this fixed overlay and
          clip it to the header bar. */}
      {open &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
          <aside className="fade-in absolute inset-y-0 left-0 flex w-64 flex-col border-r border-line bg-surface px-3 py-5">
            <div className="mb-6 flex shrink-0 items-center justify-between px-2">
              <span className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
                <span className="flex size-6 items-center justify-center rounded-md bg-accent-soft text-accent">
                  <Brain className="size-4" />
                </span>
                Tracker
              </span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="text-muted hover:text-text"
              >
                <X className="size-5" />
              </button>
            </div>
            <nav className="-mr-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pr-1">
              {nav.map(({ href, label, icon: Icon }) => {
                const active = isActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-[14px] transition-colors ${
                      active
                        ? "bg-accent-soft font-medium text-accent"
                        : "text-muted hover:bg-line/60 hover:text-text"
                    }`}
                  >
                    <Icon className="size-4.5" />
                    {label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-2 flex shrink-0 flex-col gap-0.5 border-t border-line pt-2">
              <Link
                href="/settings"
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-[14px] transition-colors ${
                  pathname.startsWith("/settings")
                    ? "bg-accent-soft font-medium text-accent"
                    : "text-muted hover:bg-line/60 hover:text-text"
                }`}
              >
                <SettingsIcon className="size-4.5" />
                Settings
              </Link>
              <a
                href={LOGOUT_URL}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-[14px] text-muted transition-colors hover:bg-line/60 hover:text-text"
              >
                <LogOut className="size-4.5" />
                Log out
              </a>
            </div>
          </aside>
          </div>,
          document.body,
        )}
    </div>
  );
}
