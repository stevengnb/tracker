-- Tracker Portal — SQLite schema
-- Initialise a fresh database with:  sqlite3 logbook.db < schema.sql
-- (DDL only — no data. Generated from the live schema.)

PRAGMA foreign_keys = ON;

CREATE TABLE attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    challenge_id INTEGER NOT NULL,
    attempt_number INTEGER NOT NULL CHECK(attempt_number IN (1, 2, 3)),
    user_answer TEXT NOT NULL,
    was_correct BOOLEAN NOT NULL DEFAULT 0,
    hint_received TEXT,
    granger_response TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (challenge_id) REFERENCES challenges(id)
);

CREATE TABLE challenges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL UNIQUE,
    category TEXT NOT NULL,
    difficulty_tier INTEGER,
    puzzle_text TEXT NOT NULL,
    answer TEXT NOT NULL,
    full_reasoning TEXT NOT NULL,
    hint_1 TEXT,
    hint_2 TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending', 'solved', 'failed', 'expired')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE daily_notes (
    date TEXT PRIMARY KEY,
    content TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE experiment_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    experiment_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('note','file','link')),
    content TEXT NOT NULL,
    filename TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE
);

CREATE TABLE experiments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    hypothesis TEXT,
    status TEXT NOT NULL DEFAULT 'to-try'
        CHECK(status IN ('to-try','in-progress','done','abandoned')),
    result TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE TABLE file_folders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  parent_id INTEGER REFERENCES file_folders(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folder_id INTEGER REFERENCES file_folders(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  note TEXT,
  filename TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  mime TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('image','pdf')),
  size INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE goal_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('note', 'file', 'link')),
    content TEXT NOT NULL,
    filename TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
);

CREATE TABLE goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    month TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'done', 'abandoned')),
    target_value REAL,
    current_value REAL DEFAULT 0,
    unit TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE habit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habit_id INTEGER NOT NULL,
    date DATE NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT 1,
    source TEXT DEFAULT 'manual' CHECK(source IN ('manual', 'auto')),
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
    UNIQUE(habit_id, date)
);

CREATE TABLE habits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '○',
    auto_source TEXT,
    active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    priority TEXT DEFAULT 'normal' CHECK(priority IN ('p0', 'normal', 'low')),
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'done', 'cancelled')),
    due_date DATE,
    category TEXT DEFAULT 'one-offs',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE TABLE "watchlist_items" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  url TEXT,
  kind TEXT NOT NULL DEFAULT 'watch' CHECK(kind IN ('watch','read')),
  category TEXT NOT NULL,
  subcategory TEXT,
  status TEXT NOT NULL DEFAULT 'to-watch'
      CHECK(status IN ('to-watch','watched','to-read','read','dropped')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_attachments_goal ON goal_attachments(goal_id);
CREATE INDEX idx_attempts_challenge ON attempts(challenge_id);
CREATE INDEX idx_challenges_date ON challenges(date DESC);
CREATE INDEX idx_expatt_exp ON experiment_attachments(experiment_id);
CREATE INDEX idx_files_folder ON files(folder_id);
CREATE INDEX idx_folders_parent ON file_folders(parent_id);
CREATE INDEX idx_goals_month ON goals(month);
CREATE INDEX idx_habitlog_date ON habit_log(date);
CREATE INDEX idx_habitlog_habit ON habit_log(habit_id);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_watchlist_category ON watchlist_items(category);
CREATE INDEX idx_watchlist_kind ON watchlist_items(kind);
CREATE INDEX idx_watchlist_status ON watchlist_items(status);
