"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  Job,
  JobsApiResponse,
  LocationFilter,
  SeniorityFilter,
  SortDir,
  SortField,
} from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 0) return "Today";
  const d = Math.floor(diffMs / 86400000);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d}d ago`;
  if (d < 35) return `${Math.floor(d / 7)}w ago`;
  return "5w+ ago";
}

function isNew(iso: string | null): boolean {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < 86400000;
}

function humanDateTime(iso: string | null): string {
  if (!iso) return "never";
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

function SourceBadge({ source }: { source: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    greenhouse: { label: "GH",   cls: "badge badge-greenhouse" },
    ashby:      { label: "AB",   cls: "badge badge-ashby" },
    lever:      { label: "LV",   cls: "badge badge-lever" },
    direct:     { label: "CO",   cls: "badge badge-direct" },
    wellfound:  { label: "WF",   cls: "badge badge-direct" },
    meta:       { label: "META", cls: "badge badge-ashby" },
  };
  const { label, cls } = map[source] ?? { label: source.toUpperCase().slice(0,2), cls: "badge badge-direct" };
  return <span className={cls}>{label}</span>;
}

function CompanyLogo({ job }: { job: Job }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="logo-wrap">
      {failed || !job.logoUrl ? (
        <span className="logo-fallback">{job.company.charAt(0)}</span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={job.logoUrl} alt={job.company} width={22} height={22}
          onError={() => setFailed(true)} />
      )}
    </span>
  );
}

function SortIcon({ field, sort, dir }: { field: SortField; sort: SortField; dir: SortDir }) {
  if (sort !== field) return <span style={{ color: "#d1d5db" }}> ↕</span>;
  return <span>{dir === "asc" ? " ↑" : " ↓"}</span>;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HomePage() {
  const [jobs, setJobs]               = useState<Job[]>([]);
  const [total, setTotal]             = useState(0);
  const [companies, setCompanies]     = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const [location, setLocation]   = useState<LocationFilter>("all");
  const [seniority, setSeniority] = useState<SeniorityFilter>("all");
  const [sort, setSort]           = useState<SortField>("postedAt");
  const [dir, setDir]             = useState<SortDir>("desc");

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    // Don't clear jobs while filtering — keeps table stable
    try {
      const params = new URLSearchParams({ location, seniority, sort, dir });
      const res = await fetch(`/api/jobs?${params}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API error ${res.status}: ${text.slice(0, 200)}`);
      }
      const data: JobsApiResponse = await res.json();
      setJobs(data.jobs);
      setTotal(data.total);
      setCompanies(data.companies);
      setLastUpdated(data.lastUpdated);
      // Only auto-refresh on first load when DB is completely empty
      const isDefaultFilters = location === "all" && seniority === "all";
      if (data.total === 0 && isDefaultFilters && !refreshing) triggerRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, seniority, sort, dir]);

  async function triggerRefresh() {
    setRefreshing(true);
    try {
      await fetch("/api/cron/refresh", { method: "POST" });
      await fetchJobs();
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  function handleSort(field: SortField) {
    if (sort === field) setDir(d => d === "asc" ? "desc" : "asc");
    else { setSort(field); setDir(field === "postedAt" ? "desc" : "asc"); }
  }

  return (
    <div style={{ minHeight: "100vh" }}>

      {/* ── Header ──────────────────��────────────────────────────── */}
      <header className="site-header">
        <div className="header-inner">
          <div className="header-top">
            <div className="header-brand">
              <div className="header-dot" />
              <h1>SF Design Jobs</h1>
              <div className="header-divider" />
              <span className="subtitle">Product design roles · San Francisco Bay Area</span>
            </div>
            <div className="stat" suppressHydrationWarning style={{ opacity: loading || refreshing ? 0.4 : 1, transition: "opacity 0.2s" }}>
              <span className="stat-num" suppressHydrationWarning>{total}</span>
              <span className="stat-label" suppressHydrationWarning>positions at {companies} companies</span>
            </div>
          </div>

          {/* Filter bar */}
          <div className="filter-bar">
            <div className="filter-group">
              {(["all","remote","sf"] as LocationFilter[]).map((val) => (
                <button key={val}
                  className={`filter-btn ${location === val ? "active" : ""}`}
                  onClick={() => setLocation(val)}>
                  {val === "all" ? "All" : val === "remote" ? "Remote OK" : "SF Only"}
                </button>
              ))}
            </div>
            <div className="filter-group">
              {([
                { val: "all", label: "All Levels" },
                { val: "junior", label: "Junior" },
                { val: "mid", label: "Mid-Level" },
                { val: "senior", label: "Senior" },
                { val: "staff", label: "Staff" },
                { val: "lead", label: "Lead" },
                { val: "manager", label: "Manager" },
              ] as { val: SeniorityFilter; label: string }[]).map(({ val, label }) => (
                <button key={val}
                  className={`filter-btn ${seniority === val ? "active" : ""}`}
                  onClick={() => setSeniority(val)}>
                  {label}
                </button>
              ))}
            </div>
            <button className="refresh-btn" onClick={() => triggerRefresh()} disabled={refreshing}>
              {refreshing ? "Refreshing…" : "↻ Refresh"}
            </button>
          </div>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: loading || refreshing ? "60%" : "0%" }} />
        </div>
      </header>

      {/* ── Table ────────────────────────────────────────────────── */}
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 28px 0" }}>
        {error ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "#dc2626", fontFamily: "monospace", fontSize: 13 }}>
            <div style={{ marginBottom: 8 }}>⚠ {error}</div>
            <div style={{ color: "#6b7280", fontSize: 12 }}>
              Check your .env.local has all 4 Supabase values, then restart npm run dev
            </div>
          </div>
        ) : loading && !refreshing && jobs.length === 0 ? (
          <div style={{ padding: "80px 0", textAlign: "center", fontFamily: "var(--mono)", fontSize: 13, color: "var(--muted2)" }}>
            Loading…
          </div>
        ) : refreshing && jobs.length === 0 ? (
          <div style={{ padding: "80px 0", textAlign: "center", fontFamily: "var(--mono)", fontSize: 13, color: "var(--muted2)" }}>
            <div>Fetching jobs from all sources…</div>
            <div style={{ fontSize: 11, opacity: 0.6, marginTop: 6 }}>First load can take ~30s</div>
          </div>
        ) : jobs.length === 0 ? (
          <div style={{ padding: "80px 0", textAlign: "center", fontFamily: "var(--mono)", fontSize: 13, color: "var(--muted2)" }}>
            No jobs found for these filters.
          </div>
        ) : (
          <div className="table-card" style={{ opacity: loading ? 0.5 : 1, transition: "opacity 0.2s" }}>
            <div style={{ overflowX: "auto" }}>
              <table className="jobs-table">
                <thead>
                  <tr>
                    <th className="sortable" style={{ width: "22%" }} onClick={() => handleSort("company")}>
                      Company <SortIcon field="company" sort={sort} dir={dir} />
                    </th>
                    <th style={{ width: "36%" }}>Role</th>
                    <th className="col-location" style={{ width: "18%" }}>Location</th>
                    <th className="sortable col-posted" style={{ width: "10%" }} onClick={() => handleSort("postedAt")}>
                      Posted <SortIcon field="postedAt" sort={sort} dir={dir} />
                    </th>
                    <th style={{ width: "10%", textAlign: "right" }} />
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <CompanyLogo job={job} />
                          <span style={{ fontWeight: 500, fontSize: 13.5 }}>{job.company}</span>
                          <SourceBadge source={job.source} />
                        </div>
                        <span className="mobile-sub">{job.location} · {relativeTime(job.postedAt)}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: 13.5 }}>{job.title}</span>
                        {isNew(job.postedAt) && <span className="badge badge-new">NEW</span>}
                        {job.isRemote && <span className="badge badge-remote">Remote</span>}
                      </td>
                      <td className="col-location">{job.location}</td>
                      <td className="col-posted">{relativeTime(job.postedAt)}</td>
                      <td style={{ textAlign: "right" }}>
                        <a href={job.url} target="_blank" rel="noopener noreferrer" className="apply-btn">
                          Apply →
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="site-footer">
        <span>Last updated: {humanDateTime(lastUpdated)} · {total} total roles</span>
        <span>Built with ♥ · Greenhouse · Ashby · Lever · Wellfound · Meta</span>
      </footer>
    </div>
  );
}
