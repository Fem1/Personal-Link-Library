import { getDb } from "./db";
import type { ChatMessageRow, ChatRole } from "./types";

/**
 * A topic's chat history, oldest first. Ordered by created_at with an id
 * tiebreaker — SQLite's datetime('now') is only second-resolution, so a
 * fast round-trip (user message written, then the assistant reply written
 * moments later) could otherwise tie.
 */
export function getChatMessages(topic: string): ChatMessageRow[] {
  return getDb()
    .prepare(
      "SELECT * FROM chat_messages WHERE topic = ? ORDER BY created_at ASC, id ASC"
    )
    .all(topic) as ChatMessageRow[];
}

export function saveChatMessage(
  topic: string,
  role: ChatRole,
  content: string
): ChatMessageRow {
  const info = getDb()
    .prepare(
      "INSERT INTO chat_messages (topic, role, content) VALUES (?, ?, ?)"
    )
    .run(topic, role, content);
  return getDb()
    .prepare("SELECT * FROM chat_messages WHERE id = ?")
    .get(info.lastInsertRowid as number) as ChatMessageRow;
}

export function clearChatMessages(topic: string): void {
  getDb().prepare("DELETE FROM chat_messages WHERE topic = ?").run(topic);
}
