import { NextResponse } from "next/server";
import { supabasePublic } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data } = await supabasePublic
    .from("jobs")
    .select("source");

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.source] = (counts[row.source] ?? 0) + 1;
  }

  return NextResponse.json({ total: data?.length ?? 0, by_source: counts });
}
