/**
 * Registro delle metriche: l'unico punto in cui si dichiara quali dati di Apple
 * Health esistono, come vanno aggregati e come si scrivono a schermo.
 *
 * Lo usano sia la CLI di ingest (per sapere cosa estrarre dall'XML e con quale
 * aggregazione) sia la UI (per etichette, unità e formattazione), così le due
 * parti non possono divergere.
 */

/** Come si riduce a un solo numero l'insieme dei campioni di una giornata. */
export type Aggregation =
	| 'sum' // passi, calorie: si sommano
	| 'avg' // frequenza a riposo, HRV: media della giornata
	| 'last' // peso, VO2 max: vale l'ultima misurazione
	| 'minmax'; // frequenza cardiaca: interessa media, minimo e massimo

export type MetricGroup = 'activity' | 'heart' | 'body' | 'sleep';

export interface MetricDef {
	/** Chiave interna, usata come colonna logica in `daily_metrics.metric`. */
	key: string;
	/** Identificatore HealthKit nell'export XML (assente per le metriche derivate). */
	hk?: string;
	label: string;
	/** Unità già normalizzata (metrica: km, kg, °C). */
	unit: string;
	agg: Aggregation;
	decimals: number;
	group: MetricGroup;
	/** Nome del token colore usato nei grafici (vedi app.css). */
	tone: 'move' | 'exercise' | 'stand' | 'heart' | 'sleep' | 'body' | 'neutral';
	/** Se true, un valore più alto è un miglioramento. Serve per colorare le variazioni. */
	higherIsBetter?: boolean;
}

export const METRICS = [
	// ── Attività quotidiana ────────────────────────────────────────────────
	{ key: 'steps', hk: 'HKQuantityTypeIdentifierStepCount', label: 'Passi', unit: 'passi', agg: 'sum', decimals: 0, group: 'activity', tone: 'move', higherIsBetter: true },
	{ key: 'distance', hk: 'HKQuantityTypeIdentifierDistanceWalkingRunning', label: 'Distanza', unit: 'km', agg: 'sum', decimals: 2, group: 'activity', tone: 'move', higherIsBetter: true },
	{ key: 'flights', hk: 'HKQuantityTypeIdentifierFlightsClimbed', label: 'Piani saliti', unit: 'piani', agg: 'sum', decimals: 0, group: 'activity', tone: 'move', higherIsBetter: true },
	{ key: 'activeEnergy', hk: 'HKQuantityTypeIdentifierActiveEnergyBurned', label: 'Calorie attive', unit: 'kcal', agg: 'sum', decimals: 0, group: 'activity', tone: 'move', higherIsBetter: true },
	{ key: 'basalEnergy', hk: 'HKQuantityTypeIdentifierBasalEnergyBurned', label: 'Calorie a riposo', unit: 'kcal', agg: 'sum', decimals: 0, group: 'activity', tone: 'neutral' },
	{ key: 'exerciseTime', hk: 'HKQuantityTypeIdentifierAppleExerciseTime', label: 'Minuti di esercizio', unit: 'min', agg: 'sum', decimals: 0, group: 'activity', tone: 'exercise', higherIsBetter: true },
	{ key: 'standTime', hk: 'HKQuantityTypeIdentifierAppleStandTime', label: 'Minuti in piedi', unit: 'min', agg: 'sum', decimals: 0, group: 'activity', tone: 'stand', higherIsBetter: true },
	{ key: 'timeInDaylight', hk: 'HKQuantityTypeIdentifierTimeInDaylight', label: 'Tempo alla luce', unit: 'min', agg: 'sum', decimals: 0, group: 'activity', tone: 'stand', higherIsBetter: true },

	// Gli anelli arrivano dai record <ActivitySummary>, che portano anche gli obiettivi.
	{ key: 'ringMove', label: 'Anello Movimento', unit: 'kcal', agg: 'last', decimals: 0, group: 'activity', tone: 'move', higherIsBetter: true },
	{ key: 'ringMoveGoal', label: 'Obiettivo Movimento', unit: 'kcal', agg: 'last', decimals: 0, group: 'activity', tone: 'move' },
	{ key: 'ringExercise', label: 'Anello Esercizio', unit: 'min', agg: 'last', decimals: 0, group: 'activity', tone: 'exercise', higherIsBetter: true },
	{ key: 'ringExerciseGoal', label: 'Obiettivo Esercizio', unit: 'min', agg: 'last', decimals: 0, group: 'activity', tone: 'exercise' },
	{ key: 'ringStand', label: 'Anello In piedi', unit: 'ore', agg: 'last', decimals: 0, group: 'activity', tone: 'stand', higherIsBetter: true },
	{ key: 'ringStandGoal', label: 'Obiettivo In piedi', unit: 'ore', agg: 'last', decimals: 0, group: 'activity', tone: 'stand' },

	// ── Cuore e recupero ───────────────────────────────────────────────────
	{ key: 'heartRate', hk: 'HKQuantityTypeIdentifierHeartRate', label: 'Frequenza cardiaca', unit: 'bpm', agg: 'minmax', decimals: 0, group: 'heart', tone: 'heart' },
	{ key: 'restingHr', hk: 'HKQuantityTypeIdentifierRestingHeartRate', label: 'Frequenza a riposo', unit: 'bpm', agg: 'avg', decimals: 0, group: 'heart', tone: 'heart', higherIsBetter: false },
	{ key: 'walkingHr', hk: 'HKQuantityTypeIdentifierWalkingHeartRateAverage', label: 'Frequenza in camminata', unit: 'bpm', agg: 'avg', decimals: 0, group: 'heart', tone: 'heart', higherIsBetter: false },
	{ key: 'hrv', hk: 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN', label: 'Variabilità cardiaca', unit: 'ms', agg: 'avg', decimals: 0, group: 'heart', tone: 'heart', higherIsBetter: true },
	{ key: 'vo2max', hk: 'HKQuantityTypeIdentifierVO2Max', label: 'VO₂ max', unit: 'ml/kg·min', agg: 'last', decimals: 1, group: 'heart', tone: 'heart', higherIsBetter: true },
	{ key: 'spo2', hk: 'HKQuantityTypeIdentifierOxygenSaturation', label: 'Ossigenazione', unit: '%', agg: 'avg', decimals: 1, group: 'heart', tone: 'heart', higherIsBetter: true },
	{ key: 'respiratoryRate', hk: 'HKQuantityTypeIdentifierRespiratoryRate', label: 'Frequenza respiratoria', unit: 'resp/min', agg: 'avg', decimals: 1, group: 'heart', tone: 'heart' },

	// ── Corpo ──────────────────────────────────────────────────────────────
	{ key: 'weight', hk: 'HKQuantityTypeIdentifierBodyMass', label: 'Peso', unit: 'kg', agg: 'last', decimals: 1, group: 'body', tone: 'body' },
	{ key: 'bodyFat', hk: 'HKQuantityTypeIdentifierBodyFatPercentage', label: 'Massa grassa', unit: '%', agg: 'last', decimals: 1, group: 'body', tone: 'body', higherIsBetter: false },
	{ key: 'leanMass', hk: 'HKQuantityTypeIdentifierLeanBodyMass', label: 'Massa magra', unit: 'kg', agg: 'last', decimals: 1, group: 'body', tone: 'body', higherIsBetter: true },
	{ key: 'bmi', hk: 'HKQuantityTypeIdentifierBodyMassIndex', label: 'Indice di massa corporea', unit: '', agg: 'last', decimals: 1, group: 'body', tone: 'body' },
	{ key: 'wristTemp', hk: 'HKQuantityTypeIdentifierAppleSleepingWristTemperature', label: 'Temperatura del polso', unit: '°C', agg: 'avg', decimals: 2, group: 'body', tone: 'body' },

	// ── Sonno (aggregati derivati dalle sessioni, per i grafici a serie) ────
	{ key: 'sleepAsleep', label: 'Sonno totale', unit: 'h', agg: 'last', decimals: 1, group: 'sleep', tone: 'sleep', higherIsBetter: true },
	{ key: 'sleepDeep', label: 'Sonno profondo', unit: 'h', agg: 'last', decimals: 1, group: 'sleep', tone: 'sleep', higherIsBetter: true },
	{ key: 'sleepRem', label: 'Sonno REM', unit: 'h', agg: 'last', decimals: 1, group: 'sleep', tone: 'sleep', higherIsBetter: true }
] as const satisfies readonly MetricDef[];

export type MetricKey = (typeof METRICS)[number]['key'];

/** `as const` rende ogni voce un tipo letterale, quindi qui si allarga a MetricDef. */
const ALL: readonly MetricDef[] = METRICS;

export const METRIC_BY_KEY = new Map<string, MetricDef>(ALL.map((m) => [m.key, m]));

/** Indice inverso identificatore HealthKit → definizione, usato dal parser dell'export. */
export const METRIC_BY_HK = new Map<string, MetricDef>();
for (const m of ALL) {
	if (m.hk) METRIC_BY_HK.set(m.hk, m);
}

/**
 * Riporta il valore all'unità canonica della metrica.
 *
 * L'export usa le unità impostate sull'iPhone: chi ha il telefono in imperiale
 * si ritrova miglia e libbre, e i grafici verrebbero fuori sbagliati di un
 * fattore 1,6. Qui normalizziamo tutto al sistema metrico.
 */
export function normalizeUnit(value: number, unit: string | undefined): { value: number; unit: string } {
	const u = (unit ?? '').trim();
	switch (u) {
		case 'mi':
			return { value: value * 1.609344, unit: 'km' };
		case 'm':
			return { value: value / 1000, unit: 'km' };
		case 'ft':
			return { value: value * 0.3048, unit: 'm' };
		case 'lb':
			return { value: value * 0.45359237, unit: 'kg' };
		case 'st':
			return { value: value * 6.35029318, unit: 'kg' };
		case 'Cal':
		case 'kcal':
			return { value, unit: 'kcal' };
		case 'degF':
			return { value: ((value - 32) * 5) / 9, unit: '°C' };
		case 'degC':
			return { value, unit: '°C' };
		case 'count/min':
			return { value, unit: 'bpm' };
		case 'ms':
			return { value, unit: 'ms' };
		case '%':
			return { value: value <= 1 ? value * 100 : value, unit: '%' };
		default:
			return { value, unit: u };
	}
}

/** Il campo di `daily_metrics` da leggere per una certa metrica. */
export function valueColumn(agg: Aggregation): 'sum' | 'avg' | 'last' {
	if (agg === 'sum') return 'sum';
	if (agg === 'last') return 'last';
	return 'avg';
}

const nf = (decimals: number) =>
	new Intl.NumberFormat('it-IT', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/** Formatta un valore secondo la metrica, in italiano. Restituisce '—' per i buchi nei dati. */
export function formatMetric(value: number | null | undefined, metric: MetricDef | string): string {
	const def = typeof metric === 'string' ? METRIC_BY_KEY.get(metric) : metric;
	if (value == null || !Number.isFinite(value)) return '—';
	if (!def) return nf(0).format(value);
	return nf(def.decimals).format(value);
}

/** Durata in secondi → "1h 24m" / "24m" / "48s". */
export function formatDuration(seconds: number | null | undefined): string {
	if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '—';
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
	if (m > 0) return `${m}m`;
	return `${Math.round(seconds)}s`;
}

/**
 * Passo medio in min/km a partire da distanza e durata → "5:32".
 *
 * L'arrotondamento va fatto sul totale dei secondi, non sul resto: arrotondando
 * separatamente i secondi, un passo di 359,7 s/km diventerebbe "5:60" invece di
 * "6:00".
 */
export function formatPace(km: number | null | undefined, seconds: number | null | undefined): string {
	if (!km || !seconds || km <= 0) return '—';
	const secPerKm = Math.round(seconds / km);
	return `${Math.floor(secPerKm / 60)}:${String(secPerKm % 60).padStart(2, '0')}`;
}
