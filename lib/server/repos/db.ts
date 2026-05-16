import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import ws from "ws";
import { env } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";
import type { WebSocketLikeConstructor } from "@supabase/realtime-js";

// ws is cast to WebSocketLikeConstructor because the @types/ws overload
// `new(address: null)` conflicts with the realtime interface's `new(address: string | URL)`.
// Realtime subscriptions are not used yet; the transport is supplied only to satisfy
// Node 20's missing native WebSocket at RealtimeClient construction time.
// Realtime channels will be added in Plan 2c.
const wsTransport = ws as unknown as WebSocketLikeConstructor;

let _db: SupabaseClient<Database> | null = null;

export function db() {
  if (!_db) {
    _db = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
      realtime: { transport: wsTransport },
    });
  }
  return _db;
}
