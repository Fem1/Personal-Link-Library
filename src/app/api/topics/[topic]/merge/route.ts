import { NextRequest, NextResponse } from "next/server";
import { mergeTopics } from "@/lib/linkService";

export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/topics/[topic]/merge">
) {
  const { topic } = await ctx.params;
  const decoded = decodeURIComponent(topic);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const into = (body as { into?: unknown })?.into;
  if (typeof into !== "string" || into.trim().length === 0) {
    return NextResponse.json({ error: "into is required" }, { status: 400 });
  }

  const target = into.trim();
  if (target.toLowerCase() === decoded.toLowerCase()) {
    return NextResponse.json(
      { error: "Cannot merge a topic into itself" },
      { status: 400 }
    );
  }

  const moved = mergeTopics(decoded, target);
  return NextResponse.json({ ok: true, moved });
}
