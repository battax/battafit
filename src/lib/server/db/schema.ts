import {
	pgTable,
	date,
	text,
	real,
	integer,
	timestamp,
	jsonb,
	boolean,
	primaryKey,
	index,
	serial
} from 'drizzle-orm/pg-core';

/**
 * Aggregati giornalieri. Una riga per (giorno, metrica).
 *
 * L'export di Apple Health contiene milioni di campioni singoli (una battuta
 * cardiaca ogni pochi secondi, i passi spezzati in decine di record al giorno).
 * Tenerli grezzi renderebbe il DB enorme e le query lente, quindi la CLI di
 * ingest li riduce a questa tabella: per ogni metrica riempie solo i campi di
 * aggregazione che hanno senso (i passi usano `sum`, la frequenza a riposo
 * usa `avg`, il peso usa `last`).
 */
export const dailyMetrics = pgTable(
	'daily_metrics',
	{
		day: date('day').notNull(),
		metric: text('metric').notNull(),
		sum: real('sum'),
		avg: real('avg'),
		min: real('min'),
		max: real('max'),
		last: real('last'),
		count: integer('count').notNull().default(0),
		unit: text('unit')
	},
	(t) => [primaryKey({ columns: [t.day, t.metric] }), index('daily_metrics_metric_day_idx').on(t.metric, t.day)]
);

/** Un allenamento. `id` è deterministico (hash di inizio+tipo+sorgente) per rendere l'ingest idempotente. */
export const workouts = pgTable(
	'workouts',
	{
		id: text('id').primaryKey(),
		type: text('type').notNull(),
		day: date('day').notNull(),
		startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
		endedAt: timestamp('ended_at', { withTimezone: true }).notNull(),
		durationSec: real('duration_sec').notNull(),
		energyKcal: real('energy_kcal'),
		distanceKm: real('distance_km'),
		avgHr: real('avg_hr'),
		maxHr: real('max_hr'),
		elevationM: real('elevation_m'),
		indoor: boolean('indoor').notNull().default(false),
		source: text('source'),
		/** Traccia GPS: array di punti [lon, lat, quota_m, offset_sec]. Null per gli allenamenti indoor. */
		route: jsonb('route').$type<[number, number, number | null, number][] | null>(),
		/** Bounding box della traccia [minLon, minLat, maxLon, maxLat], per inquadrare la mappa senza leggere tutti i punti. */
		routeBbox: jsonb('route_bbox').$type<[number, number, number, number] | null>()
	},
	(t) => [index('workouts_started_at_idx').on(t.startedAt), index('workouts_type_idx').on(t.type)]
);

/** Frequenza cardiaca campionata dentro un allenamento, per il grafico di dettaglio. Downsampled dalla CLI. */
export const workoutSamples = pgTable(
	'workout_samples',
	{
		workoutId: text('workout_id')
			.notNull()
			.references(() => workouts.id, { onDelete: 'cascade' }),
		offsetSec: integer('offset_sec').notNull(),
		bpm: real('bpm').notNull()
	},
	(t) => [primaryKey({ columns: [t.workoutId, t.offsetSec] })]
);

/**
 * Una notte di sonno. `day` è il giorno del risveglio: è la convenzione che usa
 * anche Apple, così "il sonno di martedì" è la notte fra lunedì e martedì.
 */
export const sleepSessions = pgTable(
	'sleep_sessions',
	{
		id: text('id').primaryKey(),
		day: date('day').notNull(),
		startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
		endedAt: timestamp('ended_at', { withTimezone: true }).notNull(),
		inBedSec: real('in_bed_sec'),
		asleepSec: real('asleep_sec'),
		deepSec: real('deep_sec'),
		coreSec: real('core_sec'),
		remSec: real('rem_sec'),
		awakeSec: real('awake_sec'),
		source: text('source')
	},
	(t) => [index('sleep_day_idx').on(t.day)]
);

/** Storico delle importazioni, per sapere quando i dati sono stati aggiornati l'ultima volta. */
export const ingestRuns = pgTable('ingest_runs', {
	id: serial('id').primaryKey(),
	startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
	finishedAt: timestamp('finished_at', { withTimezone: true }),
	source: text('source').notNull(),
	recordsRead: integer('records_read').notNull().default(0),
	daysWritten: integer('days_written').notNull().default(0),
	workoutsWritten: integer('workouts_written').notNull().default(0),
	sleepWritten: integer('sleep_written').notNull().default(0),
	note: text('note')
});

/* ────────────────────────────────────────────────────────────────────────────
 * Recupero LCA
 *
 * Tutto ciò che nessun sensore può sapere. L'orologio misura passi, sonno, peso
 * e minuti di corsa; non sa quanto fa male il ginocchio, se è gonfio la sera, se
 * la seduta di fisioterapia è stata fatta e quante proteine sono entrate. Queste
 * tabelle tengono solo quella metà, e le pagine la affiancano ai dati di Salute
 * invece di richiederli una seconda volta.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Una giornata del registro. La chiave è il giorno: si può correggere quante
 * volte si vuole, resta una riga sola.
 *
 * `weightKg` e `waistCm` sono qui pur essendo misure del corpo: il peso perché
 * senza bilancia connessa non arriva a Salute e va scritto a mano, il girovita
 * perché Salute non lo prevede affatto. Se Salute ha il peso di quel giorno,
 * vince quello e questa colonna resta vuota.
 */
export const rehabDays = pgTable(
	'rehab_days',
	{
		day: date('day').primaryKey(),
		/** Dolore al ginocchio, 0–10. */
		pain: integer('pain'),
		/** Gonfiore: no, lieve, moderato, forte. */
		swelling: text('swelling'),
		/** Seduta di fisioterapia svolta. */
		fkt: boolean('fkt').notNull().default(false),
		/** Rotazione di parte alta svolta: A, B o C. */
		upperBody: text('upper_body'),
		calories: real('calories'),
		proteinG: real('protein_g'),
		carbsG: real('carbs_g'),
		fatG: real('fat_g'),
		waterL: real('water_l'),
		weightKg: real('weight_kg'),
		waistCm: real('waist_cm'),
		note: text('note'),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('rehab_days_swelling_idx').on(t.swelling)]
);

/**
 * Le sedute della progressione di corsa.
 *
 * Le dodici righe nascono già scritte con il protocollo previsto e vengono
 * completate dopo. L'esito non è una colonna: è una funzione di quello che c'è
 * scritto (`runOutcome` in `$lib/rehab`), così una soglia che cambia rilegge
 * anche il passato invece di lasciarlo congelato su un giudizio vecchio.
 */
export const rehabRuns = pgTable(
	'rehab_runs',
	{
		id: serial('id').primaryKey(),
		/** Data prevista dal protocollo: identifica la seduta anche se viene spostata. */
		plannedOn: date('planned_on').notNull().unique(),
		protocolWeek: integer('protocol_week').notNull(),
		protocol: text('protocol').notNull(),
		walkMin: real('walk_min').notNull(),
		runMin: real('run_min').notNull(),

		/** Giorno in cui è stata davvero fatta, se diverso da quello previsto. */
		doneOn: date('done_on'),
		surface: text('surface'),
		actualRunMin: real('actual_run_min'),
		avgSpeedKmh: real('avg_speed_kmh'),
		painDuring: integer('pain_during'),
		swellingEvening: text('swelling_evening'),
		morningAfter: text('morning_after'),
		painMorning: integer('pain_morning'),
		note: text('note')
	},
	(t) => [index('rehab_runs_week_idx').on(t.protocolWeek)]
);

/** Una serie in palestra. Il lato conta: il quadricipite destro è quello operato. */
export const rehabSets = pgTable(
	'rehab_sets',
	{
		id: serial('id').primaryKey(),
		day: date('day').notNull(),
		/** fkt, alta-a, alta-b, alta-c. */
		kind: text('kind').notNull(),
		exercise: text('exercise').notNull(),
		side: text('side'),
		sets: integer('sets'),
		reps: integer('reps'),
		loadKg: real('load_kg'),
		/** Ripetizioni di riserva a fine serie. */
		rir: integer('rir'),
		painBefore: integer('pain_before'),
		painAfter: integer('pain_after'),
		swellingNextDay: text('swelling_next_day'),
		note: text('note')
	},
	(t) => [index('rehab_sets_day_idx').on(t.day), index('rehab_sets_exercise_idx').on(t.exercise)]
);

/**
 * Le misure con il metro, ogni quattro settimane.
 *
 * La colonna che conta davvero è la differenza fra le due cosce: al controllo
 * dei 3 mesi l'ipotrofia del quadricipite è stata segnalata come il problema
 * aperto, e questa è l'unica misura che dice se si sta chiudendo.
 */
export const rehabMeasures = pgTable('rehab_measures', {
	day: date('day').primaryKey(),
	waistCm: real('waist_cm'),
	thighRightCm: real('thigh_right_cm'),
	thighLeftCm: real('thigh_left_cm'),
	chestCm: real('chest_cm'),
	armRightCm: real('arm_right_cm'),
	armLeftCm: real('arm_left_cm'),
	photo: boolean('photo').notNull().default(false),
	note: text('note')
});

/** Cronologia clinica: interventi, controlli, scadenze. */
export const rehabEvents = pgTable(
	'rehab_events',
	{
		id: serial('id').primaryKey(),
		day: date('day'),
		title: text('title').notNull(),
		detail: text('detail'),
		professional: text('professional'),
		done: boolean('done').notNull().default(false),
		note: text('note')
	},
	(t) => [index('rehab_events_day_idx').on(t.day)]
);

/** I recapiti da avere sottomano quando serve fermarsi. */
export const rehabContacts = pgTable('rehab_contacts', {
	id: serial('id').primaryKey(),
	role: text('role').notNull(),
	name: text('name'),
	contact: text('contact'),
	lastContact: date('last_contact'),
	nextAppointment: date('next_appointment'),
	note: text('note')
});

/**
 * Gli obiettivi del blocco, in una riga sola (`id` fisso a 1).
 *
 * Stanno nel database e non fra le costanti perché sono gli unici numeri del
 * protocollo che il proprietario può cambiare da sé: il peso obiettivo si
 * sposta, le date dei controlli no.
 */
export const rehabConfig = pgTable('rehab_config', {
	id: integer('id').primaryKey().default(1),
	startWeightKg: real('start_weight_kg'),
	targetWeightKg: real('target_weight_kg'),
	caloriesTarget: real('calories_target'),
	proteinMinG: real('protein_min_g'),
	proteinTargetG: real('protein_target_g'),
	proteinHighG: real('protein_high_g'),
	weeklyLossMinKg: real('weekly_loss_min_kg'),
	weeklyLossMaxKg: real('weekly_loss_max_kg'),
	waterTargetL: real('water_target_l'),
	sleepMinH: real('sleep_min_h')
});

export type DailyMetric = typeof dailyMetrics.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type WorkoutSample = typeof workoutSamples.$inferSelect;
export type SleepSession = typeof sleepSessions.$inferSelect;
export type IngestRun = typeof ingestRuns.$inferSelect;
export type RehabDay = typeof rehabDays.$inferSelect;
export type RehabRun = typeof rehabRuns.$inferSelect;
export type RehabSet = typeof rehabSets.$inferSelect;
export type RehabMeasure = typeof rehabMeasures.$inferSelect;
export type RehabEvent = typeof rehabEvents.$inferSelect;
export type RehabContact = typeof rehabContacts.$inferSelect;
export type RehabConfig = typeof rehabConfig.$inferSelect;
