import type { Job } from "@/types";
import { normalizeJob } from "@/lib/normalize";

const SLUGS = [
  // AI / Design-forward
  "airbnb", "figma", "notion", "stripe", "anthropic", "databricks",
  "airtable", "asana", "brex", "coinbase", "datadog", "duolingo",
  "faire", "fivetran", "glean", "gusto", "hex", "heygen", "hightouch",
  "hubspot", "klaviyo", "launchdarkly", "lyft", "pinterest", "reddit",
  "replit", "runway", "scaleai", "squarespace", "vercel", "waymo",
  "webflow", "xai", "udio", "together-ai", "typeface",
  // SaaS / B2B
  "zendesk", "twilio", "segment", "miro", "dropbox", "docusign", "okta",
  "cloudflare", "pagerduty", "elastic", "mongodb", "confluent", "amplitude",
  "mixpanel", "intercom", "outreach", "salesloft", "gong", "drift", "carta",
  "rippling", "lattice", "leapsome", "greenhouse", "lever", "workato",
  "zapier", "retool", "loom", "coda", "linear", "front", "mercury",
  "pilot", "digits", "finch", "remote", "deel", "expensify", "bill",
  "ironclad", "contractbook", "juro",
  // Fintech
  "robinhood", "chime", "affirm", "plaid", "marqeta", "nerdwallet",
  "betterment", "wealthfront", "sofi", "blend", "opendoor", "fundrise",
  "credible", "greenlight", "deserve", "unit", "lithic", "column",
  // Enterprise / Cloud
  "salesforce", "oracle", "servicenow", "workday", "box", "splunk",
  "newrelic", "sumo-logic", "looker", "domo", "thoughtspot", "sigma",
  "alation", "atscale", "metabase",
  // Dev tools / Infrastructure
  "hashicorp", "circleci", "netlify", "render", "railway", "fly",
  "neon", "planetscale", "cockroachdb", "timescale", "hasura",
  "appsmith", "budibase", "n8n", "pipedream",
  // Consumer / Social
  "nextdoor", "thumbtack", "taskus", "gopuff", "instacart",
  "doordash", "whatnot", "offerpad", "hippo", "lemonade",
  // Health / Bio
  "modernhealth", "cerebral", "headspace", "calm", "noom",
  "hims", "ro", "carbon-health", "devoted", "arcadia",
  // HR / People tools
  "lattice", "rippling", "namely", "bamboohr", "paychex",
  "justworks", "gusto", "sequoia", "pave", "levelsai",
  // Security
  "crowdstrike", "lacework", "orca-security", "snyk", "aquasecurity",
  "wiz", "cybereason", "exabeam", "hunters",
  // Other SF tech
  "lyra", "lob", "golinks", "vanta", "drata",
  "secureframe", "tugboat",
  // Big tech & unicorns
  "uber", "slack", "zoom", "canva", "mural", "samsara",
  "surveymonkey", "medallia", "gainsight", "qualtrics",
  "smartsheet", "clickup", "mondaydotcom", "wrike",
  "figma", "invision", "abstract",
  // More consumer & marketplace
  "eventbrite", "stubhub", "viagogo", "seatgeek",
  "rover", "wag", "pawp", "hippo",
  "houzz", "hopin", "houseparty",
  // More SF startups
  "pilot-com", "mercury", "ramp", "brex",
  "drata", "secureframe", "laika", "hypercomply",
  "oneleet", "sprinto", "scytale",
  // Logistics / Ops
  "flexport", "shipbob", "easypost", "shippo",
  "stord", "loadsmart", "convoy", "transfix",
  // edTech
  "coursera", "udemy", "masterclass", "outschool",
  "khan-academy", "chegg", "turnitin", "instructure",
  // More AI
  "cohere", "together", "modal", "replicate",
  "weights-biases", "scale", "labelbox",
  "midjourney", "stability", "pika",
];

type GreenHouseJob = {
  id: number;
  title: string;
  location: { name: string };
  absolute_url: string;
  updated_at?: string;
};

async function fetchCompany(slug: string): Promise<Job[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "sf-design-jobs/1.0" },
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { jobs: GreenHouseJob[] };
    const jobs: Job[] = [];
    for (const raw of data.jobs ?? []) {
      const normalized = normalizeJob({
        title: raw.title,
        company: slug.charAt(0).toUpperCase() + slug.slice(1),
        companySlug: slug,
        location: raw.location?.name ?? "",
        url: raw.absolute_url,
        source: "greenhouse",
        postedAt: raw.updated_at ?? null,
      });
      if (normalized) jobs.push(normalized);
    }
    return jobs;
  } catch {
    return [];
  }
}

export async function fetchGreenhouse(): Promise<Job[]> {
  const all: Job[] = [];
  for (const slug of SLUGS) {
    const jobs = await fetchCompany(slug);
    all.push(...jobs);
    // Rate-limit courtesy delay
    await new Promise((r) => setTimeout(r, 120));
  }
  return all;
}
