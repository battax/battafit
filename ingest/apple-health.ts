import { createHash } from 'node:crypto';
import type { ExportSource } from './source.ts';
import { streamXml, parseAppleDate, appleDay, type Attributes } from './xml.ts';
import { parseGpx, downsampleRoute, routeBbox, elevationGain } from './gpx.ts';
import { METRIC_BY_HK, METRIC_BY_KEY, normalizeUnit, type MetricDef } from '../src/lib/metrics.ts';

/**
 * Trasforma l'export di Apple Health nei dati che finiscono nel database.
 *
 * Il file viene letto due volte, in streaming:
 *
 *  1. la prima passata raccoglie solo `<Workout>` e `<ActivitySummary>`, che
 *     sono poche migliaia di elementi ma stanno in fondo al file;
 *  2. la seconda legge i milioni di `<Record>`, li aggrega per giorno e — ora
 *     che sappiamo quando sono avvenuti gli allenamenti — assegna le battute
 *     cardiache all'allenamento che le contiene.
 *
 * Due passate costano qualche minuto in più di una sola, ma evitano di tenere
 * in memoria mezzo milione di campioni cardiaci in attesa di sapere a quale
 * allenamento appartengono.
 */

const MAX_ROUTE_POINTS = 500;
const MAX_HR_SAMPLES_PER_WORKOUT = 300;
const SLEEP_SESSION_GAP_MIN = 60;

/**
 * Prima di questa data non esiste nessun dato vero.
 *
 * L'export di Apple contiene un paio di `<ActivitySummary>` datati 1969-12-30 e
 * 1969-12-31, con tutti i valori a zero: sono segnaposto attorno all'epoca Unix,
 * non giornate. Basta lasciarli passare perché l'asse temporale di ogni grafico
 * si allunghi di cinquantasette anni e ogni serie diventi una riga schiacciata
 * all'estrema destra.
 *
 * La soglia è volutamente larga: HealthKit è del 2014, ma un peso trascritto a
 * mano da un vecchio diario è plausibile, un dato del 1999 no.
 */
const EARLIEST_PLAUSIBLE_DAY = '2000-01-01';

export interface ParsedWorkout {
	id: string;
	type: string;
	day: string;
	startedAt: string;
	endedAt: string;
	durationSec: number;
	energyKcal: number | null;
	distanceKm: number | null;
	avgHr: number | null;
	maxHr: number | null;
	elevationM: number | null;
	indoor: boolean;
	source: string | null;
	route: [number, number, number | null, number][] | null;
	routeBbox: [number, number, number, number] | null;
}

export interface ParsedDay {
	day: string;
	metric: string;
	sum: number | null;
	avg: number | null;
	min: number | null;
	max: number | null;
	last: number | null;
	count: number;
	unit: string | null;
}

export interface ParsedSleep {
	id: string;
	day: string;
	startedAt: string;
	endedAt: string;
	inBedSec: number;
	asleepSec: number;
	deepSec: number;
	coreSec: number;
	remSec: number;
	awakeSec: number;
	source: string | null;
}

export interface ParseResult {
	days: ParsedDay[];
	workouts: ParsedWorkout[];
	samples: { workoutId: string; offsetSec: number; bpm: number }[];
	sleep: ParsedSleep[];
	recordsRead: number;
	warnings: string[];
}

/** Id stabile: due import dello stesso allenamento devono produrre la stessa riga. */
function stableId(...parts: (string | undefined)[]): string {
	return createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 24);
}

// ─────────────────────────────────────────────────────────────────────────────
// Accumulatore giornaliero
// ─────────────────────────────────────────────────────────────────────────────

interface Acc {
	sum: number;
	count: number;
	min: number;
	max: number;
	last: number;
	lastTs: string;
	unit: string;
}

/**
 * Somma i campioni per giorno, tenendo le sorgenti separate.
 *
 * iPhone e Apple Watch contano entrambi i passi delle stesse camminate: nella
 * app Salute Apple sceglie una sorgente sola, ma nell'export ci sono tutti i
 * record di tutte le sorgenti. Sommarli darebbe giornate da 25.000 passi mai
 * fatti. Per le metriche cumulative teniamo quindi i totali per sorgente e alla
 * fine, giorno per giorno, ne scegliamo una sola.
 */
class DailyAccumulator {
	/** giorno → metrica → sorgente → accumulatore */
	private data = new Map<string, Map<string, Map<string, Acc>>>();

	add(day: string, metric: string, source: string, value: number, unit: string, ts: string) {
		let byMetric = this.data.get(day);
		if (!byMetric) this.data.set(day, (byMetric = new Map()));
		let bySource = byMetric.get(metric);
		if (!bySource) byMetric.set(metric, (bySource = new Map()));

		const acc = bySource.get(source);
		if (!acc) {
			bySource.set(source, { sum: value, count: 1, min: value, max: value, last: value, lastTs: ts, unit });
			return;
		}

		acc.sum += value;
		acc.count++;
		if (value < acc.min) acc.min = value;
		if (value > acc.max) acc.max = value;
		if (ts >= acc.lastTs) {
			acc.last = value;
			acc.lastTs = ts;
		}
	}

	/**
	 * Fra più sorgenti per lo stesso giorno vince l'Apple Watch: è al polso
	 * tutto il giorno, mentre l'iPhone resta sulla scrivania e sottostima.
	 * A parità, vince chi ha registrato più campioni.
	 */
	private pickSource(bySource: Map<string, Acc>): Acc {
		let best: Acc | null = null;
		let bestScore = -1;
		for (const [source, acc] of bySource) {
			const score = (/watch/i.test(source) ? 1e9 : 0) + acc.count;
			if (score > bestScore) {
				bestScore = score;
				best = acc;
			}
		}
		return best!;
	}

	/** Unisce tutte le sorgenti: corretto per medie e misure puntuali, dove non c'è rischio di doppio conteggio. */
	private mergeSources(bySource: Map<string, Acc>): Acc {
		let sum = 0,
			count = 0,
			min = Infinity,
			max = -Infinity,
			last = 0,
			lastTs = '',
			unit = '';
		for (const acc of bySource.values()) {
			sum += acc.sum;
			count += acc.count;
			if (acc.min < min) min = acc.min;
			if (acc.max > max) max = acc.max;
			if (acc.lastTs >= lastTs) {
				last = acc.last;
				lastTs = acc.lastTs;
			}
			unit ||= acc.unit;
		}
		return { sum, count, min, max, last, lastTs, unit };
	}

	finish(metricDefs: Map<string, MetricDef>): ParsedDay[] {
		const out: ParsedDay[] = [];

		for (const [day, byMetric] of this.data) {
			for (const [metric, bySource] of byMetric) {
				const def = metricDefs.get(metric);
				const cumulative = def?.agg === 'sum';
				const acc = cumulative ? this.pickSource(bySource) : this.mergeSources(bySource);

				out.push({
					day,
					metric,
					sum: cumulative ? acc.sum : null,
					avg: acc.count ? acc.sum / acc.count : null,
					min: Number.isFinite(acc.min) ? acc.min : null,
					max: Number.isFinite(acc.max) ? acc.max : null,
					last: acc.last,
					count: acc.count,
					unit: acc.unit || (def?.unit ?? null)
				});
			}
		}

		return out.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Sonno
// ─────────────────────────────────────────────────────────────────────────────

type SleepStage = 'inBed' | 'awake' | 'deep' | 'core' | 'rem' | 'asleep';

function sleepStage(value: string): SleepStage | null {
	if (value.endsWith('InBed')) return 'inBed';
	if (value.endsWith('Awake')) return 'awake';
	if (value.endsWith('AsleepDeep')) return 'deep';
	if (value.endsWith('AsleepCore')) return 'core';
	if (value.endsWith('AsleepREM')) return 'rem';
	if (value.includes('Asleep')) return 'asleep'; // AsleepUnspecified e i vecchi export
	return null;
}

interface SleepSegment {
	start: number;
	end: number;
	stage: SleepStage;
	source: string;
}

/**
 * Durata totale dell'unione di una lista di intervalli.
 *
 * Non basta sommare le durate: se iPhone, Watch e un'app di terze parti
 * registrano la stessa notte, gli intervalli si sovrappongono e la somma
 * darebbe dodici ore di sonno per una notte di otto.
 */
function unionDuration(segments: SleepSegment[]): number {
	if (!segments.length) return 0;
	const sorted = [...segments].sort((a, b) => a.start - b.start);
	let total = 0;
	let [start, end] = [sorted[0].start, sorted[0].end];

	for (const s of sorted.slice(1)) {
		if (s.start > end) {
			total += end - start;
			[start, end] = [s.start, s.end];
		} else if (s.end > end) {
			end = s.end;
		}
	}

	return (total + (end - start)) / 1000;
}

function buildSleepSessions(segments: SleepSegment[]): ParsedSleep[] {
	if (!segments.length) return [];
	segments.sort((a, b) => a.start - b.start);

	const gap = SLEEP_SESSION_GAP_MIN * 60_000;
	const sessions: SleepSegment[][] = [];
	let current: SleepSegment[] = [segments[0]];
	let currentEnd = segments[0].end;

	for (const seg of segments.slice(1)) {
		if (seg.start - currentEnd > gap) {
			sessions.push(current);
			current = [];
		}
		current.push(seg);
		if (seg.end > currentEnd) currentEnd = seg.end;
	}
	sessions.push(current);

	return sessions.map((segs) => {
		const start = Math.min(...segs.map((s) => s.start));
		const end = Math.max(...segs.map((s) => s.end));
		const of = (...stages: SleepStage[]) => segs.filter((s) => stages.includes(s.stage));

		const endDate = new Date(end);
		// Il giorno di riferimento è quello del risveglio, come fa Apple:
		// "il sonno di martedì" è la notte fra lunedì e martedì.
		const day = new Date(end - endDate.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);

		return {
			id: stableId('sleep', new Date(start).toISOString()),
			day,
			startedAt: new Date(start).toISOString(),
			endedAt: endDate.toISOString(),
			inBedSec: unionDuration(of('inBed')),
			asleepSec: unionDuration(of('deep', 'core', 'rem', 'asleep')),
			deepSec: unionDuration(of('deep')),
			coreSec: unionDuration(of('core')),
			remSec: unionDuration(of('rem')),
			awakeSec: unionDuration(of('awake')),
			source: segs[0].source || null
		};
	});
}

// ─────────────────────────────────────────────────────────────────────────────
// Passata 1: allenamenti e anelli
// ─────────────────────────────────────────────────────────────────────────────

interface WorkoutDraft extends ParsedWorkout {
	startMs: number;
	endMs: number;
	routeFile: string | null;
	/** Bucket temporali per la frequenza cardiaca: [somma, conteggio] per ogni intervallo. */
	hrBuckets: Float64Array;
	hrCounts: Int32Array;
	bucketSec: number;
}

function numAttr(attrs: Attributes, name: string): number | null {
	const v = Number(attrs[name]);
	return Number.isFinite(v) ? v : null;
}

async function scanStructural(source: ExportSource, onProgress?: (n: number) => void) {
	const drafts: WorkoutDraft[] = [];
	const summaries: { day: string; metric: string; value: number }[] = [];

	let current: WorkoutDraft | null = null;
	let inRoute = false;
	let ghostDays = 0;

	const stream = await source.openXml();
	const { errors } = await streamXml(stream, {
		onProgress,
		onOpen(name, attrs) {
			switch (name) {
				case 'Workout': {
					const start = parseAppleDate(attrs.startDate);
					const end = parseAppleDate(attrs.endDate);
					if (!start || !end) return;

					const day = appleDay(attrs.startDate);
					if (!day) return;

					// `duration` è in minuti salvo diversa indicazione; ricavarla dagli
					// estremi è più affidabile, ma la teniamo come riserva.
					let durationSec = (end.getTime() - start.getTime()) / 1000;
					const declared = numAttr(attrs, 'duration');
					if (declared !== null && durationSec <= 0) {
						durationSec = attrs.durationUnit === 'sec' ? declared : declared * 60;
					}

					const bucketSec = Math.max(5, Math.ceil(durationSec / MAX_HR_SAMPLES_PER_WORKOUT));
					const buckets = Math.max(1, Math.ceil(durationSec / bucketSec));

					current = {
						id: stableId('workout', attrs.startDate, attrs.workoutActivityType, attrs.sourceName),
						type: attrs.workoutActivityType ?? 'HKWorkoutActivityTypeOther',
						day,
						startedAt: start.toISOString(),
						endedAt: end.toISOString(),
						durationSec,
						energyKcal: null,
						distanceKm: null,
						avgHr: null,
						maxHr: null,
						elevationM: null,
						indoor: false,
						source: attrs.sourceName ?? null,
						route: null,
						routeBbox: null,
						startMs: start.getTime(),
						endMs: end.getTime(),
						routeFile: null,
						hrBuckets: new Float64Array(buckets),
						hrCounts: new Int32Array(buckets),
						bucketSec
					};

					// Negli export più vecchi distanza ed energia stanno sul tag Workout;
					// dal 2022 circa Apple le sposta nei WorkoutStatistics.
					const dist = numAttr(attrs, 'totalDistance');
					if (dist !== null) current.distanceKm = normalizeUnit(dist, attrs.totalDistanceUnit).value;
					const energy = numAttr(attrs, 'totalEnergyBurned');
					if (energy !== null) current.energyKcal = energy;
					break;
				}

				case 'WorkoutStatistics': {
					if (!current) break;
					const type = attrs.type ?? '';
					if (type.endsWith('HeartRate')) {
						current.avgHr = numAttr(attrs, 'average') ?? current.avgHr;
						current.maxHr = numAttr(attrs, 'maximum') ?? current.maxHr;
					} else if (type.includes('Distance')) {
						const v = numAttr(attrs, 'sum');
						if (v !== null) current.distanceKm = normalizeUnit(v, attrs.unit).value;
					} else if (type.endsWith('ActiveEnergyBurned')) {
						const v = numAttr(attrs, 'sum');
						if (v !== null) current.energyKcal = v;
					}
					break;
				}

				case 'MetadataEntry': {
					if (current && attrs.key === 'HKIndoorWorkout') current.indoor = attrs.value === '1';
					if (current && attrs.key === 'HKElevationAscended') {
						// Arriva come "1234 cm": teniamo solo il numero e convertiamo in metri.
						const cm = parseFloat(attrs.value ?? '');
						if (Number.isFinite(cm)) current.elevationM = Math.round(cm / 100);
					}
					break;
				}

				case 'WorkoutRoute':
					inRoute = true;
					break;

				case 'FileReference':
					if (current && inRoute && attrs.path) current.routeFile = attrs.path;
					break;

				case 'ActivitySummary': {
					const day = attrs.dateComponents;
					if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) break;
					if (day < EARLIEST_PLAUSIBLE_DAY) {
						ghostDays++;
						break;
					}
					const push = (metric: string, value: number | null) => {
						if (value !== null) summaries.push({ day, metric, value });
					};
					push('ringMove', numAttr(attrs, 'activeEnergyBurned'));
					push('ringMoveGoal', numAttr(attrs, 'activeEnergyBurnedGoal'));
					push('ringExercise', numAttr(attrs, 'appleExerciseTime'));
					push('ringExerciseGoal', numAttr(attrs, 'appleExerciseTimeGoal'));
					push('ringStand', numAttr(attrs, 'appleStandHours'));
					push('ringStandGoal', numAttr(attrs, 'appleStandHoursGoal'));
					break;
				}
			}
		},
		onClose(name) {
			if (name === 'Workout' && current) {
				drafts.push(current);
				current = null;
			} else if (name === 'WorkoutRoute') {
				inRoute = false;
			}
		}
	});

	drafts.sort((a, b) => a.startMs - b.startMs);
	return { drafts, summaries, errors, ghostDays };
}

// ─────────────────────────────────────────────────────────────────────────────
// Passata 2: i campioni
// ─────────────────────────────────────────────────────────────────────────────

/** Indice dell'allenamento che contiene `ts`, con ricerca binaria sugli intervalli ordinati. */
function findWorkout(drafts: WorkoutDraft[], ts: number): WorkoutDraft | null {
	let lo = 0;
	let hi = drafts.length - 1;
	while (lo <= hi) {
		const mid = (lo + hi) >> 1;
		const w = drafts[mid];
		if (ts < w.startMs) hi = mid - 1;
		else if (ts > w.endMs) lo = mid + 1;
		else return w;
	}
	return null;
}

export async function parseAppleExport(
	source: ExportSource,
	opts: { since?: string; onProgress?: (phase: string, bytes: number, total: number) => void } = {}
): Promise<ParseResult> {
	const warnings: string[] = [];
	const total = source.xmlSize;

	const { drafts, summaries, errors: structErrors, ghostDays } = await scanStructural(source, (b) =>
		opts.onProgress?.('allenamenti', b, total)
	);

	const daily = new DailyAccumulator();
	const sleepSegments: SleepSegment[] = [];
	let recordsRead = 0;
	let skippedNoDay = 0;
	let ghostRecords = 0;

	const stream = await source.openXml();
	const { errors: recordErrors } = await streamXml(stream, {
		onProgress: (b) => opts.onProgress?.('campioni', b, total),
		onOpen(name, attrs) {
			if (name !== 'Record') return;
			recordsRead++;

			const type = attrs.type;
			if (!type) return;

			// Il sonno è una categoria, non una quantità: va per intervalli, non per valore.
			if (type === 'HKCategoryTypeIdentifierSleepAnalysis') {
				const stage = sleepStage(attrs.value ?? '');
				const start = parseAppleDate(attrs.startDate);
				const end = parseAppleDate(attrs.endDate);
				if (stage && start && end && end > start) {
					sleepSegments.push({
						start: start.getTime(),
						end: end.getTime(),
						stage,
						source: attrs.sourceName ?? ''
					});
				}
				return;
			}

			const def = METRIC_BY_HK.get(type);
			if (!def) return;

			const raw = Number(attrs.value);
			if (!Number.isFinite(raw)) return;

			const day = appleDay(attrs.startDate);
			if (!day) {
				skippedNoDay++;
				return;
			}
			// Stesso filtro degli anelli: qui non se ne sono mai visti, ma un solo
			// record del 1969 basterebbe a rifare il danno sull'asse dei grafici.
			if (day < EARLIEST_PLAUSIBLE_DAY) {
				ghostRecords++;
				return;
			}
			if (opts.since && day < opts.since) return;

			const { value, unit } = normalizeUnit(raw, attrs.unit);
			daily.add(day, def.key, attrs.sourceName ?? '', value, unit, attrs.startDate ?? '');

			// Le battute cardiache cadute dentro un allenamento alimentano anche il
			// grafico di dettaglio di quell'allenamento.
			if (def.key === 'heartRate' && drafts.length) {
				const ts = parseAppleDate(attrs.startDate)?.getTime();
				if (ts !== undefined) {
					const w = findWorkout(drafts, ts);
					if (w) {
						const i = Math.min(
							w.hrBuckets.length - 1,
							Math.floor((ts - w.startMs) / 1000 / w.bucketSec)
						);
						w.hrBuckets[i] += value;
						w.hrCounts[i]++;
					}
				}
			}
		}
	});

	// Gli anelli sono già deduplicati da Apple: li scriviamo così come sono.
	for (const s of summaries) {
		if (opts.since && s.day < opts.since) continue;
		daily.add(s.day, s.metric, 'ActivitySummary', s.value, '', s.day);
	}

	// Tracce GPS: si leggono adesso, quando sappiamo quali allenamenti ne hanno una.
	let routesRead = 0;
	let routesMissing = 0;
	for (const w of drafts) {
		if (!w.routeFile) continue;
		const gpx = await source.readRoute(w.routeFile);
		if (!gpx) {
			routesMissing++;
			continue;
		}
		const points = parseGpx(gpx);
		if (!points.length) continue;

		routesRead++;
		const reduced = downsampleRoute(points, MAX_ROUTE_POINTS);
		w.route = reduced.map((p) => [p.lon, p.lat, p.ele, p.t] as [number, number, number | null, number]);
		w.routeBbox = routeBbox(reduced);
		w.elevationM ??= elevationGain(points);
	}

	const samples: { workoutId: string; offsetSec: number; bpm: number }[] = [];
	for (const w of drafts) {
		let sum = 0;
		let n = 0;
		let peak = 0;

		for (let i = 0; i < w.hrCounts.length; i++) {
			if (w.hrCounts[i] === 0) continue;
			const bpm = Math.round((w.hrBuckets[i] / w.hrCounts[i]) * 10) / 10;
			samples.push({ workoutId: w.id, offsetSec: i * w.bucketSec, bpm });
			sum += bpm;
			n++;
			if (bpm > peak) peak = bpm;
		}

		// Se i WorkoutStatistics mancavano, ricaviamo media e massimo dai campioni.
		if (n > 0) {
			w.avgHr ??= Math.round(sum / n);
			w.maxHr ??= peak;
		}
	}

	const sleep = buildSleepSessions(sleepSegments).filter((s) => !opts.since || s.day >= opts.since);

	// Il sonno diventa anche una serie giornaliera, così sta nei grafici insieme alle altre metriche.
	for (const s of sleep) {
		daily.add(s.day, 'sleepAsleep', 'derivata', s.asleepSec / 3600, 'h', s.startedAt);
		daily.add(s.day, 'sleepDeep', 'derivata', s.deepSec / 3600, 'h', s.startedAt);
		daily.add(s.day, 'sleepRem', 'derivata', s.remSec / 3600, 'h', s.startedAt);
	}

	if (structErrors + recordErrors > 0) {
		warnings.push(
			`${structErrors + recordErrors} righe dell'XML non erano valide e sono state saltate ` +
				`(normale se l'export contiene dati di app di terze parti).`
		);
	}
	if (skippedNoDay > 0) warnings.push(`${skippedNoDay} record senza data valida saltati.`);
	if (ghostDays + ghostRecords > 0) {
		warnings.push(
			`${ghostDays + ghostRecords} voci fantasma precedenti al ${EARLIEST_PLAUSIBLE_DAY} scartate ` +
				`(segnaposto di Apple attorno all'epoca Unix, tutti a zero).`
		);
	}
	if (routesMissing > 0) {
		warnings.push(
			`${routesMissing} tracce GPS non trovate nell'export: le mappe di quegli allenamenti resteranno vuote.`
		);
	}
	if (routesRead > 0) warnings.push(`${routesRead} tracce GPS importate.`);

	const workoutsOut: ParsedWorkout[] = drafts
		.filter((w) => !opts.since || w.day >= opts.since)
		.map(({ startMs, endMs, routeFile, hrBuckets, hrCounts, bucketSec, ...w }) => w);

	const keep = new Set(workoutsOut.map((w) => w.id));

	return {
		days: daily.finish(METRIC_BY_KEY),
		workouts: workoutsOut,
		samples: samples.filter((s) => keep.has(s.workoutId)),
		sleep,
		recordsRead,
		warnings
	};
}
