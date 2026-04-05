export type JobSource = "greenhouse" | "ashby" | "lever";

export type Job = {
  id: string;
  title: string;
  company: string;
  companySlug: string;
  companyDomain: string;
  location: string;
  url: string;
  source: JobSource;
  postedAt: string | null;  // ISO string — real date from ATS
  firstSeen: string | null; // ISO string — when we first scraped this job
  isRemote: boolean;
  logoUrl?: string;
};

export type SortField = "company" | "postedAt";
export type SortDir = "asc" | "desc";
export type LocationFilter = "all" | "remote" | "sf";
export type SeniorityFilter = "all" | "senior" | "staff" | "lead" | "manager";

export type JobsApiResponse = {
  jobs: Job[];
  total: number;
  companies: number;
  lastUpdated: string | null;
};
