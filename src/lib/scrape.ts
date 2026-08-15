import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

export interface ScrapeResult {
  title: string;
  description: string | null;
  fullText: string;
}

const FETCH_TIMEOUT_MS = 15_000;

/**
 * Fetch a URL and extract title, description, and main article text.
 * Throws if the fetch fails or the page yields no usable content —
 * callers should catch and mark the link 'failed'.
 */
export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let html: string;
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // Some sites block requests with no UA / block obvious bot UAs.
        "User-Agent":
          "Mozilla/5.0 (compatible; LinkLibraryBot/1.0; +http://localhost)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) {
      throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
    }
    html = await res.text();
  } finally {
    clearTimeout(timeout);
  }

  const dom = new JSDOM(html, { url });
  const doc = dom.window.document;

  const ogTitle = doc
    .querySelector('meta[property="og:title"]')
    ?.getAttribute("content");
  const title =
    ogTitle?.trim() || doc.querySelector("title")?.textContent?.trim() || url;

  const ogDescription = doc
    .querySelector('meta[property="og:description"]')
    ?.getAttribute("content");
  const metaDescription = doc
    .querySelector('meta[name="description"]')
    ?.getAttribute("content");
  const description = (ogDescription || metaDescription || "")?.trim() || null;

  // Readability mutates the DOM, so parse a fresh copy of it.
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  const fullText = article?.textContent?.trim() || "";

  if (!fullText) {
    throw new Error("Could not extract article content from page");
  }

  return { title, description, fullText };
}
