import { NextResponse } from "next/server";
import { getDistinctTopics } from "@/lib/linkService";

export async function GET() {
  const topics = getDistinctTopics();
  return NextResponse.json({ topics });
}
