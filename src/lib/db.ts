import Database from "better-sqlite3";
import path from "path";

const DB_PATH =
  process.env.DB_PATH ?? path.join(process.cwd(), "logbook.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH, { fileMustExist: true });
    try {
      db.pragma("journal_mode = WAL");
      db.pragma("busy_timeout = 5000");
    } catch {
      // read-only file: pragmas that require writes fail, reads still work
    }
  }
  return db;
}

export function uploadsDir(): string {
  return process.env.UPLOADS_DIR ?? path.join(process.cwd(), "uploads");
}
