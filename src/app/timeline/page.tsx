import { getAllLinks } from "@/lib/linkService";
import TimelineList from "@/components/TimelineList";

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

      <TimelineList initialLinks={links} />
    </div>
  );
}
