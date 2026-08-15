import { NextResponse } from "next/server";
import { deleteLink } from "@/lib/linkService";

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
