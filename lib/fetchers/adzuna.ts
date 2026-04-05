import type { Job } from "@/types";
import { matchesTitle, matchesLocation, makeJobId, getDomain } from "@/lib/normalize";

const APP_ID  = process.env.ADZUNA_APP_ID;
const APP_KEY = process.env.ADZUNA_APP_KEY;

const QUERIES = [
  "product designer",
  "ux designer",
  "ui designer",
  "design engineer",
  "visual designer",
  "ux researcher",
];

type AdzunaResult = {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string };
  redirect_url: string;
  created: string; // ISO date
  contract_type?: string;
};

type AdzunaResponse = {
  results: AdzunaResult[];
};

async function fetchQuery(query: string): Promise<Job[]> {
  if (!APP_ID || !APP_KEY) return [];

  const jobs: Job[] = [];
  // Fetch up to 3 pages (50 results each = 150 per query)
  for (let page = 1; page <= 3; page++) {
    const params = new URLSearchParams({
      app_id: APP_ID,
      app_key: APP_KEY,
      results_per_page: "50",
      what: query,
      where: "san francisco",
      country: "us",
      "content-type": "application/json",
    });

    try {
      const res = await fetch(
        `https://api.adzuna.com/v1/api/jobs/us/search/${page}?${params}`,
        { next: { revalidate: 0 } }
      );
      if (!res.ok) break;
      const data = (await res.json()) as AdzunaResponse;
      if (!data.results?.length) break;

      for (const raw of data.results) {
        const title = raw.title ?? "";
        const company = raw.company?.display_name ?? "";
        const location = raw.location?.display_name ?? "";

        if (!matchesTitle(title)) continue;
        const { include, isRemote } = matchesLocation(location);
        if (!include) continue;

        const companySlug = company.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
        const domain = getDomain(companySlug);

        jobs.push({
          id: makeJobId("adzuna-" + companySlug, title),
          title: title.trim(),
          company: company.trim(),
          companySlug,
          companyDomain: domain,
          location: location.trim() || (isRemote ? "Remote" : "San Francisco, CA"),
          url: raw.redirect_url,
          source: "adzuna" as any,
          postedAt: raw.created ?? null,
          isRemote,
          logoUrl: `https://logo.clearbit.com/${domain}`,
        });
      }
    } catch {
      break;
    }

    await new Promise((r) => setTimeout(r, 200));
  }

  return jobs;
}

export async function fetchAdzuna(): Promise<Job[]> {
  const all: Job[] = [];
  for (const query of QUERIES) {
    const results = await fetchQuery(query);
    all.push(...results);
    await new Promise((r) => setTimeout(r, 300));
  }
  return all;
}
