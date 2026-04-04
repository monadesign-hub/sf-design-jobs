import crypto from "crypto";
import type { Job, JobSource } from "@/types";

// ---------------------------------------------------------------------------
// Title keywords — match any (case-insensitive)
// ---------------------------------------------------------------------------
const TITLE_KEYWORDS = [
  "product designer",
  "ux designer",
  "ui designer",
  "design engineer",
  "brand designer",
  "visual designer",
  "ux researcher",
  "content designer",
  "motion designer",
  "design lead",
  "design manager",
];

// ---------------------------------------------------------------------------
// Location allow-list
// ---------------------------------------------------------------------------
const SF_TERMS = [
  "san francisco",
  " sf ",
  "sf,",
  "(sf)",
  "bay area",
  "oakland",
  "san jose",
  "palo alto",
  "mountain view",
  "menlo park",
  "redwood city",
  "sunnyvale",
  "foster city",
  "berkeley",
  "emeryville",
  "san mateo",
  "santa clara",
];

const REMOTE_TERMS = ["remote"];

// Clearly non-US / non-Bay-Area terms to reject (unless also has SF term)
const EXCLUDE_TERMS = [
  "london",
  "warsaw",
  "beijing",
  "stockholm",
  "toronto",
  "berlin",
  "paris",
  "amsterdam",
  "sydney",
  "singapore",
  "dublin",
  "bangalore",
  "hyderabad",
  "mexico city",
];

export function matchesTitle(title: string): boolean {
  const lower = title.toLowerCase();
  return TITLE_KEYWORDS.some((kw) => lower.includes(kw));
}

export function matchesLocation(location: string): {
  include: boolean;
  isRemote: boolean;
} {
  const lower = " " + location.toLowerCase() + " ";

  const hasSfTerm = SF_TERMS.some((t) => lower.includes(t));
  const hasRemote = REMOTE_TERMS.some((t) => lower.includes(t));
  const hasExclude = EXCLUDE_TERMS.some((t) => lower.includes(t));

  // Remote-US: include if "remote" appears and no excluded foreign city
  // (or it ALSO has a SF term which overrides the exclusion)
  if (hasRemote && !hasExclude) return { include: true, isRemote: true };
  if (hasRemote && hasSfTerm) return { include: true, isRemote: true };
  if (hasSfTerm && !hasExclude) return { include: true, isRemote: false };
  if (hasSfTerm) return { include: true, isRemote: false }; // SF wins over foreign

  return { include: false, isRemote: false };
}

export function makeJobId(companySlug: string, title: string): string {
  const key = `${companySlug}::${title.toLowerCase().trim()}`;
  return crypto.createHash("sha256").update(key).digest("hex").slice(0, 16);
}

/** Best-effort domain from a known company slug */
const DOMAIN_OVERRIDES: Record<string, string> = {
  airbnb: "airbnb.com",
  figma: "figma.com",
  notion: "notion.so",
  stripe: "stripe.com",
  anthropic: "anthropic.com",
  openai: "openai.com",
  databricks: "databricks.com",
  airtable: "airtable.com",
  asana: "asana.com",
  brex: "brex.com",
  coinbase: "coinbase.com",
  datadog: "datadoghq.com",
  duolingo: "duolingo.com",
  faire: "faire.com",
  fivetran: "fivetran.com",
  glean: "glean.com",
  gusto: "gusto.com",
  hex: "hex.tech",
  heygen: "heygen.com",
  hightouch: "hightouch.com",
  hubspot: "hubspot.com",
  klaviyo: "klaviyo.com",
  launchdarkly: "launchdarkly.com",
  lyft: "lyft.com",
  pinterest: "pinterest.com",
  reddit: "reddit.com",
  replit: "replit.com",
  runway: "runwayml.com",
  scaleai: "scale.com",
  squarespace: "squarespace.com",
  vercel: "vercel.com",
  waymo: "waymo.com",
  webflow: "webflow.com",
  xai: "x.ai",
  udio: "udio.com",
  "together-ai": "together.ai",
  typeface: "typeface.ai",
  linear: "linear.app",
  harvey: "harvey.ai",
  benchling: "benchling.com",
  browserbase: "browserbase.com",
  character: "character.ai",
  sentry: "sentry.io",
  sierra: "sierra.ai",
  sprig: "sprig.com",
  stytch: "stytch.com",
  mintlify: "mintlify.com",
  mercor: "mercor.com",
  krea: "krea.ai",
  snowflake: "snowflake.com",
  langchain: "langchain.com",
  ramp: "ramp.com",
  railway: "railway.app",
  plaid: "plaid.com",
  palantir: "palantir.com",
  zoox: "zoox.com",
  logrocket: "logrocket.com",
  writer: "writer.com",
  FlutterFlow: "flutterflow.io",
  flutterflow: "flutterflow.io",
  coder: "coder.com",
};

export function getDomain(slug: string): string {
  return DOMAIN_OVERRIDES[slug] ?? `${slug}.com`;
}

export function normalizeJob(params: {
  title: string;
  company: string;
  companySlug: string;
  location: string;
  url: string;
  source: JobSource;
  postedAt: string | null;
}): Job | null {
  const { title, company, companySlug, location, url, source, postedAt } =
    params;

  if (!matchesTitle(title)) return null;

  const { include, isRemote } = matchesLocation(location);
  if (!include) return null;

  const domain = getDomain(companySlug);

  return {
    id: makeJobId(companySlug, title),
    title: title.trim(),
    company: company.trim(),
    companySlug,
    companyDomain: domain,
    location: location.trim() || (isRemote ? "Remote" : "San Francisco, CA"),
    url,
    source,
    postedAt,
    isRemote,
    logoUrl: `https://logo.clearbit.com/${domain}`,
  };
}

/** Deduplicate by id, keeping the most recent postedAt */
export function deduplicateJobs(jobs: Job[]): Job[] {
  const map = new Map<string, Job>();
  for (const job of jobs) {
    const existing = map.get(job.id);
    if (!existing) {
      map.set(job.id, job);
    } else {
      // Keep whichever has a newer/defined postedAt
      if (
        job.postedAt &&
        (!existing.postedAt || job.postedAt > existing.postedAt)
      ) {
        map.set(job.id, job);
      }
    }
  }
  return Array.from(map.values());
}
