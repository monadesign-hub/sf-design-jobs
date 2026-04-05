import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Strip any accidental line breaks/spaces from keys (common Vercel copy-paste issue)
const clean = (s?: string) => s?.replace(/\s+/g, "") ?? "";
const supabaseServiceKey =
  clean(process.env.SUPABASE_SERVICE_ROLE_KEY) ||
  clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Server-side client (uses service role key for cron writes)
export const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Public read-only client for the API route
export const supabasePublic = createClient(
  supabaseUrl,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
