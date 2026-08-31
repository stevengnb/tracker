import { getDb } from "./db";
import { addDays, todayStr } from "./dates";
import { allFiles, buildTree } from "./vault";
import { TASK_CATEGORIES } from "./types";
import type {
  Attempt,
  Challenge,
  EventItem,
  Experiment,
  ExperimentAttachment,
  LinkItem,
  FileFolder,
  FileItem,
  Goal,
  GoalAttachment,
  Guide,
  Habit,
  PinnedLink,
  QuizAttempt,
  QuizStat,
  Task,
  WatchlistItem,
} from "./types";

// ── Challenges ──────────────────────────────────────────────

export function getChallenges(filters?: {
  category?: string;
  difficulty?: string;
}): Challenge[] {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (filters?.category) {
    where.push("category = ?");
    params.push(filters.category);
  }
  if (filters?.difficulty) {
    where.push("difficulty_tier = ?");
    params.push(Number(filters.difficulty));
  }
  const sql = `SELECT * FROM challenges ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY date DESC`;
  return getDb().prepare(sql).all(...params) as Challenge[];
}

export function getChallenge(id: number): Challenge | undefined {
  return getDb().prepare("SELECT * FROM challenges WHERE id = ?").get(id) as
    | Challenge
    | undefined;
}

export function getTodayChallenge(): Challenge | undefined {
  return getDb()
    .prepare("SELECT * FROM challenges WHERE date = ?")
    .get(todayStr()) as Challenge | undefined;
}

export function getAttempts(challengeId: number): Attempt[] {
  return getDb()
    .prepare(
      "SELECT * FROM attempts WHERE challenge_id = ? ORDER BY attempt_number",
    )
    .all(challengeId) as Attempt[];
}

export function getChallengeCategories(): string[] {
  return (
    getDb()
      .prepare("SELECT DISTINCT category FROM challenges ORDER BY category")
      .all() as { category: string }[]
  ).map((r) => r.category);
}

export function computeStreaks(): { current: number; best: number } {
  const solved = (
    getDb()
      .prepare(
        "SELECT DISTINCT date FROM challenges WHERE status = 'solved' ORDER BY date",
      )
      .all() as { date: string }[]
  ).map((r) => r.date);
  if (solved.length === 0) return { current: 0, best: 0 };

  let best = 1;
  let run = 1;
  for (let i = 1; i < solved.length; i++) {
    run = solved[i] === addDays(solved[i - 1], 1) ? run + 1 : 1;
    if (run > best) best = run;
  }

  // Current streak: consecutive solved days ending today or yesterday.
  const today = todayStr();
  const set = new Set(solved);
  let anchor = set.has(today) ? today : addDays(today, -1);
  let current = 0;
  while (set.has(anchor)) {
    current++;
    anchor = addDays(anchor, -1);
  }
  return { current, best };
}

export type ChallengeStats = {
  total: number;
  solved: number;
  failed: number;
  pending: number;
  byCategory: { category: string; total: number; solved: number }[];
  byTier: { tier: number; total: number; solved: number }[];
};

export function getChallengeStats(): ChallengeStats {
  const db = getDb();
  const counts = db
    .prepare("SELECT status, COUNT(*) n FROM challenges GROUP BY status")
    .all() as { status: string; n: number }[];
  const get = (s: string) => counts.find((c) => c.status === s)?.n ?? 0;
  const byCategory = db
    .prepare(
      `SELECT category, COUNT(*) total,
              SUM(CASE WHEN status='solved' THEN 1 ELSE 0 END) solved
       FROM challenges GROUP BY category ORDER BY category`,
    )
    .all() as { category: string; total: number; solved: number }[];
  const byTier = db
    .prepare(
      `SELECT difficulty_tier tier, COUNT(*) total,
              SUM(CASE WHEN status='solved' THEN 1 ELSE 0 END) solved
       FROM challenges WHERE difficulty_tier IS NOT NULL
       GROUP BY difficulty_tier ORDER BY difficulty_tier`,
    )
    .all() as { tier: number; total: number; solved: number }[];
  return {
    total: counts.reduce((a, c) => a + c.n, 0),
    solved: get("solved"),
    failed: get("failed"),
    pending: get("pending") + get("expired"),
    byCategory,
    byTier,
  };
}

export function getHintUsage(): { attempts: number; withHints: number } {
  const r = getDb()
    .prepare(
      `SELECT COUNT(*) attempts,
              SUM(CASE WHEN hint_received IS NOT NULL THEN 1 ELSE 0 END) withHints
       FROM attempts`,
    )
    .get() as { attempts: number; withHints: number | null };
  return { attempts: r.attempts, withHints: r.withHints ?? 0 };
}

export function getWeeklyPerformance(): {
  week: string;
  solved: number;
  failed: number;
}[] {
  return getDb()
    .prepare(
      `SELECT strftime('%Y-W%W', date) week,
              SUM(CASE WHEN status='solved' THEN 1 ELSE 0 END) solved,
              SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) failed
       FROM challenges GROUP BY week ORDER BY week`,
    )
    .all() as { week: string; solved: number; failed: number }[];
}

// ── Tasks ───────────────────────────────────────────────────

export function getTasks(filters?: {
  status?: string;
  category?: string;
}): Task[] {
  const where: string[] = [];
  const params: string[] = [];
  if (filters?.status && filters.status !== "all") {
    where.push("status = ?");
    params.push(filters.status);
  }
  if (filters?.category && filters.category !== "all") {
    where.push("category = ?");
    params.push(filters.category);
  }
  const sql = `SELECT tasks.*,
      (SELECT COUNT(*) FROM links WHERE source_type='task' AND source_id=tasks.id) AS link_count
    FROM tasks ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY CASE priority WHEN 'p0' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END,
             created_at DESC`;
  return getDb().prepare(sql).all(...params) as Task[];
}

// Cross-entity links (e.g. a task → a Queue item), for jumping between them.
export function getLinks(sourceType: string, sourceId: number): LinkItem[] {
  return getDb()
    .prepare(
      "SELECT * FROM links WHERE source_type = ? AND source_id = ? ORDER BY id",
    )
    .all(sourceType, sourceId) as LinkItem[];
}

export function getTaskCategories(): string[] {
  const fromData = (
    getDb()
      .prepare("SELECT DISTINCT category FROM tasks ORDER BY category")
      .all() as { category: string }[]
  ).map((r) => r.category);
  // Union predefined categories so they show even before any task uses them.
  return Array.from(new Set([...TASK_CATEGORIES, ...fromData]));
}

// ── Goals ───────────────────────────────────────────────────

export function getGoalMonths(): string[] {
  return (
    getDb()
      .prepare("SELECT DISTINCT month FROM goals ORDER BY month")
      .all() as { month: string }[]
  ).map((r) => r.month);
}

export function getGoals(month: string): Goal[] {
  return getDb()
    .prepare("SELECT * FROM goals WHERE month = ? ORDER BY created_at")
    .all(month) as Goal[];
}

export function getGoalAttachments(goalIds: number[]): GoalAttachment[] {
  if (goalIds.length === 0) return [];
  const marks = goalIds.map(() => "?").join(",");
  return getDb()
    .prepare(
      `SELECT * FROM goal_attachments WHERE goal_id IN (${marks}) ORDER BY uploaded_at`,
    )
    .all(...goalIds) as GoalAttachment[];
}

// ── Habits ──────────────────────────────────────────────────

export function getHabits(): Habit[] {
  return getDb()
    .prepare("SELECT * FROM habits WHERE active = 1 ORDER BY id")
    .all() as Habit[];
}

export function getHabitLog(
  since: string,
): { habit_id: number; date: string; completed: 0 | 1 }[] {
  return getDb()
    .prepare(
      "SELECT habit_id, date, completed FROM habit_log WHERE date >= ?",
    )
    .all(since) as { habit_id: number; date: string; completed: 0 | 1 }[];
}

export function habitStreak(habitId: number): number {
  const dates = new Set(
    (
      getDb()
        .prepare(
          "SELECT date FROM habit_log WHERE habit_id = ? AND completed = 1",
        )
        .all(habitId) as { date: string }[]
    ).map((r) => r.date),
  );
  const today = todayStr();
  let anchor = dates.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (dates.has(anchor)) {
    streak++;
    anchor = addDays(anchor, -1);
  }
  return streak;
}

// ── Experiments ─────────────────────────────────────────────

export function getExperiments(status?: string): Experiment[] {
  const where = status && status !== "all" ? "WHERE status = ?" : "";
  const params = status && status !== "all" ? [status] : [];
  return getDb()
    .prepare(
      `SELECT * FROM experiments ${where}
       ORDER BY CASE status
         WHEN 'in-progress' THEN 0 WHEN 'to-try' THEN 1
         WHEN 'done' THEN 2 ELSE 3 END, created_at DESC`,
    )
    .all(...params) as Experiment[];
}

export function getExperimentAttachments(ids: number[]): ExperimentAttachment[] {
  if (ids.length === 0) return [];
  const marks = ids.map(() => "?").join(",");
  return getDb()
    .prepare(
      `SELECT * FROM experiment_attachments WHERE experiment_id IN (${marks}) ORDER BY uploaded_at`,
    )
    .all(...ids) as ExperimentAttachment[];
}

export function getExperimentCounts(): Record<string, number> {
  const rows = getDb()
    .prepare("SELECT status, COUNT(*) n FROM experiments GROUP BY status")
    .all() as { status: string; n: number }[];
  const out: Record<string, number> = {};
  let total = 0;
  for (const r of rows) {
    out[r.status] = r.n;
    total += r.n;
  }
  out.all = total;
  return out;
}

// ── Watchlist ───────────────────────────────────────────────

export function getWatchlist(filters?: {
  kind?: string;
  category?: string;
  status?: string;
}): WatchlistItem[] {
  const where: string[] = [];
  const params: string[] = [];
  if (filters?.kind) {
    where.push("kind = ?");
    params.push(filters.kind);
  }
  if (filters?.category && filters.category !== "all") {
    where.push("category = ?");
    params.push(filters.category);
  }
  if (filters?.status && filters.status !== "all") {
    where.push("status = ?");
    params.push(filters.status);
  }
  const sql = `SELECT * FROM watchlist_items ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY created_at DESC`;
  return getDb().prepare(sql).all(...params) as WatchlistItem[];
}

// ── Cross-module analytics ──────────────────────────────────

export function tasksCompletedPerWeek(): { week: string; n: number }[] {
  return getDb()
    .prepare(
      `SELECT strftime('%Y-W%W', completed_at) week, COUNT(*) n
       FROM tasks WHERE status='done' AND completed_at IS NOT NULL
       GROUP BY week ORDER BY week`,
    )
    .all() as { week: string; n: number }[];
}

export function habitConsistency(days: number): {
  habit: Habit;
  done: number;
  days: number;
}[] {
  const habits = getHabits();
  const since = addDays(todayStr(), -(days - 1));
  const log = getHabitLog(since);
  return habits.map((habit) => ({
    habit,
    done: log.filter((l) => l.habit_id === habit.id && l.completed).length,
    days,
  }));
}

// ── Files (Drive-style folders) ─────────────────────────────

export function getFolder(id: number): FileFolder | undefined {
  return getDb()
    .prepare("SELECT * FROM file_folders WHERE id = ?")
    .get(id) as FileFolder | undefined;
}

/** Root-to-current chain for breadcrumbs (walks parent_id up to the root). */
export function getFolderPath(id: number | null): FileFolder[] {
  const chain: FileFolder[] = [];
  let cur = id;
  const seen = new Set<number>();
  while (cur != null && !seen.has(cur)) {
    seen.add(cur);
    const f = getFolder(cur);
    if (!f) break;
    chain.unshift(f);
    cur = f.parent_id;
  }
  return chain;
}

export function getSubfolders(parentId: number | null): (FileFolder & {
  fileCount: number;
  subCount: number;
})[] {
  const where = parentId == null ? "parent_id IS NULL" : "parent_id = ?";
  const params = parentId == null ? [] : [parentId];
  const folders = getDb()
    .prepare(`SELECT * FROM file_folders WHERE ${where} ORDER BY name COLLATE NOCASE`)
    .all(...params) as FileFolder[];
  const db = getDb();
  return folders.map((f) => ({
    ...f,
    fileCount: (
      db.prepare("SELECT COUNT(*) n FROM files WHERE folder_id = ?").get(f.id) as {
        n: number;
      }
    ).n,
    subCount: (
      db
        .prepare("SELECT COUNT(*) n FROM file_folders WHERE parent_id = ?")
        .get(f.id) as { n: number }
    ).n,
  }));
}

export function getFiles(folderId: number | null): FileItem[] {
  const where = folderId == null ? "folder_id IS NULL" : "folder_id = ?";
  const params = folderId == null ? [] : [folderId];
  return getDb()
    .prepare(`SELECT * FROM files WHERE ${where} ORDER BY created_at DESC`)
    .all(...params) as FileItem[];
}

export function getFile(id: number): FileItem | undefined {
  return getDb().prepare("SELECT * FROM files WHERE id = ?").get(id) as
    | FileItem
    | undefined;
}

/** Flat list of all folders with a "Parent / Child" path label (for move menus). */
export function getAllFolders(): { id: number; name: string; label: string }[] {
  const rows = getDb()
    .prepare("SELECT id, name, parent_id FROM file_folders")
    .all() as { id: number; name: string; parent_id: number | null }[];
  const byId = new Map(rows.map((r) => [r.id, r]));
  const label = (r: { name: string; parent_id: number | null }): string => {
    const parts = [r.name];
    let p = r.parent_id;
    const seen = new Set<number>();
    while (p != null && !seen.has(p)) {
      seen.add(p);
      const par = byId.get(p);
      if (!par) break;
      parts.unshift(par.name);
      p = par.parent_id;
    }
    return parts.join(" / ");
  };
  return rows
    .map((r) => ({ id: r.id, name: r.name, label: label(r) }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

// ── Global search (command palette) ─────────────────────────

export type SearchResult = {
  type: string;
  title: string;
  subtitle?: string;
  href: string;
};

export function globalSearch(q: string): SearchResult[] {
  const term = q.trim();
  if (term.length < 2) return [];
  const like = `%${term.replace(/[%_\\]/g, "\\$&")}%`;
  const db = getDb();
  const out: SearchResult[] = [];
  const rows = (sql: string) =>
    db.prepare(sql).all(like) as Record<string, string>[];

  for (const r of rows(
    "SELECT title, category FROM tasks WHERE title LIKE ? ESCAPE '\\' ORDER BY id DESC LIMIT 5",
  ))
    out.push({ type: "Task", title: r.title, subtitle: r.category, href: "/tasks" });

  for (const r of rows(
    "SELECT title, start_date FROM events WHERE title LIKE ? ESCAPE '\\' ORDER BY start_date DESC LIMIT 5",
  ))
    out.push({
      type: "Event",
      title: r.title,
      subtitle: r.start_date,
      href: `/calendar?month=${r.start_date.slice(0, 7)}`,
    });

  for (const r of rows(
    "SELECT title FROM experiments WHERE title LIKE ? ESCAPE '\\' LIMIT 5",
  ))
    out.push({ type: "Experiment", title: r.title, href: "/experiments" });

  for (const r of rows(
    "SELECT title, month FROM goals WHERE title LIKE ? ESCAPE '\\' LIMIT 5",
  ))
    out.push({ type: "Goal", title: r.title, subtitle: r.month, href: "/goals" });

  for (const r of rows(
    "SELECT id, title, category, kind FROM watchlist_items WHERE title LIKE ? ESCAPE '\\' ORDER BY id DESC LIMIT 5",
  ))
    // Anchor to the item itself (?item=id) rather than a status-filtered list:
    // the queue page shows all statuses when item is set, so the link never
    // goes stale when the item is later marked read/watched.
    out.push({
      type: "Queue",
      title: r.title,
      subtitle: r.category,
      href: `/queue?kind=${r.kind}&item=${r.id}`,
    });

  for (const r of rows(
    "SELECT id, title, kind FROM files WHERE title LIKE ? ESCAPE '\\' LIMIT 5",
  ))
    out.push({
      type: "File",
      title: r.title,
      subtitle: r.kind,
      href: `/files?file=${r.id}`,
    });

  for (const r of rows(
    "SELECT id, category, date, puzzle_text FROM challenges WHERE puzzle_text LIKE ? ESCAPE '\\' ORDER BY date DESC LIMIT 5",
  ))
    out.push({
      type: "Challenge",
      title: `${r.category} · ${r.date}`,
      subtitle: (r.puzzle_text ?? "").slice(0, 70),
      href: `/challenge/${r.id}`,
    });

  for (const r of rows(
    "SELECT id, title, category FROM guides WHERE title LIKE ? ESCAPE '\\' ORDER BY pinned DESC, id DESC LIMIT 5",
  ))
    out.push({
      type: "Guide",
      title: r.title,
      subtitle: r.category,
      href: `/guides?id=${r.id}`,
    });

  // Daily notes (Distraction Sheet). href uses the note: pseudo-scheme — the
  // sheet is a drawer, not a route, so the palette dispatches a
  // `distraction:open` event for these instead of navigating.
  for (const r of rows(
    "SELECT date, content FROM daily_notes WHERE content LIKE ? ESCAPE '\\' ORDER BY date DESC LIMIT 5",
  )) {
    const i = r.content.toLowerCase().indexOf(term.toLowerCase());
    const from = Math.max(0, i - 20);
    out.push({
      type: "Note",
      title: r.date,
      subtitle:
        (from > 0 ? "…" : "") +
        r.content.slice(from, from + 70).replace(/\s+/g, " ").trim(),
      href: `note:${r.date}`,
    });
  }

  // Pins match on the URL too, so "cloudflare" finds the dashboard pin even
  // when its title doesn't say so. href is the external URL, not a route.
  for (const r of db
    .prepare(
      `SELECT title, category, url FROM pinned_links
       WHERE title LIKE ? ESCAPE '\\' OR url LIKE ? ESCAPE '\\'
       ORDER BY sort_order, id LIMIT 5`,
    )
    .all(like, like) as Record<string, string>[])
    out.push({
      type: "Pin",
      title: r.title,
      subtitle: r.category,
      href: r.url,
    });

  const lower = term.toLowerCase();
  for (const p of allFiles(buildTree())
    .filter((f) => f.toLowerCase().includes(lower))
    .slice(0, 5))
    out.push({
      type: "Wiki",
      title: (p.split("/").pop() ?? p).replace(/\.md$/i, ""),
      subtitle: p,
      href: `/wiki?path=${encodeURIComponent(p)}`,
    });

  return out;
}

// ── Pins (permanent shelf of external links) ────────────────

export function getPins(): PinnedLink[] {
  return getDb()
    .prepare(
      `SELECT * FROM pinned_links
       ORDER BY category COLLATE NOCASE, sort_order, title COLLATE NOCASE`,
    )
    .all() as PinnedLink[];
}

export function getPinCategories(): string[] {
  return (
    getDb()
      .prepare(
        "SELECT DISTINCT category FROM pinned_links ORDER BY category COLLATE NOCASE",
      )
      .all() as { category: string }[]
  ).map((r) => r.category);
}

// ── Guides (how-tos / rule docs) ────────────────────────────

export function getGuides(): Guide[] {
  return getDb()
    .prepare(
      `SELECT id, title, category, content, pinned, created_at, updated_at
       FROM guides ORDER BY pinned DESC, category COLLATE NOCASE, title COLLATE NOCASE`,
    )
    .all() as Guide[];
}

export function getGuideCategories(): string[] {
  return (
    getDb()
      .prepare("SELECT DISTINCT category FROM guides ORDER BY category COLLATE NOCASE")
      .all() as { category: string }[]
  ).map((r) => r.category);
}

// ── Pageview stats (self-analytics) ─────────────────────────

export function getPageviewStats(
  days = 30,
): { path: string; n: number; last: string }[] {
  return getDb()
    .prepare(
      `SELECT path, COUNT(*) n, MAX(viewed_at) last FROM pageviews
       WHERE viewed_at >= datetime('now', ?)
       GROUP BY path ORDER BY n DESC`,
    )
    .all(`-${days} days`) as { path: string; n: number; last: string }[];
}

// ── Calendar events ─────────────────────────────────────────

/**
 * Events relevant to [start, end]: non-recurring ones overlapping the range,
 * plus any recurring event whose anchor is on/before the range end (the
 * per-day occurrence check happens in the calendar component).
 */
export function getEventsInRange(start: string, end: string): EventItem[] {
  return getDb()
    .prepare(
      `SELECT * FROM events
       WHERE (recur IS NULL AND start_date <= ? AND COALESCE(end_date, start_date) >= ?)
          OR (recur IS NOT NULL AND start_date <= ?)
       ORDER BY start_date, COALESCE(start_time, '00:00'), id`,
    )
    .all(end, start, end) as EventItem[];
}

/** Events occurring on a specific day (recurrence-aware) — for the Today card. */
export function getEventsForDay(date: string): EventItem[] {
  const wd = new Date(date + "T12:00:00").getDay();
  const dom = date.slice(8);
  return getEventsInRange(date, date).filter((e) => {
    if (date < e.start_date) return false;
    if (!e.recur) return date <= (e.end_date ?? e.start_date);
    if (e.recur === "daily") return true;
    if (e.recur === "weekly")
      return new Date(e.start_date + "T12:00:00").getDay() === wd;
    if (e.recur === "monthly") return e.start_date.slice(8) === dom;
    return date <= (e.end_date ?? e.start_date);
  });
}

export type CalendarTask = {
  id: number;
  title: string;
  due_date: string;
  status: string;
  priority: string;
};

/** Tasks with a due date inside [start, end] (for the calendar overlay). */
export function getTasksDueInRange(start: string, end: string): CalendarTask[] {
  return getDb()
    .prepare(
      `SELECT id, title, due_date, status, priority FROM tasks
       WHERE due_date IS NOT NULL AND due_date BETWEEN ? AND ?
         AND status != 'cancelled'
       ORDER BY due_date`,
    )
    .all(start, end) as CalendarTask[];
}

/** date -> number of habits completed that day, within [start, end]. */
export function getHabitDoneCounts(
  start: string,
  end: string,
): Record<string, number> {
  const rows = getDb()
    .prepare(
      `SELECT date, COUNT(*) n FROM habit_log
       WHERE completed = 1 AND date BETWEEN ? AND ? GROUP BY date`,
    )
    .all(start, end) as { date: string; n: number }[];
  const out: Record<string, number> = {};
  for (const r of rows) out[r.date] = r.n;
  return out;
}

/** This folder's id plus every descendant folder id (for recursive delete). */
export function folderSubtreeIds(id: number): number[] {
  return (
    getDb()
      .prepare(
        `WITH RECURSIVE sub(id) AS (
           SELECT ?
           UNION ALL
           SELECT f.id FROM file_folders f JOIN sub ON f.parent_id = sub.id
         )
         SELECT id FROM sub`,
      )
      .all(id) as { id: number }[]
  ).map((r) => r.id);
}

// ── Quizzes (self-test attempts; quizzes live as files in QUIZ_DIR) ──

export function getQuizAttempts(slug: string, limit = 10): QuizAttempt[] {
  return getDb()
    .prepare(
      `SELECT * FROM quiz_attempts WHERE slug = ? ORDER BY created_at DESC LIMIT ?`,
    )
    .all(slug, limit) as QuizAttempt[];
}

/** Per-slug roll-up (attempts, best %, latest %/date) for the quiz list. */
export function getQuizStats(): Record<string, QuizStat> {
  const rows = getDb()
    .prepare(
      `SELECT slug,
              COUNT(*)                                   AS attempts,
              MAX(CASE WHEN total > 0 THEN ROUND(score * 100.0 / total) ELSE 0 END) AS bestPct,
              (SELECT ROUND(score * 100.0 / total) FROM quiz_attempts b
                 WHERE b.slug = a.slug AND b.total > 0
                 ORDER BY created_at DESC LIMIT 1)        AS lastPct,
              MAX(created_at)                             AS lastAt
         FROM quiz_attempts a
        GROUP BY slug`,
    )
    .all() as (QuizStat & { slug: string })[];
  const out: Record<string, QuizStat> = {};
  for (const r of rows)
    out[r.slug] = {
      attempts: r.attempts,
      bestPct: r.bestPct ?? 0,
      lastPct: r.lastPct ?? 0,
      lastAt: r.lastAt,
    };
  return out;
}
