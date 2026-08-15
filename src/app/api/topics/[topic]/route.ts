import { NextResponse } from "next/server";
import { getLinksByTopic } from "@/lib/linkService";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/topics/[topic]">
) {
  const { topic } = await ctx.params;
  const decoded = decodeURIComponent(topic);
  const links = getLinksByTopic(decoded);
  return NextResponse.json({ topic: decoded, links });
}
