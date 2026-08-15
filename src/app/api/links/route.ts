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

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const url = (body as { url?: unknown })?.url;
  if (typeof url !== "string" || url.trim().length === 0) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
    if (!/^https?:$/.test(parsed.protocol)) throw new Error("bad protocol");
  } catch {
    return NextResponse.json(
      { error: "url must be a valid http(s) URL" },
      { status: 400 }
    );
  }

  const duplicate = findDuplicateLink(parsed.toString());
  if (duplicate) {
    return NextResponse.json(
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

  return NextResponse.json({ link }, { status: 201 });
}
