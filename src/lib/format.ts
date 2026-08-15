export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function formatDate(iso: string): string {
  // SQLite datetime('now') returns "YYYY-MM-DD HH:MM:SS" (UTC, no 'Z') —
  // normalize so Date() parses it correctly instead of treating it as local time.
  const normalized = iso.includes("T") ? iso : iso.replace(" ", "T") + "Z";
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
