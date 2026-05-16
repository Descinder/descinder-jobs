import { NextResponse } from "next/server";
import { fail } from "@/lib/server/http";
import { requireSessionCtx } from "@/app/api/_lib/handler";
import { invoicePdf } from "@/lib/server/services/billing";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSessionCtx();
    const { id } = await ctx.params;
    const { body } = await invoicePdf(session.user, id);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="invoice-${id}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) { return fail(e); }
}
