import type { Job } from "@/types";
import { matchesTitle, matchesLocation, makeJobId, getDomain } from "@/lib/normalize";

export async function fetchWellfound(): Promise<Job[]> {
  try {
    const res = await fetch(
      "https://wellfound.com/jobs?role_types[]=product-designer&role_types[]=ux-designer&location_type=city&locations[]=San+Francisco+Bay+Area&remote=true",
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
    for (const j of d.jobs ?? d.startupRoles ?? []) {
      const title   = j.title ?? j.role_type_display ?? "";
      const company = j.startup?.name ?? j.company_name ?? "Unknown";
      const slug    = (j.startup?.slug ?? company).toLowerCase().replace(/\s+/g, "-");
      const location = j.location_display ?? j.location ?? "";

      if (!matchesTitle(title)) continue;
      const { include, isRemote } = matchesLocation(location || "San Francisco");
      if (!include) continue;

      const domain = getDomain(slug);
      jobs.push({
        id: makeJobId("wf-" + slug, title),
        title: title.trim(),
        company: company.trim(),
        companySlug: slug,
        companyDomain: domain,
        location: location || "San Francisco, CA",
        url: j.apply_url ?? j.job_url ?? "https://wellfound.com/jobs",
        source: "wellfound" as any,
        postedAt: j.created_at ?? j.published_at ?? null,
        isRemote,
        logoUrl: j.startup?.logo_url ?? `https://logo.clearbit.com/${domain}`,
      });
    }
    return jobs;
  } catch {
    return [];
  }
}
