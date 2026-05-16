import { ok, fail } from "@/lib/server/http";
import { parseBody } from "@/app/api/_lib/handler";
import { magicLinkSchema } from "@/lib/shared/schemas/auth";
import { sendMagicLink } from "@/lib/server/auth/gotrue";
import { env } from "@/lib/env";

export async function POST(req: Request) {
  try {
    const { email } = await parseBody(req, magicLinkSchema);
    await sendMagicLink(email, `${env.NEXT_PUBLIC_APP_URL}/api/auth/callback`);
    return ok({ sent: true });
  } catch (e) { return fail(e); }
}
