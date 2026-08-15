import Link from "next/link";
import { UNCATEGORIZED_TOPIC } from "@/lib/constants";

export default function TopicBadge({ topic }: { topic: string | null }) {
  const display = topic || UNCATEGORIZED_TOPIC;
  return (
    <Link
      href={`/topics/${encodeURIComponent(display)}`}
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-colors hover:opacity-80 ${
        display === UNCATEGORIZED_TOPIC
          ? "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
          : "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300"
      }`}
    >
      {display}
    </Link>
  );
}
