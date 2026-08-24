import { NextRequest, NextResponse } from "next/server";
import {
  createPendingLink,
  findDuplicateLink,
  getAllLinks,
  processLink,
} from "@/lib/linkService";

export async function GET() {
  const links = getAllLinks();
  return NextResponse.json({ links });
}

// POST needs to be reachable cross-origin: the save bookmarklet runs in the
// context of whatever page you're on (e.g. nytimes.com), not localhost:3000.
// This is a personal local demo, so allow-all is fine — no cookies/auth to
// leak, and nothing here is sensitive beyond "someone can add a link".
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function corsJson(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: { ...CORS_HEADERS, ...init?.headers },
  });
}

// Cross-origin POST with a JSON body isn't a "simple request", so the
// browser sends a preflight OPTIONS before it — this has to succeed for
// the bookmarklet's fetch() to be allowed to fire at all.
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return corsJson({ error: "Invalid JSON body" }, { status: 400 });
  }

  const url = (body as { url?: unknown })?.url;
  if (typeof url !== "string" || url.trim().length === 0) {
    return corsJson({ error: "url is required" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
    if (!/^https?:$/.test(parsed.protocol)) throw new Error("bad protocol");
  } catch {
    return corsJson(
      { error: "url must be a valid http(s) URL" },
      { status: 400 }
    );
  }

  const duplicate = findDuplicateLink(parsed.toString());
  if (duplicate) {
    return corsJson(
      {
        error: "Already saved",
        existing: {
          id: duplicate.id,
          url: duplicate.url,
          title: duplicate.title,
          topic: duplicate.topic,
          status: duplicate.status,
          created_at: duplicate.created_at,
        },
      },
      { status: 409 }
    );
  }

  const link = createPendingLink(parsed.toString());

  // Fire-and-forget: this app runs as a long-lived local Node process
  // (next dev / next start), so processing continues after the response
  // is sent. The frontend polls GET /api/links to observe status changes.
  processLink(link.id).catch((err) => {
    console.error(`Unhandled error processing link ${link.id}:`, err);
  });

  return corsJson({ link }, { status: 201 });
}
