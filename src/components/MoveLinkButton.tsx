"use client";

import { useState } from "react";
import { UNCATEGORIZED_TOPIC } from "@/lib/constants";

const NEW_TOPIC_VALUE = "__new__";

/**
 * Folder icon that expands inline into a topic picker — same "replace the
 * icon with inline controls" pattern as DeleteLinkButton, just with a
 * richer confirm step (pick an existing topic, or type a new one).
 */
export default function MoveLinkButton({
  id,
  currentTopic,
  onMoved,
}: {
  id: number;
  currentTopic: string | null;
  onMoved: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [topics, setTopics] = useState<string[] | null>(null);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [selected, setSelected] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleOpen() {
    setOpen(true);
    setError(null);
    if (topics) return;
    setLoadingTopics(true);
    try {
      const res = await fetch("/api/topics");
      const data = await res.json();
      const excluded = currentTopic || UNCATEGORIZED_TOPIC;
      const names = (data.topics as { topic: string }[])
        .map((t) => t.topic)
        .filter((t) => t !== excluded);
      setTopics(names);
    } catch {
      setTopics([]);
    } finally {
      setLoadingTopics(false);
    }
  }

  function handleCancel() {
    setOpen(false);
    setSelected("");
    setNewTopic("");
    setError(null);
  }

  async function handleSubmit() {
    const target = selected === NEW_TOPIC_VALUE ? newTopic.trim() : selected;
    if (!target) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/links/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: target }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to move");
        setSubmitting(false);
        return;
      }
      onMoved(id);
    } catch {
      setError("Failed to reach the server");
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        aria-label="Move to another topic"
        title="Move to another topic"
        className="flex-shrink-0 rounded p-1 text-black/40 transition-colors hover:bg-black/5 hover:text-black dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="flex flex-shrink-0 flex-wrap items-center gap-1.5 text-xs">
      {loadingTopics ? (
        <span className="text-black/40 dark:text-white/40">Loading…</span>
      ) : (
        <>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="rounded border border-black/15 bg-transparent px-1 py-0.5 text-xs dark:border-white/15"
          >
            <option value="" disabled>
              Move to…
            </option>
            {topics?.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
            <option value={NEW_TOPIC_VALUE}>+ New topic</option>
          </select>
          {selected === NEW_TOPIC_VALUE && (
            <input
              autoFocus
              type="text"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              placeholder="New topic name"
              className="w-28 rounded border border-black/15 bg-transparent px-1 py-0.5 text-xs dark:border-white/15"
            />
          )}
          <button
            onClick={handleSubmit}
            disabled={
              submitting ||
              !selected ||
              (selected === NEW_TOPIC_VALUE && !newTopic.trim())
            }
            className="font-medium underline disabled:opacity-40"
          >
            {submitting ? "Moving…" : "Move"}
          </button>
          <button
            onClick={handleCancel}
            disabled={submitting}
            className="text-black/50 underline disabled:opacity-50 dark:text-white/50"
          >
            Cancel
          </button>
        </>
      )}
      {error && <span className="w-full text-red-600">{error}</span>}
    </div>
  );
}
