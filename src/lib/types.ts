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
  description: string | null;
  link_count?: number;
  created_at: string;
  completed_at: string | null;
};

export type LinkItem = {
  id: number;
  source_type: string;
  source_id: number;
  target_type: string;
  target_title: string;
  target_href: string;
  created_at: string;
};

export type EventItem = {
  id: number;
  title: string;
  description: string | null;
  start_date: string; // YYYY-MM-DD
  end_date: string | null; // optional, for multi-day
  start_time: string | null; // HH:MM; null = all-day
  end_time: string | null;
  color: string | null;
  recur: string | null; // null | "daily" | "weekly" | "monthly"
  created_at: string;
};

// Small event colour palette (first = default).
export const EVENT_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#0ea5e9",
  "#a855f7",
];

export type Goal = {
  id: number;
  title: string;
  period: string; // 'YYYY-Q1'..'YYYY-Q4'
  description: string | null;
  status: "active" | "done" | "abandoned";
  kind: "target" | "checklist";
  target_value: number | null;
  current_value: number;
  unit: string | null;
  reward: string | null; // optional "treat yourself" note when the goal is met
  created_at: string;
};

export type GoalItem = {
  id: number;
  goal_id: number;
  label: string;
  done: 0 | 1;
  position: number;
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

export type QueueBucket = "queue" | "entertainment";

export type WatchlistItem = {
  id: number;
  title: string;
  url: string | null;
  kind: "watch" | "read";
  category: string;
  subcategory: string | null;
  status: "to-watch" | "watched" | "to-read" | "read" | "dropped";
  notes: string | null;
  bucket: QueueBucket;
  created_at: string;
};

// Categories per bucket + kind. First value is the add-form default. Kept as a
// plain map (the DB column is free-text, no CHECK) so adding a category is a
// one-line change here with no migration.
export const QUEUE_CATEGORIES: Record<
  QueueBucket,
  Record<"watch" | "read", string[]>
> = {
  queue: {
    watch: ["youtube", "general", "channel"],
    read: ["article", "github", "docs", "thread", "topic"],
  },
  entertainment: {
    watch: ["anime", "movie", "series", "general"],
    read: ["book", "manga", "comic"],
  },
};

export const QUEUE_CATEGORY_LABELS: Record<string, string> = {
  youtube: "YouTube",
  anime: "Anime",
  movie: "Movies",
  series: "Series",
  general: "General",
  channel: "Channels",
  article: "Articles",
  github: "GitHub",
  docs: "Docs",
  thread: "Threads",
  topic: "Topics",
  book: "Books",
  manga: "Manga",
  comic: "Comics",
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
  kind: "image" | "pdf" | "zip" | "markdown";
  size: number | null;
  created_at: string;
};

// ── Guides (how-tos / rule docs / checklists) ───────────────

export type Guide = {
  id: number;
  title: string;
  category: string;
  content: string; // markdown
  pinned: number; // 0 | 1
  archived: number; // 0 | 1
  created_at: string;
  updated_at: string;
};

// ── Pins (permanent shelf of external links) ────────────────

export type PinnedLink = {
  id: number;
  title: string;
  url: string;
  category: string;
  note: string | null;
  sort_order: number;
  created_at: string;
};

// ── Quizzes (self-test over a Markdown file, QUIZ_DIR) ───────

export type QuizOption = { text: string; correct: boolean };

export type QuizQuestion = {
  prompt: string;
  options: QuizOption[];
  explanation: string | null;
  multi: boolean; // more than one correct option → multi-select
};

export type Quiz = {
  slug: string; // bare filename, no extension
  path: string; // relative to QUIZ_DIR
  title: string;
  topic: string | null; // vault relpath of the note this quiz tests
  questions: QuizQuestion[];
};

export type QuizMeta = {
  slug: string;
  title: string;
  topic: string | null;
  count: number;
};

export type QuizAttempt = {
  id: number;
  slug: string;
  title: string;
  score: number;
  total: number;
  created_at: string;
};

// Per-quiz roll-up for the list page.
export type QuizStat = {
  attempts: number;
  bestPct: number;
  lastPct: number;
  lastAt: string;
};

// Where the logout button sends the browser. For Cloudflare Access, set
// NEXT_PUBLIC_LOGOUT_URL to https://<team>.cloudflareaccess.com/cdn-cgi/access/logout.
// Falls back to a local /logout path when unset.
export const LOGOUT_URL =
  process.env.NEXT_PUBLIC_LOGOUT_URL || "/logout";
