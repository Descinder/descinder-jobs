import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { event_type, policy_version, metadata } = body as {
    event_type: string;
    policy_version?: string;
    metadata?: Record<string, unknown>;
  };

  const allowed = ["terms_accepted", "privacy_accepted", "marketing_opt_in", "cookie_analytics_opt_in"];
  if (!allowed.includes(event_type)) {
    return NextResponse.json({ error: "invalid event_type" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.from("consent_log").insert({
    user_id: user?.id ?? null,
    event_type: event_type as "terms_accepted" | "privacy_accepted" | "marketing_opt_in" | "cookie_analytics_opt_in",
    policy_version: policy_version ?? null,
    metadata: (metadata ?? null) as any,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
