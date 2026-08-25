"use client";

import { useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import type { ChatMessageRow } from "@/lib/types";
import ClearChatButton from "./ClearChatButton";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Small, tight overrides matching the chat bubble's existing text-sm style
// (rather than a generic prose block, which needs retuning to sit well in a
// narrow 85%-width bubble). Citation links open in a new tab like every
// other outbound link in the app.
const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => (
    <ul className="mb-2 list-disc space-y-1 pl-4 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 list-decimal space-y-1 pl-4 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => <li>{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline underline-offset-2 hover:opacity-80"
    >
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded bg-black/10 px-1 py-0.5 text-[0.85em] dark:bg-white/10">
      {children}
    </code>
  ),
};

export default function TopicChat({
  topic,
  initialMessages,
}: {
  topic: string;
  initialMessages: ChatMessageRow[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    initialMessages.map((m) => ({ role: m.role, content: m.content }))
  );
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const message = input.trim();
    if (!message || sending) return;

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: message },
    ];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/topics/${encodeURIComponent(topic)}/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, history: messages }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      setMessages([...nextMessages, { role: "assistant", content: data.reply }]);
    } catch {
      setError("Failed to reach the server");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border border-black/10 dark:border-white/10">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-black/10 px-4 py-3 text-sm font-medium dark:border-white/10">
        <span>Chat about &ldquo;{topic}&rdquo;</span>
        {messages.length > 0 && (
          <ClearChatButton topic={topic} onCleared={() => setMessages([])} />
        )}
      </div>

      {/* Mobile: fixed-height scroll box (unchanged). Desktop: fills
          whatever height the column has, scrolling internally, while the
          header above and input below stay pinned. */}
      <div className="flex max-h-96 min-h-32 flex-col gap-3 overflow-y-auto px-4 py-4 md:max-h-none md:min-h-0 md:flex-1">
        {messages.length === 0 && (
          <p className="text-sm text-black/40 dark:text-white/40">
            Ask a question — answers are grounded only in the links saved
            under this topic.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
              m.role === "user"
                ? "self-end whitespace-pre-wrap bg-black text-white dark:bg-white dark:text-black"
                : "self-start bg-black/5 dark:bg-white/10"
            }`}
          >
            {m.role === "assistant" ? (
              <ReactMarkdown components={markdownComponents}>
                {m.content}
              </ReactMarkdown>
            ) : (
              m.content
            )}
          </div>
        ))}
        {sending && (
          <div className="self-start rounded-lg bg-black/5 px-3 py-2 text-sm text-black/50 dark:bg-white/10 dark:text-white/50">
            Thinking…
          </div>
        )}
      </div>

      {error && <p className="px-4 pb-2 text-sm text-red-600">{error}</p>}

      <form
        onSubmit={handleSubmit}
        className="flex flex-shrink-0 gap-2 border-t border-black/10 p-3 dark:border-white/10"
      >
        <input
          type="text"
          placeholder="Ask about these links…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/15 dark:focus:border-white/40"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-40 dark:bg-white dark:text-black"
        >
          Send
        </button>
      </form>
    </div>
  );
}
