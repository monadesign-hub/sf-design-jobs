-- Run this in your Supabase project → SQL Editor

-- ----------------------------------------------------------------
-- Jobs table
-- ----------------------------------------------------------------
create table if not exists jobs (
  id              text primary key,
  title           text not null,
  company         text not null,
  company_slug    text not null,
  company_domain  text not null,
  location        text not null,
  url             text not null,
  source          text not null check (source in ('greenhouse', 'ashby', 'lever')),
  posted_at       timestamptz,
  is_remote       boolean not null default false,
  logo_url        text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Index for common sort/filter patterns
create index if not exists jobs_posted_at_idx   on jobs (posted_at desc nulls last);
create index if not exists jobs_company_idx     on jobs (company asc);
create index if not exists jobs_is_remote_idx   on jobs (is_remote);
create index if not exists jobs_source_idx      on jobs (source);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger jobs_updated_at
  before update on jobs
  for each row execute function update_updated_at();

-- ----------------------------------------------------------------
-- Refresh metadata table
-- ----------------------------------------------------------------
create table if not exists refresh_meta (
  id            int primary key,
  last_updated  timestamptz not null default now()
);

-- Seed the meta row
insert into refresh_meta (id, last_updated)
values (1, now())
on conflict (id) do nothing;

-- ----------------------------------------------------------------
-- Row Level Security — read-only public access
-- ----------------------------------------------------------------
alter table jobs enable row level security;
alter table refresh_meta enable row level security;

-- Anyone can read jobs
create policy "Public read jobs"
  on jobs for select
  using (true);

-- Anyone can read refresh_meta
create policy "Public read refresh_meta"
  on refresh_meta for select
  using (true);

-- Only service role can write (enforced by using service key in cron route)
