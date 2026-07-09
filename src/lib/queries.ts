import { getDb } from "./db";
import { addDays, todayStr } from "./dates";
import { TASK_CATEGORIES } from "./types";
import type {
  Attempt,
  Challenge,
  Experiment,
  ExperimentAttachment,
  FileFolder,
  FileItem,
  Goal,
  GoalAttachment,
  Habit,
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
  const sql = `SELECT * FROM tasks ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY CASE priority WHEN 'p0' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END,
             created_at DESC`;
  return getDb().prepare(sql).all(...params) as Task[];
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
