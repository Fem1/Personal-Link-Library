import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

export interface ScrapeResult {
  title: string;
  description: string | null;
  fullText: string;
  imageUrl: string | null;
}

const FETCH_TIMEOUT_MS = 15_000;

// Below this, an <img> is almost certainly a tracking pixel or spacer, not
// a lead image worth using as a thumbnail.
const MIN_ARTICLE_IMAGE_DIMENSION = 100;

function resolveUrl(raw: string | null | undefined, baseUrl: string): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed, baseUrl).toString();
  } catch {
    return null;
  }
}

/**
 * Find the first usable image inside the Readability-extracted article
 * body HTML. Skips tiny/tracking-pixel images and prefers a lazy-load
 * data-src/data-original over a data: URI placeholder.
 */
function extractArticleImage(articleHtml: string, baseUrl: string): string | null {
  const fragment = new JSDOM(articleHtml, { url: baseUrl });
  const imgs = fragment.window.document.querySelectorAll("img");

  for (const img of imgs) {
    const width = Number(img.getAttribute("width"));
    const height = Number(img.getAttribute("height"));
    const looksTiny =
      (Number.isFinite(width) && width > 0 && width < MIN_ARTICLE_IMAGE_DIMENSION) ||
      (Number.isFinite(height) && height > 0 && height < MIN_ARTICLE_IMAGE_DIMENSION);
    if (looksTiny) continue;

    const rawSrc = img.getAttribute("src");
    const candidate =
      !rawSrc || rawSrc.startsWith("data:")
        ? img.getAttribute("data-src") || img.getAttribute("data-original")
        : rawSrc;

    const resolved = resolveUrl(candidate, baseUrl);
    if (resolved) return resolved;
  }

  return null;
}

interface ImageCandidates {
  ogImageRaw?: string | null;
  twitterImageRaw?: string | null;
  articleContent?: string | null;
  iconRaw?: string | null;
}

/**
 * First match wins: og:image, twitter:image, first large image in the
 * article body, site favicon link, /favicon.ico guess, else none.
 * Shared by scrapeUrl and scrapeImageOnly so both use the exact same chain.
 */
function pickImageUrl(candidates: ImageCandidates, baseUrl: string): string | null {
  return (
    resolveUrl(candidates.ogImageRaw, baseUrl) ||
    resolveUrl(candidates.twitterImageRaw, baseUrl) ||
    (candidates.articleContent
      ? extractArticleImage(candidates.articleContent, baseUrl)
      : null) ||
    resolveUrl(candidates.iconRaw, baseUrl) ||
    resolveUrl("/favicon.ico", baseUrl)
  );
}

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

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
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fetch a URL and extract title, description, and main article text.
 * Throws if the fetch fails or the page yields no usable content —
 * callers should catch and mark the link 'failed'.
 */
export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  const html = await fetchHtml(url);

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

  // Grab image candidates before Readability mutates the DOM.
  const ogImageRaw = doc
    .querySelector('meta[property="og:image"]')
    ?.getAttribute("content");
  const twitterImageRaw = doc
    .querySelector('meta[name="twitter:image"]')
    ?.getAttribute("content");
  const iconRaw = doc.querySelector('link[rel="icon"]')?.getAttribute("href");

  // Readability mutates the DOM, so parse a fresh copy of it.
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  const fullText = article?.textContent?.trim() || "";

  if (!fullText) {
    throw new Error("Could not extract article content from page");
  }

  const imageUrl = pickImageUrl(
    { ogImageRaw, twitterImageRaw, articleContent: article?.content, iconRaw },
    url
  );

  return { title, description, fullText, imageUrl };
}

/**
 * Run just the image-extraction chain against a URL, independent of
 * whether Readability can extract full article text. Used by the
 * one-time backfill script (see scripts/backfill-images.ts) to pick up
 * an image for links that failed full scraping the first time around,
 * or were saved before image_url existed.
 */
export async function scrapeImageOnly(url: string): Promise<string | null> {
  const html = await fetchHtml(url);

  const dom = new JSDOM(html, { url });
  const doc = dom.window.document;

  const ogImageRaw = doc
    .querySelector('meta[property="og:image"]')
    ?.getAttribute("content");
  const twitterImageRaw = doc
    .querySelector('meta[name="twitter:image"]')
    ?.getAttribute("content");
  const iconRaw = doc.querySelector('link[rel="icon"]')?.getAttribute("href");

  // Readability failing to find article text shouldn't block the
  // meta-tag/favicon fallbacks below — unlike scrapeUrl, this function
  // has no full-text requirement to satisfy.
  let articleContent: string | null = null;
  try {
    articleContent = new Readability(dom.window.document).parse()?.content ?? null;
  } catch {
    // Fall through to meta/favicon-only extraction.
  }

  return pickImageUrl({ ogImageRaw, twitterImageRaw, articleContent, iconRaw }, url);
}
