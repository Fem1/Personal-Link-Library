// Shared types with zero runtime imports, safe to use from client components.
// (src/lib/db.ts pulls in better-sqlite3, which must never reach the browser bundle.)

export type LinkStatus = "pending" | "ready" | "failed";

export interface LinkRow {
  id: number;
  url: string;
  title: string | null;
  description: string | null;
  full_text: string | null;
  topic: string | null;
  created_at: string;
  status: LinkStatus;
  image_url: string | null;
}

// Subset of LinkRow returned by POST /api/links on a 409 duplicate response —
// enough for the frontend to link back to the existing entry.
export type ExistingLinkSummary = Pick<
  LinkRow,
  "id" | "url" | "title" | "topic" | "status" | "created_at"
>;
