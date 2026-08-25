"use client";

import { useState } from "react";

/**
 * Text button that requires a second, explicit click to actually clear —
 * same two-step confirm pattern as DeleteLinkButton, since chat history is
 * now permanent and worth protecting from an accidental click.
 */
export default function ClearChatButton({
  topic,
  onCleared,
}: {
  topic: string;
  onCleared: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState(false);

  async function handleConfirm() {
    setClearing(true);
    setError(false);
    try {
      const res = await fetch(
        `/api/topics/${encodeURIComponent(topic)}/chat`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        setError(true);
        setClearing(false);
        return;
      }
      onCleared();
      setConfirming(false);
    } catch {
      setError(true);
    } finally {
      setClearing(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex flex-shrink-0 items-center gap-2 text-xs whitespace-nowrap">
        {error && <span className="text-red-600">Failed</span>}
        <button
          onClick={handleConfirm}
          disabled={clearing}
          className="font-medium text-red-600 underline disabled:opacity-50"
        >
          {clearing ? "Clearing…" : "Clear"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={clearing}
          className="text-black/50 underline disabled:opacity-50 dark:text-white/50"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="flex-shrink-0 text-xs font-normal text-black/40 underline transition-colors hover:text-black dark:text-white/40 dark:hover:text-white"
    >
      Clear chat
    </button>
  );
}
