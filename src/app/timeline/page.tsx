import { getAllLinks } from "@/lib/linkService";
import { getDomain, formatDate } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import TopicBadge from "@/components/TopicBadge";

// Reads straight from SQLite on every request — never statically cache.
export const dynamic = "force-dynamic";

export default function TimelinePage() {
  const links = getAllLinks();

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Timeline</h1>
      <p className="mb-6 text-sm text-black/50 dark:text-white/50">
        Every link you&rsquo;ve saved, newest first.
      </p>

      {links.length === 0 ? (
        <p className="text-sm text-black/40 dark:text-white/40">
          Nothing here yet.{" "}
          <a href="/add" className="underline">
            Add your first link
          </a>
          .
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-black/10 dark:divide-white/10">
          {links.map((link) => (
            <li key={link.id} className="flex items-center gap-3 py-3">
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
