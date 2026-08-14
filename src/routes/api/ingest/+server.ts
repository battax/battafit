import { json, error, type RequestHandler } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { dailyMetrics, workouts, workoutSamples, sleepSessions, ingestRuns } from '$lib/server/db/schema';
import { tokensMatch } from '$lib/server/auth';

/**
 * Riceve i dati già aggregati dalla CLI di ingest.
 *
 * La CLI spedisce più batch per la stessa "run": il primo arriva senza `runId`,
 * la risposta ne restituisce uno e i successivi lo rimandano indietro, così lo
 * storico delle importazioni resta una riga sola. Tutte le scritture sono
 * upsert su chiave naturale: rieseguire l'import degli stessi giorni aggiorna
 * i valori invece di duplicarli.
 */

interface DayRow {
	day: string;
	metric: string;
	sum?: number | null;
	avg?: number | null;
	min?: number | null;
	max?: number | null;
	last?: number | null;
	count?: number;
	unit?: string | null;
}

interface WorkoutRow {
	id: string;
	type: string;
	day: string;
	startedAt: string;
	endedAt: string;
	durationSec: number;
	energyKcal?: number | null;
	distanceKm?: number | null;
	avgHr?: number | null;
	maxHr?: number | null;
	elevationM?: number | null;
	indoor?: boolean;
	source?: string | null;
	route?: [number, number, number | null, number][] | null;
	routeBbox?: [number, number, number, number] | null;
}

interface SleepRow {
	id: string;
	day: string;
	startedAt: string;
	endedAt: string;
	inBedSec?: number | null;
	asleepSec?: number | null;
	deepSec?: number | null;
	coreSec?: number | null;
	remSec?: number | null;
	awakeSec?: number | null;
	source?: string | null;
}

interface Payload {
	runId?: number;
	source?: string;
	recordsRead?: number;
	days?: DayRow[];
	workouts?: WorkoutRow[];
	samples?: { workoutId: string; offsetSec: number; bpm: number }[];
	sleep?: SleepRow[];
	/** Ultimo batch: chiude la run e ne registra la conclusione. */
	done?: boolean;
	note?: string;
}

/** Postgres ammette 65535 parametri per statement: spezziamo per stare larghi. */
function chunk<T>(rows: T[], size: number): T[][] {
	const out: T[][] = [];
	for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
	return out;
}

export const POST: RequestHandler = async ({ request }) => {
	if (!env.INGEST_TOKEN) error(500, 'INGEST_TOKEN non configurato sul server');

	const auth = request.headers.get('authorization') ?? '';
	if (!tokensMatch(auth.replace(/^Bearer\s+/i, ''), env.INGEST_TOKEN)) error(401, 'Token di ingest non valido');

	const body = (await request.json()) as Payload;

	let runId = body.runId;
	if (!runId) {
		const [run] = await db
			.insert(ingestRuns)
			.values({ source: body.source ?? 'sconosciuta' })
			.returning({ id: ingestRuns.id });
		runId = run.id;
	}

	let daysWritten = 0;
	let workoutsWritten = 0;
	let sleepWritten = 0;

	if (body.days?.length) {
		for (const batch of chunk(body.days, 1000)) {
			await db
				.insert(dailyMetrics)
				.values(
					batch.map((d) => ({
						day: d.day,
						metric: d.metric,
						sum: d.sum ?? null,
						avg: d.avg ?? null,
						min: d.min ?? null,
						max: d.max ?? null,
						last: d.last ?? null,
						count: d.count ?? 0,
						unit: d.unit ?? null
					}))
				)
				.onConflictDoUpdate({
					target: [dailyMetrics.day, dailyMetrics.metric],
					set: {
						sum: sql`excluded.sum`,
						avg: sql`excluded.avg`,
						min: sql`excluded.min`,
						max: sql`excluded.max`,
						last: sql`excluded.last`,
						count: sql`excluded.count`,
						unit: sql`excluded.unit`
					}
				});
			daysWritten += batch.length;
		}
	}

	if (body.workouts?.length) {
		for (const batch of chunk(body.workouts, 200)) {
			await db
				.insert(workouts)
				.values(
					batch.map((w) => ({
						...w,
						startedAt: new Date(w.startedAt),
						endedAt: new Date(w.endedAt),
						indoor: w.indoor ?? false,
						route: w.route ?? null,
						routeBbox: w.routeBbox ?? null
					}))
				)
				.onConflictDoUpdate({
					target: workouts.id,
					set: {
						type: sql`excluded.type`,
						day: sql`excluded.day`,
						startedAt: sql`excluded.started_at`,
						endedAt: sql`excluded.ended_at`,
						durationSec: sql`excluded.duration_sec`,
						energyKcal: sql`excluded.energy_kcal`,
						distanceKm: sql`excluded.distance_km`,
						avgHr: sql`excluded.avg_hr`,
						maxHr: sql`excluded.max_hr`,
						elevationM: sql`excluded.elevation_m`,
						indoor: sql`excluded.indoor`,
						source: sql`excluded.source`,
						route: sql`excluded.route`,
						routeBbox: sql`excluded.route_bbox`
					}
				});
			workoutsWritten += batch.length;
		}
	}

	if (body.samples?.length) {
		for (const batch of chunk(body.samples, 2000)) {
			await db
				.insert(workoutSamples)
				.values(batch)
				.onConflictDoUpdate({
					target: [workoutSamples.workoutId, workoutSamples.offsetSec],
					set: { bpm: sql`excluded.bpm` }
				});
		}
	}

	if (body.sleep?.length) {
		for (const batch of chunk(body.sleep, 500)) {
			await db
				.insert(sleepSessions)
				.values(batch.map((s) => ({ ...s, startedAt: new Date(s.startedAt), endedAt: new Date(s.endedAt) })))
				.onConflictDoUpdate({
					target: sleepSessions.id,
					set: {
						day: sql`excluded.day`,
						startedAt: sql`excluded.started_at`,
						endedAt: sql`excluded.ended_at`,
						inBedSec: sql`excluded.in_bed_sec`,
						asleepSec: sql`excluded.asleep_sec`,
						deepSec: sql`excluded.deep_sec`,
						coreSec: sql`excluded.core_sec`,
						remSec: sql`excluded.rem_sec`,
						awakeSec: sql`excluded.awake_sec`,
						source: sql`excluded.source`
					}
				});
			sleepWritten += batch.length;
		}
	}

	await db
		.update(ingestRuns)
		.set({
			recordsRead: sql`${ingestRuns.recordsRead} + ${body.recordsRead ?? 0}`,
			daysWritten: sql`${ingestRuns.daysWritten} + ${daysWritten}`,
			workoutsWritten: sql`${ingestRuns.workoutsWritten} + ${workoutsWritten}`,
			sleepWritten: sql`${ingestRuns.sleepWritten} + ${sleepWritten}`,
			...(body.done ? { finishedAt: new Date(), note: body.note ?? null } : {})
		})
		.where(eq(ingestRuns.id, runId));

	return json({ ok: true, runId, daysWritten, workoutsWritten, sleepWritten });
};
