import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await supabase.from("jobs").upsert([{
    id: "test-adzuna-job-001",
    title: "Test Product Designer",
    company: "Test Co",
    company_slug: "test-co",
    company_domain: "test.com",
    location: "San Francisco, CA",
    url: "https://test.com",
    source: "adzuna",
    posted_at: null,
    is_remote: false,
    logo_url: null,
  }], { onConflict: "id" });

  if (error) {
    return NextResponse.json({ success: false, error: error.message, details: error });
  }

  // Clean up test row
  await supabase.from("jobs").delete().eq("id", "test-adzuna-job-001");

  return NextResponse.json({ success: true, message: "Adzuna insert works!" });
}
