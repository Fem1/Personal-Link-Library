import { getDistinctTopics } from "@/lib/linkService";
import TopicsGrid from "@/components/TopicsGrid";

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

      <TopicsGrid initialTopics={topics} />
    </div>
  );
}
