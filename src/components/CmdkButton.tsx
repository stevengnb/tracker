"use client";

import { Search } from "lucide-react";

// Opens the command palette (also bound to ⌘/Ctrl+K globally).
export function CmdkButton() {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event("cmdk:open"))}
      title="Search (⌘K)"
      aria-label="Open command palette"
      className="flex size-[30px] items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-accent hover:text-text"
    >
      <Search className="size-4" />
    </button>
  );
}
