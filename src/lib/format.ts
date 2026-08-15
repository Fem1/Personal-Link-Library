export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Tracking params that don't change what the link *is*, so two URLs that
// differ only by these shouldn't be treated as different saves.
const TRACKING_PARAM_PATTERN = /^utm_/;
const TRACKING_PARAM_NAMES = new Set(["fbclid", "gclid"]);

/**
 * Canonicalize a URL for duplicate detection: lowercase host, strip a
 * trailing slash from the path, drop tracking params, and sort the
 * remaining params so differently-ordered query strings still match.
 * Throws if `url` isn't parseable — callers should validate first.
 */
export function normalizeUrl(url: string): string {
  const parsed = new URL(url);
  parsed.hostname = parsed.hostname.toLowerCase();

  if (parsed.pathname.length > 1 && parsed.pathname.endsWith("/")) {
    parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  }

  const keptParams = [...parsed.searchParams.entries()].filter(
    ([key]) => !TRACKING_PARAM_PATTERN.test(key) && !TRACKING_PARAM_NAMES.has(key)
  );
  keptParams.sort(([a], [b]) => a.localeCompare(b));

  parsed.search = "";
  for (const [key, value] of keptParams) {
    parsed.searchParams.append(key, value);
  }

  return parsed.toString();
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
