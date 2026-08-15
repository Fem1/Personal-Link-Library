import Link from "next/link";
import { getDistinctTopics } from "@/lib/linkService";
import { UNCATEGORIZED_TOPIC } from "@/lib/constants";

// Reads straight from SQLite on every request — never statically cache.
export const dynamic = "force-dynamic";

export default function TopicsPage() {
  const topics = getDistinctTopics();

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Topics</h1>
      <p className="mb-6 text-sm text-black/50 dark:text-white/50">
        Your links, grouped by what Claude thinks they&rsquo;re about.
      </p>

      {topics.length === 0 ? (
        <p className="text-sm text-black/40 dark:text-white/40">
          No topics yet.{" "}
          <a href="/add" className="underline">
            Add a link
          </a>{" "}
          to get started.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {topics.map(({ topic, count }) => (
            <Link
              key={topic}
              href={`/topics/${encodeURIComponent(topic)}`}
              className={`rounded-lg border p-4 transition-colors hover:border-black/30 dark:hover:border-white/30 ${
                topic === UNCATEGORIZED_TOPIC
                  ? "border-black/10 border-dashed dark:border-white/10"
                  : "border-black/10 dark:border-white/10"
              }`}
            >
              <div className="font-medium">{topic}</div>
              <div className="mt-1 text-sm text-black/50 dark:text-white/50">
                {count} {count === 1 ? "link" : "links"}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
