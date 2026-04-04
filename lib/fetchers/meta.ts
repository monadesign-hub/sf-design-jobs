import type { Job } from "@/types";
import { matchesTitle, matchesLocation, makeJobId } from "@/lib/normalize";

export async function fetchMeta(): Promise<Job[]> {
  try {
    const res = await fetch(
      "https://www.metacareers.com/jobs/?q=designer&location[0]=San+Francisco%2C+CA&results_per_page=20&is_filled=0",
      {
        headers: {
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "User-Agent": "sf-design-jobs/1.0",
        },
        next: { revalidate: 0 },
      }
    );
    if (!res.ok) return [];
    const d = await res.json();

    const jobs: Job[] = [];
    for (const j of d.data ?? d.jobs ?? []) {
      const title    = j.title ?? "";
      const location = Array.isArray(j.locations)
        ? j.locations.join(", ")
        : j.locations ?? "";

      if (!matchesTitle(title)) continue;
      const { include, isRemote } = matchesLocation(location || "San Francisco");
      if (!include) continue;

      jobs.push({
        id: makeJobId("meta", title),
        title: title.trim(),
        company: "Meta",
        companySlug: "meta",
        companyDomain: "meta.com",
        location: location || "Menlo Park, CA",
        url: j.apply_url ?? j.url ?? `https://www.metacareers.com/jobs/${j.id ?? ""}`,
        source: "meta" as any,
        postedAt: j.created_time ?? j.posted_date ?? null,
        isRemote,
        logoUrl: "https://logo.clearbit.com/meta.com",
      });
    }
    return jobs;
  } catch {
    return [];
  }
}
