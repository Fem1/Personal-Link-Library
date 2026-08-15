"use client";

import { useState } from "react";

/**
 * Trash icon that requires a second, explicit click to actually delete —
 * one click shouldn't be enough to remove a link.
 */
export default function DeleteLinkButton({
  id,
  onDeleted,
}: {
  id: number;
  onDeleted: (id: number) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(false);

  async function handleConfirm() {
    setDeleting(true);
    setError(false);
    try {
      const res = await fetch(`/api/links/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setError(true);
        setDeleting(false);
        return;
      }
      onDeleted(id);
    } catch {
      setError(true);
      setDeleting(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 text-xs">
        {error && <span className="text-red-600">Failed</span>}
        <button
          onClick={handleConfirm}
          disabled={deleting}
          className="font-medium text-red-600 underline disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={deleting}
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
      aria-label="Delete link"
      title="Delete link"
      className="rounded p-1 text-black/40 transition-colors hover:bg-red-100 hover:text-red-600 dark:text-white/40 dark:hover:bg-red-900/30 dark:hover:text-red-400"
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
        <path d="M3 6h18" />
        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
      </svg>
    </button>
  );
}
