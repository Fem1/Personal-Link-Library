import { NextResponse } from "next/server";
import { getLinkById, retryLink } from "@/lib/linkService";

export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/links/[id]/retry">
) {
  const { id } = await ctx.params;
  const linkId = Number(id);
  if (!Number.isInteger(linkId)) {
    return NextResponse.json({ error: "Invalid link id" }, { status: 400 });
  }

  const link = getLinkById(linkId);
  if (!link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  retryLink(linkId).catch((err) => {
    console.error(`Unhandled error retrying link ${linkId}:`, err);
  });

  return NextResponse.json({ ok: true });
}
