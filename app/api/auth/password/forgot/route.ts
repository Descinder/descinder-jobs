import { ok, fail } from "@/lib/server/http";
import { parseBody } from "@/app/api/_lib/handler";
import { forgotSchema } from "@/lib/shared/schemas/auth";
import { sendPasswordReset } from "@/lib/server/auth/gotrue";
import { env } from "@/lib/env";
import { rateLimitIp } from "@/lib/server/rate-ip";

export async function POST(req: Request) {
  try {
    await rateLimitIp(req, "auth_forgot", 10, 3600); // 10 / hr / IP — enumeration/spam guard
    const { email } = await parseBody(req, forgotSchema);
    await sendPasswordReset(email, `${env.NEXT_PUBLIC_APP_URL}/api/auth/callback?type=recovery`);
    return ok({ sent: true });
  } catch (e) { return fail(e); }
}
