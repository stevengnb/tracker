import { Flame } from "lucide-react";
import { computeStreaks } from "@/lib/queries";
import { fmtLong, fmtShort, todayStr } from "@/lib/dates";
import { Clock } from "./Clock";
import { CmdkButton } from "./CmdkButton";
import { DistractionSheet } from "./DistractionSheet";
import { MobileNav } from "./MobileNav";
import { ThemeToggle } from "./ThemeToggle";

export function TopBar() {
  const { current } = computeStreaks();
  const today = todayStr();
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-bg/85 px-4 py-3 backdrop-blur sm:px-8">
      <div className="flex items-center gap-3">
        <MobileNav />
        <span className="text-[13px] text-muted">
          <span className="sm:hidden">{fmtShort(today)}</span>
          <span className="hidden sm:inline">{fmtLong(today)}</span>
        </span>
        <Clock />
      </div>
      <div className="flex items-center gap-3">
        <span
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium ${
            current > 0 ? "bg-warn-soft text-warn" : "bg-line/60 text-faint"
          }`}
          title="Challenge streak"
        >
          <Flame className="size-3.5" />
          {current}
        </span>
        <CmdkButton />
        <DistractionSheet />
        <ThemeToggle />
      </div>
    </header>
  );
}
