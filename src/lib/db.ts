import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Single-file SQLite DB. Lives outside .next/ so it survives rebuilds.
const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "link-library.db");

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Reuse a single connection across hot-reloads in dev.
declare global {
  // eslint-disable-next-line no-var
  var __linkLibraryDb: Database.Database | undefined;
}

function createConnection(): Database.Database {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      title TEXT,
      description TEXT,
      full_text TEXT,
      topic TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      status TEXT NOT NULL DEFAULT 'pending'
    );
  `);

  return db;
}

export const db = global.__linkLibraryDb ?? createConnection();

if (process.env.NODE_ENV !== "production") {
  global.__linkLibraryDb = db;
}

export type LinkStatus = "pending" | "ready" | "failed";

export interface LinkRow {
  id: number;
  url: string;
  title: string | null;
  description: string | null;
  full_text: string | null;
  topic: string | null;
  created_at: string;
  status: LinkStatus;
}

export const UNCATEGORIZED_TOPIC = "Uncategorized";
