import { NextRequest, NextResponse } from "next/server";
import { supabasePublic } from "@/lib/db";
import type { JobsApiResponse } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const location = searchParams.get("location") ?? "all"; // all | remote | sf
  const seniority = searchParams.get("seniority") ?? "all";
  const sort = searchParams.get("sort") ?? "postedAt";
  const dir = searchParams.get("dir") ?? "desc";

  let query = supabasePublic
    .from("jobs")
    .select("*")
    .order(sort === "company" ? "company" : "posted_at", {
      ascending: dir === "asc",
      nullsFirst: false,
    });

  if (location === "remote") {
    query = query.eq("is_remote", true);
  } else if (location === "sf") {
    query = query.eq("is_remote", false);
  }

  if (seniority === "junior") {
    query = query.or("title.ilike.%junior%,title.ilike.%jr.%,title.ilike.%entry%,title.ilike.%associate%");
  } else if (seniority === "mid") {
    query = query
      .not("title", "ilike", "%senior%")
      .not("title", "ilike", "%staff%")
      .not("title", "ilike", "%lead%")
      .not("title", "ilike", "%manager%")
      .not("title", "ilike", "%principal%")
      .not("title", "ilike", "%director%")
      .not("title", "ilike", "%junior%")
      .not("title", "ilike", "%jr.%");
  } else if (seniority !== "all") {
    query = query.ilike("title", `%${seniority}%`);
  }

  const { data: jobs, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch last_updated from metadata table
  const { data: meta } = await supabasePublic
    .from("refresh_meta")
    .select("last_updated")
    .eq("id", 1)
    .single();

  const normalized = (jobs ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    company: row.company,
    companySlug: row.company_slug,
    companyDomain: row.company_domain,
    location: row.location,
    url: row.url,
    source: row.source,
    postedAt: row.posted_at ?? null,
    firstSeen: row.created_at ?? null, // when WE first added this job
    isRemote: row.is_remote,
    logoUrl: row.logo_url,
  }));

  const uniqueCompanies = new Set(normalized.map((j) => j.company)).size;

  const response: JobsApiResponse = {
    jobs: normalized,
    total: normalized.length,
    companies: uniqueCompanies,
    lastUpdated: meta?.last_updated ?? null,
  };

  return NextResponse.json(response, {
    headers: { "Cache-Control": "no-store" },
  });
}
