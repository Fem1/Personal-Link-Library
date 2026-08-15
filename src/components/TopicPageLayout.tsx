"use client";

import { useState } from "react";
import type { LinkRow } from "@/lib/types";
import TopicChat from "./TopicChat";
import TopicLinkList from "./TopicLinkList";

/**
 * Chat is the main content area; the link list lives in a collapsible
 * right-hand sidebar (open by default, not persisted across page loads).
 * The sidebar is hidden via a CSS class rather than unmounted so that
 * TopicLinkList's own state (which links have been deleted this session)
 * survives collapsing and reopening it.
 */
export default function TopicPageLayout({
  topic,
  initialLinks,
}: {
  topic: string;
  initialLinks: LinkRow[];
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="flex flex-col gap-4 md:h-[calc(100vh-16rem)] md:min-h-[420px] md:flex-row md:items-stretch">
      <div className="flex min-w-0 flex-col md:h-full md:flex-[3]">
        <TopicChat topic={topic} />
      </div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex flex-shrink-0 items-center gap-1.5 self-start rounded-md border border-black/10 px-2.5 py-1.5 text-xs font-medium text-black/60 transition-colors hover:border-black/30 hover:text-black dark:border-white/10 dark:text-white/60 dark:hover:border-white/30 dark:hover:text-white"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-3.5 w-3.5 transition-transform ${open ? "" : "rotate-180"}`}
        >
          <path d="m9 6 6 6-6 6" />
        </svg>
        {open ? "Hide links" : "Show links"}
      </button>

      <div
        className={
          open
            ? "flex min-h-0 w-full min-w-0 flex-col md:h-full md:w-auto md:flex-1"
            : "hidden"
        }
      >
        <TopicLinkList initialLinks={initialLinks} topic={topic} />
      </div>
    </div>
  );
}
