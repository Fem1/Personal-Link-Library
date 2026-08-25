"use client";

import { useState } from "react";

/**
 * "Merge into…" control for a topic card. Two explicit steps before
 * anything happens — pick a target, then confirm — since a merge touches
 * every link under the topic and isn't reversible without reassigning them
 * back one by one.
 */
export default function MergeTopicButton({
  topic,
  count,
  otherTopics,
  onMerged,
}: {
  topic: string;
  count: number;
  otherTopics: string[];
  onMerged: (sourceTopic: string, targetTopic: string, moved: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setOpen(false);
    setSelected("");
    setConfirming(false);
    setError(null);
  }

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/topics/${encodeURIComponent(topic)}/merge`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ into: selected }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to merge");
        setSubmitting(false);
        return;
      }
      onMerged(topic, selected, data.moved ?? 0);
    } catch {
      setError("Failed to reach the server");
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-black/40 underline transition-colors hover:text-black dark:text-white/40 dark:hover:text-white"
      >
        Merge into…
      </button>
    );
  }

  if (confirming) {
    return (
      <div className="flex flex-col gap-1.5 text-xs">
        <p className="text-black/70 dark:text-white/70">
          Merge {count} {count === 1 ? "link" : "links"} from &ldquo;{topic}
          &rdquo; into &ldquo;{selected}&rdquo;? This can&rsquo;t be undone
          automatically.
        </p>
        {error && <p className="text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="font-medium text-red-600 underline disabled:opacity-50"
          >
            {submitting ? "Merging…" : "Confirm merge"}
          </button>
          <button
            onClick={reset}
            disabled={submitting}
            className="text-black/50 underline disabled:opacity-50 dark:text-white/50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="rounded border border-black/15 bg-transparent px-1 py-0.5 text-xs dark:border-white/15"
      >
        <option value="" disabled>
          Merge into…
        </option>
        {otherTopics.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <button
        onClick={() => selected && setConfirming(true)}
        disabled={!selected}
        className="font-medium underline disabled:opacity-40"
      >
        Next
      </button>
      <button
        onClick={reset}
        className="text-black/50 underline dark:text-white/50"
      >
        Cancel
      </button>
    </div>
  );
}
