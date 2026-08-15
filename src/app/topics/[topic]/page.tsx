import { notFound } from "next/navigation";
import Link from "next/link";
import { getLinksByTopic } from "@/lib/linkService";
import { getDomain, formatDate } from "@/lib/format";
import TopicChat from "@/components/TopicChat";

// Reads straight from SQLite on every request — never statically cache.
export const dynamic = "force-dynamic";

export default async function TopicDetailPage({
  params,
}: PageProps<"/topics/[topic]">) {
  const { topic } = await params;
  const decoded = decodeURIComponent(topic);
  const links = getLinksByTopic(decoded);

  if (links.length === 0) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/topics"
          className="text-sm text-black/50 hover:underline dark:text-white/50"
        >
          ← All topics
        </Link>
        <h1 className="mt-1 text-xl font-semibold">{decoded}</h1>
        <p className="mt-1 text-sm text-black/50 dark:text-white/50">
          {links.length} {links.length === 1 ? "link" : "links"}
        </p>
      </div>

      <ul className="flex flex-col divide-y divide-black/10 dark:divide-white/10">
        {links.map((link) => (
          <li key={link.id} className="py-3">
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
          </li>
        ))}
      </ul>

      <TopicChat topic={decoded} />
    </div>
  );
}
