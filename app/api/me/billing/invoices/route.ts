import { ok, fail } from "@/lib/server/http";
import { requireSessionCtx } from "@/app/api/_lib/handler";
import { listInvoices } from "@/lib/server/services/billing";

export async function GET() {
  try {
    const ctx = await requireSessionCtx();
    return ok(await listInvoices(ctx.user));
  } catch (e) { return fail(e); }
}
