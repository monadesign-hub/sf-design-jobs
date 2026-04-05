import type { Job } from "@/types";
import { normalizeJob } from "@/lib/normalize";

const SLUGS = [
  // AI / Design-forward
  "openai", "notion", "linear", "harvey", "benchling", "browserbase",
  "character", "replit", "sentry", "sierra", "sprig", "stytch", "mintlify",
  "mercor", "krea", "brainco", "snowflake", "langchain", "ramp", "railway",
  "propel", "comfy-org", "infisical", "socket", "semgrep", "twelve-labs",
  "revenuecat", "writer", "FlutterFlow", "coder", "coframe",
  // SaaS / B2B
  "retool", "loom", "pitch", "rows", "census", "polytomic", "commandbar",
  "stonly", "appcues", "userflow", "chameleon", "pendo", "fullstory", "heap",
  "logrocket", "hotjar", "maze", "usertesting", "dscout", "great-question",
  "dovetail", "productboard", "canny", "aha", "roadmunk", "orbit",
  "common-room", "catchpoint", "clerk", "nango", "trigger", "inngest",
  "resend", "loops", "customer-io", "braze", "iterable", "klaviyo",
  "attentive", "postscript",
  // More AI startups
  "mistral", "perplexity", "cognition", "anysphere", "imbue",
  "adept", "cohere", "together", "modal", "replicate",
  "huggingface", "scale", "labelbox", "humanloop", "arize",
  "weights-biases", "langfuse", "helicone", "portkey",
  // Design / Product tools
  "framer", "principle", "overflow", "zeplin", "abstract",
  "supernova", "knapsack", "specify", "tokens-studio",
  // Fintech / Crypto
  "mercury", "ramp", "brex", "puzzle", "finta", "liveblocks",
  "privy", "dynamic", "alchemy", "quicknode", "infura",
  // More SF startups
  "nooks", "persona", "socure", "alloy", "sardine", "unit21",
  "sift", "kount", "bolt", "recurly",
  // AI image / video
  "midjourney", "pika-labs", "lumalabs", "ideogram",
  "leonardoai", "stability", "runwayml", "suno",
  // More dev tools
  "turso", "supabase", "convex", "deno", "bun",
  "grafana", "posthog", "highlight", "baselime",
  // More product / ux tools
  "sprig", "maze", "dovetail", "userleap",
  "sprig", "contentsquare", "glassbox", "quantum-metric",
  // More SF companies
  "ironclad", "evisort", "spotdraft", "linkSquares",
  "abridge", "nabla", "suki", "ambience",
  "wayve", "waabi", "applied-intuition", "gatik",
];

type AshbyJob = {
  id: string;
  title: string;
  team?: { name: string };
  location?: string;
  locationName?: string;
  applyUrl?: string;
  externalLink?: string;
  publishedDate?: string;
  isRemote?: boolean;
};

type AshbyResponse = {
  jobs: AshbyJob[];
};

function getCompanyDisplayName(slug: string): string {
  const overrides: Record<string, string> = {
    openai: "OpenAI",
    FlutterFlow: "FlutterFlow",
    "comfy-org": "ComfyUI",
    "twelve-labs": "Twelve Labs",
    "together-ai": "Together AI",
  };
  return (
    overrides[slug] ??
    slug
      .split(/[-_]/)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ")
  );
}

async function fetchCompany(slug: string): Promise<Job[]> {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${slug}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "sf-design-jobs/1.0",
        Accept: "application/json",
      },
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as AshbyResponse;
    const jobs: Job[] = [];
    for (const raw of data.jobs ?? []) {
      const location =
        raw.locationName ?? raw.location ?? (raw.isRemote ? "Remote" : "");
      const applyUrl = raw.applyUrl ?? raw.externalLink ?? "";
      if (!applyUrl) continue;

      const normalized = normalizeJob({
        title: raw.title,
        company: getCompanyDisplayName(slug),
        companySlug: slug.toLowerCase(),
        location,
        url: applyUrl,
        source: "ashby",
        postedAt: raw.publishedDate ?? null,
      });
      if (normalized) jobs.push(normalized);
    }
    return jobs;
  } catch {
    return [];
  }
}

export async function fetchAshby(): Promise<Job[]> {
  const results = await Promise.allSettled(SLUGS.map(fetchCompany));
  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}
