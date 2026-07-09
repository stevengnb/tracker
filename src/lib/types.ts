export type Challenge = {
  id: number;
  date: string;
  category: string;
  difficulty_tier: number | null;
  puzzle_text: string;
  answer: string;
  full_reasoning: string;
  hint_1: string | null;
  hint_2: string | null;
  status: "pending" | "solved" | "failed" | "expired";
  created_at: string;
};

export type Attempt = {
  id: number;
  challenge_id: number;
  attempt_number: 1 | 2 | 3;
  user_answer: string;
  was_correct: 0 | 1;
  hint_received: string | null;
  // Async grader's review text; column name kept for the writer contract.
  granger_response: string;
  created_at: string;
};

export type Task = {
  id: number;
  title: string;
  priority: "p0" | "normal" | "low";
  status: "pending" | "done" | "cancelled";
  due_date: string | null;
  category: string;
  created_at: string;
  completed_at: string | null;
};

export type Goal = {
  id: number;
  title: string;
  month: string;
  description: string | null;
  status: "active" | "done" | "abandoned";
  target_value: number | null;
  current_value: number;
  unit: string | null;
  created_at: string;
};

export type GoalAttachment = {
  id: number;
  goal_id: number;
  type: "note" | "file" | "link";
  content: string;
  filename: string | null;
  uploaded_at: string;
};

export type Habit = {
  id: number;
  name: string;
  icon: string;
  auto_source: string | null;
  active: 0 | 1;
  created_at: string;
};

export type WatchlistItem = {
  id: number;
  title: string;
  url: string | null;
  kind: "watch" | "read";
  category: string;
  subcategory: string | null;
  status: "to-watch" | "watched" | "to-read" | "read" | "dropped";
  notes: string | null;
  created_at: string;
};

// Categories per queue kind. First value is the add-form default.
export const QUEUE_CATEGORIES: Record<"watch" | "read", string[]> = {
  watch: ["youtube", "anime", "general", "channel"],
  read: ["article", "github", "docs", "thread"],
};

export const QUEUE_CATEGORY_LABELS: Record<string, string> = {
  youtube: "YouTube",
  anime: "Anime",
  general: "General",
  channel: "Channels",
  article: "Articles",
  github: "GitHub",
  docs: "Docs",
  thread: "Threads",
};

export type Experiment = {
  id: number;
  title: string;
  hypothesis: string | null;
  status: "to-try" | "in-progress" | "done" | "abandoned";
  result: string | null;
  created_at: string;
  completed_at: string | null;
};

export type ExperimentAttachment = {
  id: number;
  experiment_id: number;
  type: "note" | "file" | "link";
  content: string;
  filename: string | null;
  uploaded_at: string;
};

export const CATEGORY_COLORS: Record<string, string> = {
  "Logic & Reasoning": "var(--cat-logic)",
  "Memory Training": "var(--cat-memory)",
  "Debugging / CS Reasoning": "var(--cat-debugging)",
  "Mental Math": "var(--cat-math)",
  "Deep Reading": "var(--cat-reading)",
  "Attention Drill": "var(--cat-attention)",
};

export function categoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? "var(--accent)";
}

export const TIER_LABELS: Record<number, string> = {
  1: "Tier 1 — Accessible",
  2: "Tier 2 — Moderate",
  3: "Tier 3 — Hard",
};

// Predefined task categories; the add form also lets you type a new one.
export const TASK_CATEGORIES = ["personal", "work"];

// ── Files (Drive-style folders + uploads) ───────────────────

export type FileFolder = {
  id: number;
  name: string;
  parent_id: number | null;
  created_at: string;
};

export type FileItem = {
  id: number;
  folder_id: number | null;
  title: string;
  note: string | null;
  filename: string; // original upload name
  stored_name: string; // safe name on disk under uploads/
  mime: string;
  kind: "image" | "pdf";
  size: number | null;
  created_at: string;
};

// Where the logout button sends the browser. For Cloudflare Access, set
// NEXT_PUBLIC_LOGOUT_URL to https://<team>.cloudflareaccess.com/cdn-cgi/access/logout.
// Falls back to a local /logout path when unset.
export const LOGOUT_URL =
  process.env.NEXT_PUBLIC_LOGOUT_URL || "/logout";
