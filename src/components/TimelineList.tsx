"use client";

import { useState } from "react";
import type { LinkRow } from "@/lib/types";
import { getDomain, formatDate } from "@/lib/format";
import StatusBadge from "./StatusBadge";
import TopicBadge from "./TopicBadge";
import DeleteLinkButton from "./DeleteLinkButton";

export default function TimelineList({
  initialLinks,
}: {
  initialLinks: LinkRow[];
}) {
  const [links, setLinks] = useState<LinkRow[]>(initialLinks);

  function handleDeleted(id: number) {
    setLinks((prev) => prev.filter((l) => l.id !== id));
  }

  if (links.length === 0) {
    return (
      <p className="text-sm text-black/40 dark:text-white/40">
        Nothing here yet.{" "}
        <a href="/add" className="underline">
          Add your first link
        </a>
        .
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-black/10 dark:divide-white/10">
      {links.map((link) => (
        <li
          key={link.id}
          id={`link-${link.id}`}
          className="flex items-center gap-3 py-3 scroll-mt-4 target:bg-amber-50 dark:target:bg-amber-900/10"
        >
          <div className="min-w-0 flex-1">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate text-sm font-medium hover:underline"
            >
              {link.title || link.url}
            </a>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-black/50 dark:text-white/50">
              <span>{getDomain(link.url)}</span>
              <span>·</span>
              <span>{formatDate(link.created_at)}</span>
              {link.status === "ready" && <TopicBadge topic={link.topic} />}
            </div>
          </div>
          <StatusBadge status={link.status} />
          <DeleteLinkButton id={link.id} onDeleted={handleDeleted} />
        </li>
      ))}
    </ul>
  );
}
