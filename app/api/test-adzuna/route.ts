import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const id  = process.env.ADZUNA_APP_ID;
  const key = process.env.ADZUNA_APP_KEY;

  if (!id || !key) {
    return NextResponse.json({ error: "Missing ADZUNA_APP_ID or ADZUNA_APP_KEY — check Vercel env vars" });
  }

  const params = new URLSearchParams({
    app_id: id, app_key: key,
    results_per_page: "3",
    what: "product designer",
    where: "san francisco",
  });

  const res = await fetch(`https://api.adzuna.com/v1/api/jobs/us/search/1?${params}`);
  const data = await res.json() as any;

  return NextResponse.json({
    env_vars_set: true,
    total_available: data.count,
    sample: data.results?.slice(0, 3).map((r: any) => ({
      title: r.title,
      company: r.company?.display_name,
      location: r.location?.display_name,
    })),
  });
}
