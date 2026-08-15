import { db, LinkRow, UNCATEGORIZED_TOPIC } from "./db";
import { scrapeUrl } from "./scrape";
import { categorizeLink } from "./anthropic";

export function getAllLinks(): LinkRow[] {
  return db
    .prepare("SELECT * FROM links ORDER BY created_at DESC, id DESC")
    .all() as LinkRow[];
}

export function getRecentLinks(limit: number): LinkRow[] {
  return db
    .prepare("SELECT * FROM links ORDER BY created_at DESC, id DESC LIMIT ?")
    .all(limit) as LinkRow[];
}

export function getLinkById(id: number): LinkRow | undefined {
  return db.prepare("SELECT * FROM links WHERE id = ?").get(id) as
    | LinkRow
    | undefined;
}

export function getDistinctTopics(): { topic: string; count: number }[] {
  const rows = db
    .prepare(
      `SELECT
         CASE WHEN status = 'failed' OR topic IS NULL THEN ? ELSE topic END AS topic,
         COUNT(*) as count
       FROM links
       GROUP BY topic
       ORDER BY topic ASC`
    )
    .all(UNCATEGORIZED_TOPIC) as { topic: string; count: number }[];
  return rows;
}

export function getLinksByTopic(topic: string): LinkRow[] {
  if (topic === UNCATEGORIZED_TOPIC) {
    return db
      .prepare(
        `SELECT * FROM links
         WHERE status = 'failed' OR topic IS NULL
         ORDER BY created_at DESC, id DESC`
      )
      .all() as LinkRow[];
  }
  return db
    .prepare(
      "SELECT * FROM links WHERE topic = ? AND status != 'failed' ORDER BY created_at DESC, id DESC"
    )
    .all(topic) as LinkRow[];
}

/**
 * Insert a pending link row, returning it immediately.
 */
export function createPendingLink(url: string): LinkRow {
  const info = db
    .prepare(
      "INSERT INTO links (url, status) VALUES (?, 'pending')"
    )
    .run(url);
  return getLinkById(info.lastInsertRowid as number)!;
}

/**
 * Scrape + categorize a pending link and update its row.
 * Runs "synchronously" from the caller's perspective (no real queue),
 * per the spec's simplified demo flow.
 */
export async function processLink(id: number): Promise<void> {
  const link = getLinkById(id);
  if (!link) return;

  try {
    const { title, description, fullText } = await scrapeUrl(link.url);

    const existingTopics = getDistinctTopics()
      .map((t) => t.topic)
      .filter((t) => t !== UNCATEGORIZED_TOPIC);

    let topic: string;
    try {
      topic = await categorizeLink({
        title,
        description,
        fullText,
        existingTopics,
      });
    } catch {
      // Categorization failing shouldn't sink an otherwise-successful scrape.
      topic = UNCATEGORIZED_TOPIC;
    }

    db.prepare(
      `UPDATE links
       SET title = ?, description = ?, full_text = ?, topic = ?, status = 'ready'
       WHERE id = ?`
    ).run(title, description, fullText, topic, id);
  } catch (err) {
    db.prepare(
      `UPDATE links
       SET status = 'failed', title = COALESCE(title, ?)
       WHERE id = ?`
    ).run(link.url, id);
    console.error(`Failed to process link ${id} (${link.url}):`, err);
  }
}

/**
 * Retry a failed (or re-process any) link.
 */
export async function retryLink(id: number): Promise<void> {
  db.prepare("UPDATE links SET status = 'pending' WHERE id = ?").run(id);
  await processLink(id);
}
