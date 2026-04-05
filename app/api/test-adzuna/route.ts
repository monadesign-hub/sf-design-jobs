import { NextResponse } from "next/server";
import { matchesTitle, matchesLocation } from "@/lib/normalize";

export const dynamic = "force-dynamic";

export async function GET() {
  const id  = process.env.ADZUNA_APP_ID;
  const key = process.env.ADZUNA_APP_KEY;

  if (!id || !key) {
    return NextResponse.json({ error: "Missing env vars" });
  }

  const params = new URLSearchParams({
    app_id: id, app_key: key,
    results_per_page: "50",
    what: "product designer",
    where: "san francisco",
  });

  const res = await fetch(`https://api.adzuna.com/v1/api/jobs/us/search/1?${params}`);
  const data = await res.json() as any;

  const raw = data.results ?? [];
  let passedTitle = 0;
  let passedLocation = 0;
  const filtered: any[] = [];
  const rejected: any[] = [];

  for (const r of raw) {
    const title = r.title ?? "";
    const location = r.location?.display_name ?? "";
    const titleOk = matchesTitle(title);
    const { include } = matchesLocation(location);
    if (titleOk) passedTitle++;
    if (titleOk && include) {
      passedLocation++;
      filtered.push({ title, company: r.company?.display_name, location });
    } else {
      rejected.push({ title, location, titleOk, locationOk: include });
    }
  }

  return NextResponse.json({
    total_from_api: raw.length,
    passed_title_filter: passedTitle,
    passed_both_filters: passedLocation,
    passing_jobs: filtered.slice(0, 5),
    rejected_jobs: rejected.slice(0, 5),
  });
}
