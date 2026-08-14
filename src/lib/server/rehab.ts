import { and, asc, desc, eq, gte, lte, inArray, sql } from 'drizzle-orm';
import { db } from './db';
import {
	rehabDays,
	rehabRuns,
	rehabSets,
	rehabMeasures,
	rehabEvents,
	rehabContacts,
	rehabConfig,
	workouts
} from './db/schema';
import { getManySeries } from './queries';
import {
	CLINICAL_SEED,
	CONFIG_DEFAULTS,
	CONTACT_ROLES,
	RUN_PLAN,
	WEEKLY_TARGETS,
	addDays,
	runOutcome,
	weekDays,
	weekEnd,
	weekStart,
	type RunOutcome
} from '$lib/rehab';

/**
 * Letture e scritture della sezione Recupero.
 *
 * Le tabelle sono piccole per costruzione — 91 giorni, 12 corse, qualche decina
 * di serie — quindi qui non ci sono aggregazioni in SQL: i riepiloghi si
 * calcolano in memoria sulle righe già caricate. È una scelta, non una svista:
 * la regola che decide se una corsa è andata bene vive in `$lib/rehab` ed è
 * condivisa con il browser, e riscriverla in SQL vorrebbe dire tenerne due.
 */

// ── Semina ────────────────────────────────────────────────────────────────

/**
 * Riempie le righe che il protocollo conosce già: le dodici corse, le scadenze
 * cliniche, i tre recapiti e gli obiettivi di partenza.
 *
 * Idempotente e chiamata a ogni caricamento della sezione, così la sezione
 * funziona subito dopo un `db:push` senza un passaggio manuale da ricordare.
 * Le righe esistenti non vengono mai toccate: se una data è stata spostata a
 * mano, resta spostata.
 */
export async function seedRehab(): Promise<void> {
	await db
		.insert(rehabConfig)
		.values({ id: 1, ...CONFIG_DEFAULTS })
		.onConflictDoNothing();

	await db
		.insert(rehabRuns)
		.values(RUN_PLAN.map((r) => ({ ...r })))
		.onConflictDoNothing();

	// Gli eventi clinici non hanno un vincolo naturale di unicità: si semina
	// solo se la tabella è ancora intatta, altrimenti una riga cancellata a mano
	// tornerebbe da sola al caricamento successivo.
	const [{ n: events }] = await db.select({ n: sql<number>`count(*)::int` }).from(rehabEvents);
	if (events === 0) await db.insert(rehabEvents).values(CLINICAL_SEED.map((e) => ({ ...e })));

	const [{ n: contacts }] = await db.select({ n: sql<number>`count(*)::int` }).from(rehabContacts);
	if (contacts === 0) await db.insert(rehabContacts).values(CONTACT_ROLES.map((role) => ({ role })));
}

// ── Obiettivi ─────────────────────────────────────────────────────────────

export type Config = typeof CONFIG_DEFAULTS;

export async function getConfig(): Promise<Config> {
	const [row] = await db.select().from(rehabConfig).where(eq(rehabConfig.id, 1)).limit(1);
	if (!row) return { ...CONFIG_DEFAULTS };

	// Una colonna svuotata a mano ricade sul valore di partenza invece di
	// diventare null e far sparire il confronto dalla pagina.
	const out = { ...CONFIG_DEFAULTS } as Record<string, number>;
	for (const [key, fallback] of Object.entries(CONFIG_DEFAULTS)) {
		const value = (row as Record<string, unknown>)[key];
		out[key] = typeof value === 'number' ? value : fallback;
	}
	return out as Config;
}

export async function saveConfig(values: Partial<Config>): Promise<void> {
	// Con `set` vuoto la clausola ON CONFLICT non sarebbe SQL valido: senza
	// niente da cambiare, basta assicurarsi che la riga esista.
	if (Object.keys(values).length === 0) {
		await db
			.insert(rehabConfig)
			.values({ id: 1, ...CONFIG_DEFAULTS })
			.onConflictDoNothing();
		return;
	}

	await db
		.insert(rehabConfig)
		.values({ id: 1, ...CONFIG_DEFAULTS, ...values })
		.onConflictDoUpdate({ target: rehabConfig.id, set: values });
}

// ── Registro giornaliero ──────────────────────────────────────────────────

export type RehabDayRow = typeof rehabDays.$inferSelect;
export type RehabDayInput = Omit<typeof rehabDays.$inferInsert, 'day' | 'updatedAt'>;

export async function getRehabDays(from: string, to: string): Promise<RehabDayRow[]> {
	return db
		.select()
		.from(rehabDays)
		.where(and(gte(rehabDays.day, from), lte(rehabDays.day, to)))
		.orderBy(asc(rehabDays.day));
}

export async function getRehabDay(day: string): Promise<RehabDayRow | null> {
	const [row] = await db.select().from(rehabDays).where(eq(rehabDays.day, day)).limit(1);
	return row ?? null;
}

/**
 * Le metriche che l'app dei pasti scrive su Salute.
 *
 * Sono il motivo per cui il registro serale non è un modulo da dodici caselle:
 * nei giorni in cui il diario alimentare è stato compilato davvero, questi
 * numeri esistono già e non ha senso ribatterli.
 */
export const NUTRITION_METRICS = [
	'dietaryEnergy',
	'dietaryProtein',
	'dietaryCarbs',
	'dietaryFat',
	'dietaryWater'
] as const;

/** Un valore e da dove viene, perché la pagina possa dirlo invece di far finta che sia lo stesso. */
export interface Sourced {
	value: number | null;
	fromHealth: boolean;
}

/**
 * Una giornata come la vede l'app: quello che è stato scritto a mano più quello
 * che Salute sa già, risolti in un valore solo per campo.
 *
 * **Salute vince sul registro.** Se il diario alimentare dice 171 g e a mano ne
 * erano stati segnati 165, il numero vero è quello del diario: la casella
 * scritta a mano era un ripiego in attesa della sincronizzazione. Vale anche per
 * il peso, che dalla bilancia connessa è più affidabile di una cifra ricordata.
 *
 * `logged` resta legato alla riga del registro e non ai dati di Salute: dice se
 * la giornata è stata *compilata*, cioè se dolore, gonfiore e sedute sono stati
 * dichiarati. Un giorno con le sole calorie sincronizzate non è una giornata
 * compilata, ed è giusto che la formula d'oro continui a chiederla.
 */
export interface EffectiveDay {
	day: string;
	logged: boolean;
	pain: number | null;
	swelling: string | null;
	fkt: boolean;
	upperBody: string | null;
	note: string | null;
	calories: Sourced;
	proteinG: Sourced;
	carbsG: Sourced;
	fatG: Sourced;
	waterL: Sourced;
	weightKg: Sourced;
	waistCm: number | null;
}

function sourced(health: number | null | undefined, manual: number | null | undefined): Sourced {
	if (health != null) return { value: health, fromHealth: true };
	return { value: manual ?? null, fromHealth: false };
}

/**
 * I giorni del blocco, registro e Salute già fusi.
 *
 * Restituisce una riga per ogni giorno di calendario, anche vuota: i grafici
 * hanno bisogno dei buchi per poterli lasciare buchi, e il conteggio delle
 * settimane ha bisogno di sapere quali giorni esistevano.
 */
export async function getBlockDays(from: string, to: string): Promise<EffectiveDay[]> {
	const [entries, health] = await Promise.all([
		getRehabDays(from, to),
		getManySeries([...NUTRITION_METRICS, 'weight'], from, to)
	]);

	const byDay = new Map(entries.map((e) => [e.day, e]));
	const healthByDay = new Map<string, Record<string, number | null>>();
	for (const [metric, points] of Object.entries(health)) {
		for (const p of points) {
			const row = healthByDay.get(p.day) ?? {};
			row[metric] = p.value;
			healthByDay.set(p.day, row);
		}
	}

	const out: EffectiveDay[] = [];
	for (let day = from; day <= to; day = addDays(day, 1)) {
		const e = byDay.get(day) ?? null;
		const h = healthByDay.get(day) ?? {};

		out.push({
			day,
			logged: e !== null,
			pain: e?.pain ?? null,
			swelling: e?.swelling ?? null,
			fkt: e?.fkt ?? false,
			upperBody: e?.upperBody ?? null,
			note: e?.note ?? null,
			calories: sourced(h.dietaryEnergy, e?.calories),
			proteinG: sourced(h.dietaryProtein, e?.proteinG),
			carbsG: sourced(h.dietaryCarbs, e?.carbsG),
			fatG: sourced(h.dietaryFat, e?.fatG),
			waterL: sourced(h.dietaryWater, e?.waterL),
			weightKg: sourced(h.weight, e?.weightKg),
			waistCm: e?.waistCm ?? null
		});
	}

	return out;
}

export async function saveRehabDay(day: string, values: RehabDayInput): Promise<void> {
	await db
		.insert(rehabDays)
		.values({ day, ...values })
		.onConflictDoUpdate({
			target: rehabDays.day,
			set: { ...values, updatedAt: new Date() }
		});
}

// ── Corse ─────────────────────────────────────────────────────────────────

export type RehabRunRow = typeof rehabRuns.$inferSelect;
export interface RunWithOutcome extends RehabRunRow {
	outcome: RunOutcome;
	/** Giorno in cui vale la seduta: quello reale se c'è, altrimenti il previsto. */
	effectiveDay: string;
}

function withOutcome(r: RehabRunRow): RunWithOutcome {
	return { ...r, outcome: runOutcome(r), effectiveDay: r.doneOn ?? r.plannedOn };
}

export async function getRuns(): Promise<RunWithOutcome[]> {
	const rows = await db.select().from(rehabRuns).orderBy(asc(rehabRuns.plannedOn), asc(rehabRuns.id));
	return rows.map(withOutcome);
}

export async function getRun(id: number): Promise<RunWithOutcome | null> {
	const [row] = await db.select().from(rehabRuns).where(eq(rehabRuns.id, id)).limit(1);
	return row ? withOutcome(row) : null;
}

export async function saveRun(id: number, values: Partial<typeof rehabRuns.$inferInsert>): Promise<void> {
	await db.update(rehabRuns).set(values).where(eq(rehabRuns.id, id));
}

// ── Carichi ───────────────────────────────────────────────────────────────

export type RehabSetRow = typeof rehabSets.$inferSelect;

export async function getSets(opts: { from?: string; to?: string; exercise?: string; limit?: number } = {}) {
	const filters = [
		opts.from ? gte(rehabSets.day, opts.from) : undefined,
		opts.to ? lte(rehabSets.day, opts.to) : undefined,
		opts.exercise ? eq(rehabSets.exercise, opts.exercise) : undefined
	].filter(Boolean);

	return db
		.select()
		.from(rehabSets)
		.where(filters.length ? and(...filters) : undefined)
		.orderBy(desc(rehabSets.day), desc(rehabSets.id))
		.limit(opts.limit ?? 200);
}

export async function addSet(values: typeof rehabSets.$inferInsert): Promise<void> {
	await db.insert(rehabSets).values(values);
}

export async function deleteSet(id: number): Promise<void> {
	await db.delete(rehabSets).where(eq(rehabSets.id, id));
}

/**
 * Il carico migliore per esercizio e lato, con quando è stato fatto.
 *
 * È il dato che serve davvero prima di una seduta — "l'ultima volta quanto ho
 * messo?" — e da portare al controllo dei sei mesi come prova che i carichi
 * salgono. Il confronto è sul carico e non sul volume: a questo punto del
 * recupero conta quanto regge il ginocchio, non quanto lavoro si accumula.
 */
export function bestByExercise(rows: RehabSetRow[]) {
	const map = new Map<string, { exercise: string; side: string | null; loadKg: number; reps: number | null; day: string }>();
	for (const r of rows) {
		if (r.loadKg == null) continue;
		// Chiave composta senza separatore da inventare: concatenare esercizio e
		// lato con un carattere qualsiasi obbliga a sceglierne uno che non possa
		// comparire nel nome di un esercizio, e quello scelto per primo era un
		// byte nullo, invisibile nell'editor e sufficiente a far classificare
		// l'intero file come binario da git.
		const key = JSON.stringify([r.exercise, r.side]);
		const current = map.get(key);
		if (!current || r.loadKg > current.loadKg) {
			map.set(key, { exercise: r.exercise, side: r.side, loadKg: r.loadKg, reps: r.reps, day: r.day });
		}
	}
	return [...map.values()].sort((a, b) => a.exercise.localeCompare(b.exercise, 'it'));
}

// ── Misure ────────────────────────────────────────────────────────────────

export type RehabMeasureRow = typeof rehabMeasures.$inferSelect;

export async function getMeasures(): Promise<RehabMeasureRow[]> {
	return db.select().from(rehabMeasures).orderBy(asc(rehabMeasures.day));
}

export async function saveMeasure(day: string, values: Partial<typeof rehabMeasures.$inferInsert>): Promise<void> {
	await db
		.insert(rehabMeasures)
		.values({ day, ...values })
		.onConflictDoUpdate({ target: rehabMeasures.day, set: values });
}

export async function deleteMeasure(day: string): Promise<void> {
	await db.delete(rehabMeasures).where(eq(rehabMeasures.day, day));
}

// ── Clinica ───────────────────────────────────────────────────────────────

export type RehabEventRow = typeof rehabEvents.$inferSelect;
export type RehabContactRow = typeof rehabContacts.$inferSelect;

export async function getEvents(): Promise<RehabEventRow[]> {
	return db.select().from(rehabEvents).orderBy(asc(rehabEvents.day), asc(rehabEvents.id));
}

export async function addEvent(values: typeof rehabEvents.$inferInsert): Promise<void> {
	await db.insert(rehabEvents).values(values);
}

export async function saveEvent(id: number, values: Partial<typeof rehabEvents.$inferInsert>): Promise<void> {
	await db.update(rehabEvents).set(values).where(eq(rehabEvents.id, id));
}

export async function deleteEvent(id: number): Promise<void> {
	await db.delete(rehabEvents).where(eq(rehabEvents.id, id));
}

export async function getContacts(): Promise<RehabContactRow[]> {
	return db.select().from(rehabContacts).orderBy(asc(rehabContacts.id));
}

export async function saveContact(id: number, values: Partial<typeof rehabContacts.$inferInsert>): Promise<void> {
	await db.update(rehabContacts).set(values).where(eq(rehabContacts.id, id));
}

/** La prossima scadenza non ancora spuntata. */
export function nextDeadline(events: RehabEventRow[], today: string): RehabEventRow | null {
	return events.filter((e) => !e.done && e.day && e.day >= today).sort((a, b) => a.day!.localeCompare(b.day!))[0] ?? null;
}

// ── Ciò che l'orologio sa già ─────────────────────────────────────────────

/**
 * Minuti di corsa registrati dall'orologio, per giorno.
 *
 * Serve a non chiedere a mano un dato che esiste già, e a incrociare la seduta
 * pianificata con quella davvero svolta. Camminata ed escursione restano fuori:
 * il protocollo conta i minuti di corsa, non quelli in piedi.
 */
export async function getRunMinutesByDay(from: string, to: string): Promise<Record<string, number>> {
	const rows = await db
		.select({
			day: workouts.day,
			sec: sql<number>`coalesce(sum(${workouts.durationSec}), 0)`
		})
		.from(workouts)
		.where(
			and(
				gte(workouts.day, from),
				lte(workouts.day, to),
				inArray(workouts.type, ['HKWorkoutActivityTypeRunning', 'Running'])
			)
		)
		.groupBy(workouts.day);

	return Object.fromEntries(rows.map((r) => [r.day, Math.round(Number(r.sec) / 60)]));
}

// ── Riepilogo della settimana ─────────────────────────────────────────────

export interface WeekSummary {
	week: number;
	from: string;
	to: string;
	fkt: number;
	upperBody: number;
	runs: number;
	/** Media del dolore sui giorni in cui è stato registrato. */
	painAvg: number | null;
	painWorst: number | null;
	/** Giorni con gonfiore diverso da "no". */
	swellingDays: number;
	/** Giorni in cui le proteine hanno raggiunto il minimo, sui giorni compilati. */
	proteinHit: number;
	proteinLogged: number;
	proteinAvg: number | null;
	caloriesAvg: number | null;
	weightAvg: number | null;
	/** Giorni della settimana già trascorsi, per non giudicare una settimana in corso. */
	elapsed: number;
	logged: number;
}

/**
 * Riduce una settimana ai numeri della formula d'oro.
 *
 * `elapsed` è quello che tiene onesta la pagina: senza, la settimana in corso
 * al martedì mostrerebbe "0 corse su 2" come se fosse un fallimento invece che
 * una settimana appena cominciata.
 */
export function summarizeWeek(
	week: number,
	days: EffectiveDay[],
	runs: RunWithOutcome[],
	proteinMinG: number,
	today: string
): WeekSummary {
	const from = weekStart(week);
	const to = weekEnd(week);
	const inWeek = days.filter((d) => d.day >= from && d.day <= to);

	const num = (xs: (number | null)[]) => xs.filter((x): x is number => x != null);
	const pains = num(inWeek.map((d) => d.pain));
	const proteins = num(inWeek.map((d) => d.proteinG.value));
	const calories = num(inWeek.map((d) => d.calories.value));
	const weights = num(inWeek.map((d) => d.weightKg.value));

	const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

	return {
		week,
		from,
		to,
		fkt: inWeek.filter((d) => d.fkt).length,
		upperBody: inWeek.filter((d) => d.upperBody).length,
		runs: runs.filter((r) => r.actualRunMin != null && r.effectiveDay >= from && r.effectiveDay <= to).length,
		painAvg: mean(pains),
		painWorst: pains.length ? Math.max(...pains) : null,
		swellingDays: inWeek.filter((d) => d.swelling && d.swelling !== 'no').length,
		proteinHit: proteins.filter((p) => p >= proteinMinG).length,
		proteinLogged: proteins.length,
		proteinAvg: mean(proteins),
		caloriesAvg: mean(calories),
		weightAvg: mean(weights),
		elapsed: weekDays(week).filter((d) => d <= today).length,
		// Solo i giorni davvero compilati a mano: le calorie sincronizzate da sole
		// non fanno una giornata registrata, e la formula d'oro deve continuare a
		// chiederla invece di considerarla chiusa.
		logged: inWeek.filter((d) => d.logged).length
	};
}

/** Le righe della formula d'oro, nell'ordine in cui è scritta nel protocollo. */
export interface LedgerRow {
	label: string;
	detail: string;
	done: number;
	target: number;
	/** Come si legge il numero: quanti su quanti, oppure un valore con unità. */
	unit?: string;
	met: boolean;
	/** Vero quando il traguardo è ancora raggiungibile nei giorni che restano. */
	pending: boolean;
}

export function goldenFormula(s: WeekSummary, config: Config): LedgerRow[] {
	const left = 7 - s.elapsed;

	/**
	 * Una settimana senza nemmeno un giorno compilato non rispetta niente.
	 *
	 * Senza questo, "zero gonfiore" risulterebbe centrata in ogni settimana mai
	 * aperta: zero giorni gonfi è vero anche quando non è stato misurato niente,
	 * ma è vero nel modo sbagliato. Non compilato non è andato bene.
	 */
	const anyData = s.logged > 0;

	const rule = (label: string, detail: string, done: number, target: number): LedgerRow => ({
		label,
		detail,
		done,
		target,
		met: anyData && done >= target,
		pending: done < target && done + left >= target
	});

	return [
		rule('Fisioterapia', `${WEEKLY_TARGETS.fkt} sedute a settimana, la priorità`, s.fkt, WEEKLY_TARGETS.fkt),
		rule('Parte alta', `${WEEKLY_TARGETS.upperBody} sedute, rotazione A · B · C`, s.upperBody, WEEKLY_TARGETS.upperBody),
		rule('Corsa lineare', `${WEEKLY_TARGETS.runs} sedute facili, niente cambi di direzione`, s.runs, WEEKLY_TARGETS.runs),
		{
			label: 'Proteine',
			detail: `Almeno ${config.proteinMinG} g al giorno, anche nei giorni di riposo`,
			done: s.proteinHit,
			target: Math.max(1, s.elapsed),
			unit: s.elapsed === 1 ? 'giorno' : 'giorni',
			met: s.proteinLogged > 0 && s.proteinHit >= s.elapsed,
			pending: s.proteinLogged < s.elapsed
		},
		{
			label: 'Zero gonfiore',
			detail: 'Nessuna sera con il ginocchio gonfio',
			done: s.swellingDays,
			target: 0,
			unit: s.swellingDays === 1 ? 'giorno' : 'giorni',
			met: anyData && s.swellingDays === 0,
			pending: false
		}
	];
}
