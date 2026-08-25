import { NextRequest, NextResponse } from "next/server";
import { deleteLink, getLinkById, updateLinkTopic } from "@/lib/linkService";

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/links/[id]">
) {
  const { id } = await ctx.params;
  const linkId = Number(id);
  if (!Number.isInteger(linkId)) {
    return NextResponse.json({ error: "Invalid link id" }, { status: 400 });
  }

  const deleted = deleteLink(linkId);
  if (!deleted) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/links/[id]">
) {
  const { id } = await ctx.params;
  const linkId = Number(id);
  if (!Number.isInteger(linkId)) {
    return NextResponse.json({ error: "Invalid link id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const topic = (body as { topic?: unknown })?.topic;
  if (typeof topic !== "string" || topic.trim().length === 0) {
    return NextResponse.json({ error: "topic is required" }, { status: 400 });
  }

  if (!getLinkById(linkId)) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  const link = updateLinkTopic(linkId, topic);
  return NextResponse.json({ link });
}
