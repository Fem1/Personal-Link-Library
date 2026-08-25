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

/**
 * Move a topic's chat history to another topic's — used when merging
 * topics (linkService.mergeTopics) so a merge doesn't orphan the source
 * topic's conversation. Unlike links.topic, chat_messages.topic is always
 * the literal display string (including "Uncategorized" for that virtual
 * page, which has no grouping logic to collide with) and is NOT NULL, so
 * this needs no null-normalization the way link reassignment does.
 */
export function reassignChatTopic(sourceTopic: string, targetTopic: string): void {
  getDb()
    .prepare("UPDATE chat_messages SET topic = ? WHERE topic = ?")
    .run(targetTopic, sourceTopic);
}
