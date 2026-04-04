import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { fetchGreenhouse } from "@/lib/fetchers/greenhouse";
import { fetchAshby } from "@/lib/fetchers/ashby";
import { fetchLever } from "@/lib/fetchers/lever";
import { fetchWellfound } from "@/lib/fetchers/wellfound";
import { fetchMeta } from "@/lib/fetchers/meta";
import { deduplicateJobs } from "@/lib/normalize";
import type { Job } from "@/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min — Vercel Pro / Fluid

export async function GET(req: NextRequest) {
  return handleRefresh(req);
}

export async function POST(req: NextRequest) {
  return handleRefresh(req);
}

async function handleRefresh(req: NextRequest) {
  // Auth check — Vercel cron sends Authorization: Bearer <CRON_SECRET>
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (token !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  console.log("[cron/refresh] Starting fetch from all ATS sources…");

  const [greenhouse, ashby, lever, wellfound, meta] = await Promise.allSettled([
    fetchGreenhouse(),
    fetchAshby(),
    fetchLever(),
    fetchWellfound(),
    fetchMeta(),
  ]);

  const allJobs: Job[] = [
    ...(greenhouse.status === "fulfilled" ? greenhouse.value : []),
    ...(ashby.status === "fulfilled" ? ashby.value : []),
    ...(lever.status === "fulfilled" ? lever.value : []),
    ...(wellfound.status === "fulfilled" ? wellfound.value : []),
    ...(meta.status === "fulfilled" ? meta.value : []),
  ];

  const jobs = deduplicateJobs(allJobs);
  console.log(`[cron/refresh] ${jobs.length} unique jobs after dedup`);

  if (jobs.length === 0) {
    return NextResponse.json({ message: "No jobs found", inserted: 0 });
  }

  // Upsert all jobs
  const rows = jobs.map((job) => ({
    id: job.id,
    title: job.title,
    company: job.company,
    company_slug: job.companySlug,
    company_domain: job.companyDomain,
    location: job.location,
    url: job.url,
    source: job.source,
    posted_at: job.postedAt,
    is_remote: job.isRemote,
    logo_url: job.logoUrl ?? null,
  }));

  const { error: upsertError } = await supabase
    .from("jobs")
    .upsert(rows, { onConflict: "id" });

  if (upsertError) {
    console.error("[cron/refresh] Upsert error:", upsertError);
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  // Remove stale jobs (not returned in this fetch = likely closed)
  const freshIds = jobs.map((j) => j.id);
  const { error: deleteError } = await supabase
    .from("jobs")
    .delete()
    .not("id", "in", `(${freshIds.join(",")})`);

  if (deleteError) {
    console.warn("[cron/refresh] Delete stale error:", deleteError.message);
  }

  // Update refresh_meta timestamp
  await supabase
    .from("refresh_meta")
    .upsert({ id: 1, last_updated: new Date().toISOString() });

  return NextResponse.json({
    message: "Refresh complete",
    inserted: jobs.length,
    sources: {
      greenhouse: greenhouse.status === "fulfilled" ? greenhouse.value.length : "error",
      ashby:      ashby.status === "fulfilled" ? ashby.value.length : "error",
      lever:      lever.status === "fulfilled" ? lever.value.length : "error",
      wellfound:  wellfound.status === "fulfilled" ? wellfound.value.length : "error",
      meta:       meta.status === "fulfilled" ? meta.value.length : "error",
    },
  });
}
