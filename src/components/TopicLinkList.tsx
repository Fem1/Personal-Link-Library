"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { LinkRow } from "@/lib/types";
import { getDomain, formatDate } from "@/lib/format";
import DeleteLinkButton from "./DeleteLinkButton";

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
    <div className="flex flex-col gap-3">
      <p className="text-sm text-black/50 dark:text-white/50">
        {links.length} {links.length === 1 ? "link" : "links"}
      </p>
      <ul className="flex flex-col divide-y divide-black/10 dark:divide-white/10">
        {links.map((link) => (
          <li key={link.id} className="flex items-start gap-3 py-3">
            <div className="min-w-0 flex-1">
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium hover:underline"
              >
                {link.title || link.url}
              </a>
              <div className="mt-1 text-xs text-black/50 dark:text-white/50">
                {getDomain(link.url)} · {formatDate(link.created_at)}
              </div>
              {link.description && (
                <p className="mt-1 text-sm text-black/70 dark:text-white/70">
                  {link.description}
                </p>
              )}
            </div>
            <DeleteLinkButton id={link.id} onDeleted={handleDeleted} />
          </li>
        ))}
      </ul>
    </div>
  );
}
