"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { LinkRow } from "@/lib/types";
import DeleteLinkButton from "./DeleteLinkButton";
import MoveLinkButton from "./MoveLinkButton";
import LinkThumbnail from "./LinkThumbnail";

export default function TopicLinkList({
  initialLinks,
}: {
  initialLinks: LinkRow[];
  topic: string;
}) {
  const router = useRouter();
  const [links, setLinks] = useState<LinkRow[]>(initialLinks);

  function handleDeleted(id: number) {
    setLinks((prev) => prev.filter((l) => l.id !== id));
  }

  // A moved link no longer belongs to this topic's view — same removal as
  // delete, which also reuses the empty-list redirect below for free.
  function handleMoved(id: number) {
    setLinks((prev) => prev.filter((l) => l.id !== id));
  }

  // Deleting the last link in a topic means the topic itself no longer
  // exists (it's a virtual grouping, not a stored row) — bounce back to
  // /topics rather than showing an empty page.
  useEffect(() => {
    if (links.length === 0) {
      router.replace("/topics");
    }
  }, [links.length, router]);

  if (links.length === 0) {
    return null;
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <p className="flex-shrink-0 text-xs text-black/50 dark:text-white/50">
        {links.length} {links.length === 1 ? "link" : "links"}
      </p>
      {/* Mobile: natural height, page scrolls (unchanged). Desktop: bounded
          to the sidebar's available height, scrolling independently of
          the rest of the page. */}
      <ul className="flex flex-col divide-y divide-black/10 dark:divide-white/10 md:min-h-0 md:flex-1 md:overflow-y-auto">
        {links.map((link, i) => (
          <li key={link.id} className="flex flex-wrap items-center gap-2 py-2">
            <span className="w-5 flex-shrink-0 text-right text-xs text-black/40 dark:text-white/40">
              {i + 1}.
            </span>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-w-0 flex-1 items-center gap-2 hover:underline"
            >
              <LinkThumbnail src={link.image_url} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {link.title || link.url}
              </span>
            </a>
            {/* Only offer reassignment for successfully-scraped links —
                failed rows never show under a real topic regardless of
                their topic value, and pending ones could get their topic
                overwritten by categorization finishing moments later. */}
            {link.status === "ready" && (
              <MoveLinkButton
                id={link.id}
                currentTopic={link.topic}
                onMoved={handleMoved}
              />
            )}
            <DeleteLinkButton id={link.id} onDeleted={handleDeleted} />
          </li>
        ))}
      </ul>
    </div>
  );
}
