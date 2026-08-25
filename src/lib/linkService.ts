import { getDb } from "./db";
import type { LinkRow } from "./types";
import { UNCATEGORIZED_TOPIC } from "./constants";
import { scrapeUrl } from "./scrape";
import { categorizeLink } from "./anthropic";
import { normalizeUrl } from "./format";
import { reassignChatTopic } from "./chatService";

export function getAllLinks(): LinkRow[] {
  return getDb()
    .prepare("SELECT * FROM links ORDER BY created_at DESC, id DESC")
    .all() as LinkRow[];
}

export function getRecentLinks(limit: number): LinkRow[] {
  return getDb()
    .prepare("SELECT * FROM links ORDER BY created_at DESC, id DESC LIMIT ?")
    .all(limit) as LinkRow[];
}

export function getLinkById(id: number): LinkRow | undefined {
  return getDb().prepare("SELECT * FROM links WHERE id = ?").get(id) as
    | LinkRow
    | undefined;
}

export function getDistinctTopics(): { topic: string; count: number }[] {
  // Group by the CASE expression itself, not the "topic" alias -- SQLite
  // resolves a GROUP BY name against a same-named source column before an
  // output alias, so `GROUP BY topic` here would silently group by the raw
  // (pre-CASE) links.topic column instead, splitting the virtual
  // Uncategorized bucket into separate NULL and 'Uncategorized' groups.
  const rows = getDb()
    .prepare(
      `SELECT
         CASE WHEN status = 'failed' OR topic IS NULL THEN ? ELSE topic END AS topic,
         COUNT(*) as count
       FROM links
       GROUP BY CASE WHEN status = 'failed' OR topic IS NULL THEN ? ELSE topic END
       ORDER BY count DESC`
    )
    .all(UNCATEGORIZED_TOPIC, UNCATEGORIZED_TOPIC) as {
    topic: string;
    count: number;
  }[];
  return rows;
}

export function getLinksByTopic(topic: string): LinkRow[] {
  if (topic === UNCATEGORIZED_TOPIC) {
    return getDb()
      .prepare(
        `SELECT * FROM links
         WHERE status = 'failed' OR topic IS NULL
         ORDER BY created_at DESC, id DESC`
      )
      .all() as LinkRow[];
  }
  return getDb()
    .prepare(
      "SELECT * FROM links WHERE topic = ? AND status != 'failed' ORDER BY created_at DESC, id DESC"
    )
    .all(topic) as LinkRow[];
}

/**
 * Find an existing link whose normalized URL matches, regardless of status —
 * a pending/failed row still counts as "already saved" for dedupe purposes.
 * O(n) over all links, which is fine at this app's demo scale; revisit with
 * a stored+indexed normalized_url column if that ever stops being true.
 */
export function findDuplicateLink(url: string): LinkRow | undefined {
  const normalized = normalizeUrl(url);
  return getAllLinks().find((link) => normalizeUrl(link.url) === normalized);
}

/**
 * Insert a pending link row, returning it immediately.
 */
export function createPendingLink(url: string): LinkRow {
  const info = getDb()
    .prepare("INSERT INTO links (url, status) VALUES (?, 'pending')")
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
    const { title, description, fullText, imageUrl } = await scrapeUrl(link.url);

    const existingTopics = getDistinctTopics()
      .map((t) => t.topic)
      .filter((t) => t !== UNCATEGORIZED_TOPIC);

    // Leave topic NULL (rather than writing the literal "Uncategorized"
    // string) so a categorization failure lands in the same virtual
    // Uncategorized bucket as a failed scrape, instead of a second,
    // colliding "real" topic of the same name.
    let topic: string | null;
    try {
      topic = await categorizeLink({
        title,
        description,
        fullText,
        existingTopics,
      });
    } catch {
      // Categorization failing shouldn't sink an otherwise-successful scrape.
      topic = null;
    }

    getDb()
      .prepare(
        `UPDATE links
         SET title = ?, description = ?, full_text = ?, topic = ?, image_url = ?, status = 'ready'
         WHERE id = ?`
      )
      .run(title, description, fullText, topic, imageUrl, id);
  } catch (err) {
    getDb()
      .prepare(
        `UPDATE links
         SET status = 'failed', title = COALESCE(title, ?)
         WHERE id = ?`
      )
      .run(link.url, id);
    console.error(`Failed to process link ${id} (${link.url}):`, err);
  }
}

/**
 * Retry a failed (or re-process any) link.
 */
export async function retryLink(id: number): Promise<void> {
  getDb().prepare("UPDATE links SET status = 'pending' WHERE id = ?").run(id);
  await processLink(id);
}

/**
 * Delete a link by id. Returns whether a row was actually removed.
 */
export function deleteLink(id: number): boolean {
  const info = getDb().prepare("DELETE FROM links WHERE id = ?").run(id);
  return info.changes > 0;
}

// "Uncategorized" is a display label for topic IS NULL (or a failed scrape),
// not a real stored value — see the NULL-vs-string comment in processLink
// above. Move/merge need the same normalization so picking it (or typing it
// as a "new topic") routes back into the virtual bucket instead of creating
// a second, colliding topic literally named "Uncategorized".
function normalizeTopicTarget(topic: string): string | null {
  return topic.toLowerCase() === UNCATEGORIZED_TOPIC.toLowerCase()
    ? null
    : topic;
}

/**
 * Reassign a single link to a different topic (manual fix for
 * categorization drift, e.g. merging "AI" and "Artificial Intelligence").
 * Caller is expected to have already validated `topic` is non-empty.
 */
export function updateLinkTopic(id: number, topic: string): LinkRow | undefined {
  getDb()
    .prepare("UPDATE links SET topic = ? WHERE id = ?")
    .run(normalizeTopicTarget(topic.trim()), id);
  return getLinkById(id);
}

/**
 * Bulk-reassign every link under `sourceTopic` to `targetTopic`. Only
 * touches non-failed rows — a failed link's stale topic value is already
 * invisible everywhere except the virtual Uncategorized bucket (status
 * alone routes it there), so there's nothing meaningful to migrate.
 * Returns how many rows were updated.
 */
export function mergeTopics(sourceTopic: string, targetTopic: string): number {
  const targetValue = normalizeTopicTarget(targetTopic);
  const db = getDb();

  let changes: number;
  if (sourceTopic === UNCATEGORIZED_TOPIC) {
    const info = db
      .prepare(
        "UPDATE links SET topic = ? WHERE topic IS NULL AND status != 'failed'"
      )
      .run(targetValue);
    changes = info.changes;
  } else {
    const info = db
      .prepare(
        "UPDATE links SET topic = ? WHERE topic = ? AND status != 'failed'"
      )
      .run(targetValue, sourceTopic);
    changes = info.changes;
  }

  // Carry the source topic's chat history along too, rather than orphaning
  // it — chat_messages always keys on the literal display string (see
  // reassignChatTopic), so this needs the raw targetTopic, not targetValue.
  reassignChatTopic(sourceTopic, targetTopic);

  return changes;
}
