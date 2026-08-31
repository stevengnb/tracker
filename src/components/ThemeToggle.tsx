"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useMounted } from "@/lib/mounted";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  if (!mounted) {
    return <span className="block size-[30px] rounded-lg border border-line" />;
  }
  const dark = resolvedTheme === "dark";
  return (
    <button
      onClick={() => setTheme(dark ? "light" : "dark")}
      title="Toggle theme"
      className="flex size-[30px] items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-accent hover:text-text"
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
