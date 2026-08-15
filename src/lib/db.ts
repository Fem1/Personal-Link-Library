import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Single-file SQLite DB. Lives outside .next/ so it survives rebuilds.
const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "link-library.db");

// Reuse a single connection across hot-reloads in dev.
declare global {
  var __linkLibraryDb: Database.Database | undefined;
}

function createConnection(): Database.Database {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  // Wait rather than throwing SQLITE_BUSY if something else briefly holds
  // the file lock (e.g. Next's build-time page-data collection running
  // multiple workers).
  db.pragma("busy_timeout = 5000");

  db.exec(`
    CREATE TABLE IF NOT EXISTS links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      title TEXT,
      description TEXT,
      full_text TEXT,
      topic TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      status TEXT NOT NULL DEFAULT 'pending',
      image_url TEXT
    );
  `);

  // Lightweight migration for DBs created before image_url existed —
  // CREATE TABLE IF NOT EXISTS above is a no-op once the table already
  // exists, so a pre-existing file needs the column added explicitly.
  const columns = db.prepare("PRAGMA table_info(links)").all() as {
    name: string;
  }[];
  if (!columns.some((c) => c.name === "image_url")) {
    db.exec("ALTER TABLE links ADD COLUMN image_url TEXT");
  }

  return db;
}

// Lazy singleton: the connection is opened on first use, not at module
// load time. Route/page modules are imported (and thus evaluated) during
// Next's build-time page-data collection, which runs several workers in
// parallel — eagerly opening the DB there causes SQLITE_BUSY lock
// contention between workers touching the same file at once.
export function getDb(): Database.Database {
  if (!global.__linkLibraryDb) {
    global.__linkLibraryDb = createConnection();
  }
  return global.__linkLibraryDb;
}

// Types and constants live in ./types and ./constants (zero runtime
// imports), so client components can use them without pulling this file's
// better-sqlite3 dependency into the browser bundle. Import those directly.
