import type { Job } from "@/types";
import { normalizeJob } from "@/lib/normalize";

const SLUGS = [
  // original
  "plaid", "palantir", "zoox", "contentsquare", "fullscript", "logrocket",
  "padsplit", "skio", "xsolla", "trellis",
  // SaaS / B2B
  "mimecast", "namely", "reflektive", "betterworks", "15five", "cultureamp",
  "lattice", "small-improvements", "leapsome", "engagedly", "kazoo",
  "clearbit", "zoominfo", "apollo", "outreach", "salesloft", "groove",
  "mixmax", "yesware", "cirrus-insight", "dooly", "clari", "gong",
];

type LeverPosting = {
  id: string;
  text: string; // title
  hostedUrl: string;
  applyUrl?: string;
  categories?: {
    location?: string;
    commitment?: string;
    team?: string;
  };
  createdAt?: number; // unix ms
};

function getCompanyDisplayName(slug: string): string {
  const overrides: Record<string, string> = {
    logrocket: "LogRocket",
    padsplit: "PadSplit",
    contentsquare: "Contentsquare",
  };
  return (
    overrides[slug] ??
    slug.charAt(0).toUpperCase() + slug.slice(1)
  );
}

async function fetchCompany(slug: string): Promise<Job[]> {
  const url = `https://api.lever.co/v0/postings/${slug}?mode=json`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "sf-design-jobs/1.0" },
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as LeverPosting[];
    const jobs: Job[] = [];
    for (const raw of Array.isArray(data) ? data : []) {
      const location = raw.categories?.location ?? "";
      const applyUrl = raw.applyUrl ?? raw.hostedUrl;
      const postedAt = raw.createdAt
        ? new Date(raw.createdAt).toISOString()
        : null;

      const normalized = normalizeJob({
        title: raw.text,
        company: getCompanyDisplayName(slug),
        companySlug: slug,
        location,
        url: applyUrl,
        source: "lever",
        postedAt,
      });
      if (normalized) jobs.push(normalized);
    }
    return jobs;
  } catch {
    return [];
  }
}

export async function fetchLever(): Promise<Job[]> {
  const all: Job[] = [];
  for (const slug of SLUGS) {
    const jobs = await fetchCompany(slug);
    all.push(...jobs);
    await new Promise((r) => setTimeout(r, 120));
  }
  return all;
}
