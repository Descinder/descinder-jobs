import { NextResponse } from 'next/server';
import { assertCronSecret } from '@/lib/server/cron-auth';
import { db } from '@/lib/server/repos/db';

const STALE_HOURS = 36;

export async function GET(req: Request) {
	try {
		assertCronSecret(req);
		const { data } = await db().from('app_settings').select('value').eq('key', 'retention_purge_last_ok').maybeSingle();
		const stampIso = (data as { value: unknown } | null)?.value as string | null | undefined;
		if (!stampIso) {
			return NextResponse.json({ ok: false, stale: true, reason: 'never_ran', ageHours: null, lastOk: null }, { status: 200 });
		}
		const ageHours = (Date.now() - new Date(stampIso).getTime()) / 3_600_000;
		const stale = ageHours > STALE_HOURS;
		return NextResponse.json({ ok: !stale, stale, ageHours, lastOk: stampIso, thresholdHours: STALE_HOURS }, { status: 200 });
	} catch (e) {
		return NextResponse.json(
			{ error: { code: 'INTERNAL', message: e instanceof Error ? e.message.slice(0, 200) : 'err' } },
			{ status: 500 },
		);
	}
}
