import { getRecentLinks } from "@/lib/linkService";
import AddLinkForm from "@/components/AddLinkForm";

// Reads straight from SQLite on every request — never statically cache.
export const dynamic = "force-dynamic";

export default function AddPage() {
  const initialLinks = getRecentLinks(5);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Add a link</h1>
      <p className="mb-6 text-sm text-black/50 dark:text-white/50">
        Paste a URL. It&rsquo;ll be scraped and auto-categorized by topic in
        the background.
      </p>
      <AddLinkForm initialLinks={initialLinks} />
    </div>
  );
}
