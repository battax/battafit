import { and, asc, desc, eq, gt, gte, lt, lte, inArray, sql, count } from 'drizzle-orm';
import { db } from './db';
import { dailyMetrics, workouts, workoutSamples, sleepSessions, ingestRuns } from './db/schema';
import { METRIC_BY_KEY, valueColumn, type MetricKey } from '$lib/metrics';

/**
 * Tutte le letture dal database.
 *
 * Le tabelle contengono già aggregati per giorno, quindi qui non c'è nessun
 * calcolo pesante: si tratta di selezionare intervalli e di scegliere, per
 * ciascuna metrica, la colonna giusta fra somma, media e ultimo valore — scelta
 * che vive nel registro delle metriche, non sparsa nelle query.
 */

export interface Point {
	day: string;
	value: number | null;
}

/** Estrae dalla riga il valore che ha senso per quella metrica. */
function pick(row: { sum: number | null; avg: number | null; last: number | null }, metric: string): number | null {
	const def = METRIC_BY_KEY.get(metric);
	const col = valueColumn(def?.agg ?? 'avg');
	return row[col];
}

export async function getSeries(metric: MetricKey | string, from: string, to: string): Promise<Point[]> {
	const rows = await db
		.select({
			day: dailyMetrics.day,
			sum: dailyMetrics.sum,
			avg: dailyMetrics.avg,
			last: dailyMetrics.last
		})
		.from(dailyMetrics)
		.where(and(eq(dailyMetrics.metric, metric), gte(dailyMetrics.day, from), lte(dailyMetrics.day, to)))
		.orderBy(asc(dailyMetrics.day));

	return rows.map((r) => ({ day: r.day, value: pick(r, metric) }));
}

/** Più serie in una sola query: evita una raffica di round-trip per la pagina di panoramica. */
export async function getManySeries(
	metrics: (MetricKey | string)[],
	from: string,
	to: string
): Promise<Record<string, Point[]>> {
	if (!metrics.length) return {};

	const rows = await db
		.select({
			day: dailyMetrics.day,
			metric: dailyMetrics.metric,
			sum: dailyMetrics.sum,
			avg: dailyMetrics.avg,
			last: dailyMetrics.last
		})
		.from(dailyMetrics)
		.where(and(inArray(dailyMetrics.metric, metrics), gte(dailyMetrics.day, from), lte(dailyMetrics.day, to)))
		.orderBy(asc(dailyMetrics.day));

	const out: Record<string, Point[]> = Object.fromEntries(metrics.map((m) => [m, []]));
	for (const r of rows) out[r.metric]?.push({ day: r.day, value: pick(r, r.metric) });
	return out;
}

/** Tutte le metriche di un singolo giorno, come mappa metrica → valore. */
export async function getDay(day: string): Promise<Record<string, number | null>> {
	const rows = await db
		.select({
			metric: dailyMetrics.metric,
			sum: dailyMetrics.sum,
			avg: dailyMetrics.avg,
			last: dailyMetrics.last,
			min: dailyMetrics.min,
			max: dailyMetrics.max
		})
		.from(dailyMetrics)
		.where(eq(dailyMetrics.day, day));

	const out: Record<string, number | null> = {};
	for (const r of rows) {
		out[r.metric] = pick(r, r.metric);
		// La frequenza cardiaca serve anche nei suoi estremi, non solo in media.
		if (r.metric === 'heartRate') {
			out['heartRateMin'] = r.min;
			out['heartRateMax'] = r.max;
		}
	}
	return out;
}

/** L'ultimo giorno per cui esistono dati. Serve per non aprire la dashboard su una pagina vuota. */
export async function getLatestDay(): Promise<string | null> {
	const [row] = await db
		.select({ day: dailyMetrics.day })
		.from(dailyMetrics)
		.orderBy(desc(dailyMetrics.day))
		.limit(1);
	return row?.day ?? null;
}

/** Media di una metrica su un intervallo, usata come termine di paragone. */
export async function getAverage(metric: string, from: string, to: string): Promise<number | null> {
	const def = METRIC_BY_KEY.get(metric);
	const col = valueColumn(def?.agg ?? 'avg');
	const column = col === 'sum' ? dailyMetrics.sum : col === 'last' ? dailyMetrics.last : dailyMetrics.avg;

	const [row] = await db
		.select({ value: sql<number | null>`avg(${column})` })
		.from(dailyMetrics)
		.where(and(eq(dailyMetrics.metric, metric), gte(dailyMetrics.day, from), lte(dailyMetrics.day, to)));

	return row?.value ?? null;
}

export async function getWorkouts(opts: {
	from?: string;
	to?: string;
	type?: string;
	limit?: number;
	offset?: number;
}) {
	const filters = [
		opts.from ? gte(workouts.day, opts.from) : undefined,
		opts.to ? lte(workouts.day, opts.to) : undefined,
		opts.type ? eq(workouts.type, opts.type) : undefined
	].filter(Boolean);

	return db
		.select({
			id: workouts.id,
			type: workouts.type,
			day: workouts.day,
			startedAt: workouts.startedAt,
			durationSec: workouts.durationSec,
			energyKcal: workouts.energyKcal,
			distanceKm: workouts.distanceKm,
			avgHr: workouts.avgHr,
			maxHr: workouts.maxHr,
			elevationM: workouts.elevationM,
			indoor: workouts.indoor,
			// La traccia completa non serve in elenco: basta sapere se esiste.
			hasRoute: sql<boolean>`${workouts.route} is not null`
		})
		.from(workouts)
		.where(filters.length ? and(...filters) : undefined)
		.orderBy(desc(workouts.startedAt))
		.limit(opts.limit ?? 50)
		.offset(opts.offset ?? 0);
}

export async function countWorkouts(opts: { from?: string; to?: string; type?: string }) {
	const filters = [
		opts.from ? gte(workouts.day, opts.from) : undefined,
		opts.to ? lte(workouts.day, opts.to) : undefined,
		opts.type ? eq(workouts.type, opts.type) : undefined
	].filter(Boolean);

	const [row] = await db
		.select({ n: count() })
		.from(workouts)
		.where(filters.length ? and(...filters) : undefined);
	return row?.n ?? 0;
}

/** Tipi di allenamento presenti, con quante volte ricorrono: alimenta il filtro. */
export async function getWorkoutTypes(from?: string, to?: string) {
	const filters = [from ? gte(workouts.day, from) : undefined, to ? lte(workouts.day, to) : undefined].filter(
		Boolean
	);

	return db
		.select({
			type: workouts.type,
			n: count(),
			totalSec: sql<number>`coalesce(sum(${workouts.durationSec}), 0)`,
			totalKm: sql<number>`coalesce(sum(${workouts.distanceKm}), 0)`,
			totalKcal: sql<number>`coalesce(sum(${workouts.energyKcal}), 0)`
		})
		.from(workouts)
		.where(filters.length ? and(...filters) : undefined)
		.groupBy(workouts.type)
		.orderBy(desc(count()));
}

export async function getWorkout(id: string) {
	const [row] = await db.select().from(workouts).where(eq(workouts.id, id)).limit(1);
	return row ?? null;
}

export async function getWorkoutSamples(id: string) {
	return db
		.select({ offsetSec: workoutSamples.offsetSec, bpm: workoutSamples.bpm })
		.from(workoutSamples)
		.where(eq(workoutSamples.workoutId, id))
		.orderBy(asc(workoutSamples.offsetSec));
}

/**
 * L'allenamento precedente e il successivo, per navigare senza tornare
 * all'elenco. Il confronto passa dagli operatori di Drizzle e non da un
 * frammento SQL grezzo: solo così il driver sa che il parametro è un timestamp
 * e lo dichiara col tipo giusto, altrimenti Postgres non riesce a dedurlo.
 */
export async function getWorkoutNeighbours(startedAt: Date) {
	const [prev] = await db
		.select({ id: workouts.id })
		.from(workouts)
		.where(lt(workouts.startedAt, startedAt))
		.orderBy(desc(workouts.startedAt))
		.limit(1);

	const [next] = await db
		.select({ id: workouts.id })
		.from(workouts)
		.where(gt(workouts.startedAt, startedAt))
		.orderBy(asc(workouts.startedAt))
		.limit(1);

	return { prev: prev?.id ?? null, next: next?.id ?? null };
}

/**
 * Le sessioni precedenti della stessa disciplina, per dire se questa è andata
 * meglio o peggio del solito.
 *
 * Il confronto è con le dieci precedenti e non con tutte: una corsa di oggi
 * paragonata alla media di sei anni fa non dice niente di utile, perché in
 * mezzo c'è un'operazione. Dieci sessioni sono il passato recente, che è
 * l'unico termine di paragone che si riconosce.
 */
export async function getSameTypeHistory(type: string, before: Date, limit = 10) {
	return db
		.select({
			id: workouts.id,
			startedAt: workouts.startedAt,
			durationSec: workouts.durationSec,
			distanceKm: workouts.distanceKm,
			energyKcal: workouts.energyKcal,
			avgHr: workouts.avgHr
		})
		.from(workouts)
		.where(and(eq(workouts.type, type), lt(workouts.startedAt, before)))
		.orderBy(desc(workouts.startedAt))
		.limit(limit);
}

export async function getSleep(from: string, to: string) {
	return db
		.select()
		.from(sleepSessions)
		.where(and(gte(sleepSessions.day, from), lte(sleepSessions.day, to)))
		.orderBy(asc(sleepSessions.day));
}

/** Quando è stato aggiornato l'ultimo import, e com'è andato. */
export async function getLastIngest() {
	const [row] = await db.select().from(ingestRuns).orderBy(desc(ingestRuns.id)).limit(1);
	return row ?? null;
}

/** True se il database è ancora vuoto: la UI mostra le istruzioni invece di grafici vuoti. */
export async function isEmpty(): Promise<boolean> {
	const [row] = await db.select({ n: count() }).from(dailyMetrics).limit(1);
	return (row?.n ?? 0) === 0;
}
