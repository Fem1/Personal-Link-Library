import { notFound } from "next/navigation";
import Link from "next/link";
import { getLinksByTopic } from "@/lib/linkService";
import TopicPageLayout from "@/components/TopicPageLayout";

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
      </div>

      <TopicPageLayout topic={decoded} initialLinks={links} />
    </div>
  );
}
