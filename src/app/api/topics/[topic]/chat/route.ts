import { NextRequest, NextResponse } from "next/server";
import { getLinksByTopic } from "@/lib/linkService";
import { chatAboutTopic } from "@/lib/anthropic";

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/topics/[topic]/chat">
) {
  const { topic } = await ctx.params;
  const decoded = decodeURIComponent(topic);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const message = (body as { message?: unknown })?.message;
  const historyInput = (body as { history?: unknown })?.history;

  if (typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const history: ChatTurn[] = Array.isArray(historyInput)
    ? historyInput
        .filter(
          (m): m is ChatTurn =>
            m &&
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string"
        )
        .map((m) => ({ role: m.role, content: m.content }))
    : [];

  const links = getLinksByTopic(decoded);
  if (links.length === 0) {
    return NextResponse.json(
      { error: `No links found for topic "${decoded}"` },
      { status: 404 }
    );
  }

  try {
    const reply = await chatAboutTopic({
      topic: decoded,
      links,
      history,
      message: message.trim(),
    });
    return NextResponse.json({ reply });
  } catch (err) {
    console.error(`Chat failed for topic "${decoded}":`, err);
    return NextResponse.json(
      { error: "Claude request failed. Check your ANTHROPIC_API_KEY and try again." },
      { status: 502 }
    );
  }
}
