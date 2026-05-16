import "server-only";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import { env } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

let _db: ReturnType<typeof createClient<Database>> | null = null;

export function db() {
  if (!_db) {
    _db = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
      realtime: { transport: ws },
    });
  }
  return _db;
}
