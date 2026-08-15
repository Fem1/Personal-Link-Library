"use client";

import { useEffect, useRef, useState } from "react";
import type { ExistingLinkSummary, LinkRow } from "@/lib/types";
import { getDomain, formatDate } from "@/lib/format";
import { UNCATEGORIZED_TOPIC } from "@/lib/constants";
import StatusBadge from "./StatusBadge";
import TopicBadge from "./TopicBadge";

const POLL_INTERVAL_MS = 2000;
const RECENT_COUNT = 5;

export default function AddLinkForm({
  initialLinks,
}: {
  initialLinks: LinkRow[];
}) {
  const [links, setLinks] = useState<LinkRow[]>(initialLinks);
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<ExistingLinkSummary | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hasPending = links.some((l) => l.status === "pending");

  async function refresh() {
    try {
      const res = await fetch("/api/links");
      if (!res.ok) return;
      const data = await res.json();
      setLinks((data.links as LinkRow[]).slice(0, RECENT_COUNT));
    } catch {
      // Transient network hiccup — next poll tick will retry.
    }
  }

  // Poll while any visible link is still pending.
  useEffect(() => {
    if (hasPending && !pollRef.current) {
      pollRef.current = setInterval(refresh, POLL_INTERVAL_MS);
    }
    if (!hasPending && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [hasPending]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    setDuplicate(null);
    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && data.existing) {
          setDuplicate(data.existing as ExistingLinkSummary);
        } else {
          setError(data.error || "Failed to add link");
        }
        return;
      }
      setUrl("");
      setLinks((prev) => [data.link as LinkRow, ...prev].slice(0, RECENT_COUNT));
    } catch {
      setError("Failed to reach the server");
    } finally {
      setSubmitting(false);
    }
  }

  function existingLinkHref(existing: ExistingLinkSummary): string {
    // A pending link doesn't have a settled topic page yet — point at its
    // spot on the timeline instead.
    if (existing.status === "pending") return `/timeline#link-${existing.id}`;
    return `/topics/${encodeURIComponent(existing.topic || UNCATEGORIZED_TOPIC)}`;
  }

  async function handleRetry(id: number) {
    setLinks((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: "pending" } : l))
    );
    try {
      await fetch(`/api/links/${id}/retry`, { method: "POST" });
    } catch {
      // Polling will surface whatever state the server settles into.
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="url"
          required
          placeholder="https://example.com/some-article"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (duplicate) setDuplicate(null);
          }}
          className="flex-1 rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/15 dark:focus:border-white/40"
        />
        <button
          type="submit"
          disabled={submitting || !url.trim()}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-40 dark:bg-white dark:text-black"
        >
          {submitting ? "Adding…" : "Add link"}
        </button>
      </form>
      {error && <p className="-mt-4 text-sm text-red-600">{error}</p>}
      {duplicate && (
        <p className="-mt-4 text-sm text-black/60 dark:text-white/60">
          Already saved —{" "}
          <a href={existingLinkHref(duplicate)} className="underline">
            {duplicate.title || duplicate.url}
          </a>
        </p>
      )}

      <div>
        <h2 className="mb-3 text-sm font-medium text-black/60 dark:text-white/60">
          Recently added
        </h2>
        {links.length === 0 ? (
          <p className="text-sm text-black/40 dark:text-white/40">
            No links yet — paste one above to get started.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-black/10 dark:divide-white/10">
            {links.map((link) => (
              <li key={link.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-sm font-medium hover:underline"
                    >
                      {link.title || link.url}
                    </a>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-black/50 dark:text-white/50">
                    <span>{getDomain(link.url)}</span>
                    <span>·</span>
                    <span>{formatDate(link.created_at)}</span>
                    {link.status === "ready" && <TopicBadge topic={link.topic} />}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={link.status} />
                  {link.status === "failed" && (
                    <button
                      onClick={() => handleRetry(link.id)}
                      className="text-xs font-medium text-black/60 underline hover:text-black dark:text-white/60 dark:hover:text-white"
                    >
                      Retry
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
