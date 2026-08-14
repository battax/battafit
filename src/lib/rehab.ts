/**
 * Il dominio del recupero post-ricostruzione LCA.
 *
 * Tutto ciò che qui è costante viene dal protocollo concordato con i
 * professionisti — date dell'intervento e dei controlli, progressione della
 * corsa, soglie di dolore e gonfiore, segnali d'allarme. Non è materiale
 * generato dall'app: sta in un unico file perché la regola che decide se una
 * corsa è andata bene deve essere la stessa nel grafico, nella tabella e nel
 * riepilogo, e perché rileggerla tutta insieme è l'unico modo per accorgersi
 * se una soglia è cambiata.
 *
 * Le soglie che il proprietario può cambiare da solo (calorie, proteine,
 * acqua, sonno, peso obiettivo) non stanno qui: vivono in `rehab_config`, e i
 * valori sotto sono solo il punto di partenza con cui la tabella viene seminata.
 */

// ── Il blocco ─────────────────────────────────────────────────────────────

/** Ricostruzione LCA con tendine rotuleo, radice del menisco mediale e plastica laterale, ginocchio destro. */
export const SURGERY_DAY = '2026-04-27';
export const SURGERY_LABEL = 'Ricostruzione LCA con TR + radice ME + plastica laterale, ginocchio destro';

/** Primo giorno monitorato: il blocco di 13 settimane parte dal controllo dei 3 mesi. */
export const TRACKER_START = '2026-08-12';
export const PROTOCOL_WEEKS = 13;

/**
 * La formula d'oro della settimana, così come è scritta nel protocollo.
 *
 * È un contratto settimanale, non un punteggio: ogni riga si legge da sola e
 * vale quanto le altre. Per questo la pagina la mostra come un registro di
 * righe e non come una percentuale unica — una media nasconderebbe proprio la
 * riga che è saltata.
 */
export const WEEKLY_TARGETS = {
	fkt: 3,
	upperBody: 3,
	runs: 2
} as const;

/** Oltre questo valore il dolore smette di essere rumore di fondo e diventa un segnale. */
export const PAIN_ALERT = 3;

/** Soglia per considerare tollerata una seduta di corsa (dolore durante e al mattino dopo). */
export const RUN_PAIN_LIMIT = 2;

// ── Scale ordinate ────────────────────────────────────────────────────────

/**
 * Il gonfiore è una grandezza ordinata, non quattro categorie: nel grafico usa
 * una sola tinta a intensità crescente, mai quattro colori diversi.
 */
export const SWELLING = [
	{ key: 'no', label: 'No', severity: 0 },
	{ key: 'lieve', label: 'Lieve', severity: 1 },
	{ key: 'moderato', label: 'Moderato', severity: 2 },
	{ key: 'forte', label: 'Forte', severity: 3 }
] as const;

export type SwellingKey = (typeof SWELLING)[number]['key'];

export const SWELLING_BY_KEY = new Map<string, (typeof SWELLING)[number]>(SWELLING.map((s) => [s.key, s]));

export function swellingSeverity(key: string | null | undefined): number | null {
	if (!key) return null;
	return SWELLING_BY_KEY.get(key)?.severity ?? null;
}

/** Come si sveglia il ginocchio il mattino dopo una seduta. */
export const MORNING = [
	{ key: 'meglio', label: 'Meglio' },
	{ key: 'uguale', label: 'Uguale' },
	{ key: 'peggio', label: 'Peggio' }
] as const;

export type MorningKey = (typeof MORNING)[number]['key'];

/** Superfici autorizzate: la corsa resta lineare, niente cambi di direzione. */
export const SURFACES = ['Tapis roulant', 'Rettilineo piano', 'Altro autorizzato'] as const;

/** Lato del corpo, per i carichi che si misurano separatamente. */
export const SIDES = [
	{ key: 'destro', label: 'Destro' },
	{ key: 'sinistro', label: 'Sinistro' },
	{ key: 'entrambi', label: 'Entrambi' }
] as const;

/** Le sedute in palestra. FKT è la fisioterapia, le altre tre sono le rotazioni di parte alta. */
export const SESSION_KINDS = [
	{ key: 'fkt', label: 'FKT' },
	{ key: 'alta-a', label: 'Parte alta A' },
	{ key: 'alta-b', label: 'Parte alta B' },
	{ key: 'alta-c', label: 'Parte alta C' }
] as const;

export type SessionKind = (typeof SESSION_KINDS)[number]['key'];

/** Le lettere della rotazione, come compaiono nel registro giornaliero. */
export const UPPER_BODY = ['A', 'B', 'C'] as const;

// ── La progressione della corsa ───────────────────────────────────────────

export interface PlannedRun {
	plannedOn: string;
	protocolWeek: number;
	protocol: string;
	walkMin: number;
	runMin: number;
}

/**
 * Dodici sedute in sei settimane, con il cammino che cala e la corsa che sale.
 * Le date sono quelle previste: la seduta si può fare in un altro giorno, ma la
 * riga resta la stessa, così la progressione non si riordina da sola.
 */
export const RUN_PLAN: PlannedRun[] = [
	{ plannedOn: '2026-08-15', protocolWeek: 1, protocol: '5′ cammino + 1′ corsa × 5', walkMin: 25, runMin: 5 },
	{ plannedOn: '2026-08-18', protocolWeek: 1, protocol: '5′ cammino + 1′ corsa × 5', walkMin: 25, runMin: 5 },
	{ plannedOn: '2026-08-22', protocolWeek: 2, protocol: '4′ cammino + 2′ corsa × 5', walkMin: 20, runMin: 10 },
	{ plannedOn: '2026-08-25', protocolWeek: 2, protocol: '4′ cammino + 2′ corsa × 5', walkMin: 20, runMin: 10 },
	{ plannedOn: '2026-08-29', protocolWeek: 3, protocol: '3′ cammino + 3′ corsa × 5', walkMin: 15, runMin: 15 },
	{ plannedOn: '2026-09-01', protocolWeek: 3, protocol: '3′ cammino + 3′ corsa × 5', walkMin: 15, runMin: 15 },
	{ plannedOn: '2026-09-05', protocolWeek: 4, protocol: '2′ cammino + 4′ corsa × 5', walkMin: 10, runMin: 20 },
	{ plannedOn: '2026-09-08', protocolWeek: 4, protocol: '2′ cammino + 4′ corsa × 5', walkMin: 10, runMin: 20 },
	{ plannedOn: '2026-09-12', protocolWeek: 5, protocol: '1′ cammino + 5′ corsa × 5', walkMin: 5, runMin: 25 },
	{ plannedOn: '2026-09-15', protocolWeek: 5, protocol: '1′ cammino + 5′ corsa × 5', walkMin: 5, runMin: 25 },
	{ plannedOn: '2026-09-19', protocolWeek: 6, protocol: '15′ corsa continua facile', walkMin: 10, runMin: 15 },
	{ plannedOn: '2026-09-22', protocolWeek: 6, protocol: '20′ corsa continua facile', walkMin: 10, runMin: 20 }
];

/**
 * Le date previste per il metro, una ogni quattro settimane.
 *
 * Non vengono seminate come righe vuote: una tabella di misurazioni mai fatte
 * sembrerebbe uno storico invece di un calendario. Servono solo a dire quando
 * tocca e a proporre la data giusta nel form.
 */
export const MEASURE_PLAN = ['2026-08-12', '2026-09-09', '2026-10-07', '2026-11-04', '2026-12-02'] as const;

export type RunOutcome = 'ok' | 'ripeti' | 'da-valutare';

export interface RunResponse {
	actualRunMin: number | null;
	painDuring: number | null;
	swellingEvening: string | null;
	morningAfter: string | null;
	painMorning: number | null;
}

/**
 * La regola che decide se si può salire di carico.
 *
 * Serve la risposta completa a 24 ore: senza il mattino dopo non si sa niente,
 * e "non si sa" non è "è andata bene". Per questo l'esito incompleto resta
 * esplicitamente `da-valutare` invece di scivolare su un valore ottimista.
 *
 * È una funzione pura e non una colonna del database apposta: se domani la
 * soglia cambia, tutte le sedute passate si rileggono con la regola nuova
 * invece di restare congelate su un giudizio vecchio.
 */
export function runOutcome(r: RunResponse): RunOutcome {
	if (
		r.actualRunMin == null ||
		r.painDuring == null ||
		r.swellingEvening == null ||
		r.morningAfter == null ||
		r.painMorning == null
	) {
		return 'da-valutare';
	}

	const tollerata =
		r.painDuring <= RUN_PAIN_LIMIT &&
		r.painMorning <= RUN_PAIN_LIMIT &&
		r.swellingEvening === 'no' &&
		(r.morningAfter === 'uguale' || r.morningAfter === 'meglio');

	return tollerata ? 'ok' : 'ripeti';
}

export const RUN_OUTCOME_LABEL: Record<RunOutcome, string> = {
	ok: 'Tollerata',
	ripeti: 'Ripeti il livello',
	'da-valutare': 'Da valutare'
};

// ── Scadenze cliniche e segnali ───────────────────────────────────────────

export interface ClinicalEventSeed {
	day: string;
	title: string;
	detail: string;
	done: boolean;
}

export const CLINICAL_SEED: ClinicalEventSeed[] = [
	{ day: SURGERY_DAY, title: 'Intervento', detail: SURGERY_LABEL, done: true },
	{
		day: '2026-08-12',
		title: 'Controllo 3 mesi',
		detail: 'Ginocchio asciutto, ROM completo, importante ipotrofia quadricipitale',
		done: true
	},
	{
		day: '2026-09-21',
		title: 'Fine minima restrizione',
		detail: 'Non iniziare automaticamente balzi e cambi di direzione: serve una valutazione funzionale',
		done: false
	},
	{
		day: '2026-10-27',
		title: 'Controllo 6 mesi',
		detail: 'Confermare la data e portare andamento corsa, misure e carichi',
		done: false
	}
];

/**
 * I quattro segnali che interrompono il protocollo.
 *
 * Sono riportati parola per parola dalle indicazioni cliniche: l'app li mostra,
 * non li interpreta e non li aggiorna. L'azione accanto a ciascuno è quella
 * concordata, e resta la stessa anche quando i numeri della settimana sono buoni.
 */
export const RED_FLAGS = [
	{ sign: 'Gonfiore nuovo o crescente', action: 'Ridurre o sospendere e confrontarsi con il fisioterapista' },
	{ sign: 'Perdita di estensione, blocco o cedimento', action: 'Interrompere e contattare il professionista' },
	{ sign: 'Febbre, ginocchio molto caldo o rosso', action: 'Contatto medico rapido' },
	{ sign: 'Dolore o gonfiore improvviso del polpaccio', action: 'Contatto medico rapido' }
] as const;

export const SOURCES = [
	{
		title: 'Aspetar ACL guideline',
		url: 'https://www.aspetar.com/en/professionals/aspetar-clinical-guidelines/recommendations-on-rehabilitation-after-aclr',
		note: 'Rinforzo e criteri di progressione'
	},
	{
		title: 'Mass General ACL protocol',
		url: 'https://www.massgeneral.org/assets/mgh/pdf/orthopaedics/sports-medicine/physical-therapy/rehabilitation-protocol-for-acl.pdf',
		note: 'Corsa e risposta di dolore e gonfiore'
	},
	{
		title: 'ISSN protein position stand',
		url: 'https://link.springer.com/article/10.1186/s12970-017-0177-8',
		note: 'Proteine ed esercizio'
	}
] as const;

export const DISCLAIMER =
	'Questa sezione serve a monitorare, non a decidere. Le indicazioni di chirurgo, fisioterapista e dietista hanno sempre la precedenza su qualsiasi numero mostrato qui.';

/** I tre ruoli da avere sottomano; i recapiti si compilano dalla pagina Protocollo. */
export const CONTACT_ROLES = ['Chirurgo o ortopedico', 'Fisioterapista', 'Medico o dietista'] as const;

/** Valori di partenza di `rehab_config`, dal foglio Impostazioni. */
export const CONFIG_DEFAULTS = {
	startWeightKg: 83.5,
	targetWeightKg: 80,
	caloriesTarget: 2350,
	proteinMinG: 160,
	proteinTargetG: 170,
	proteinHighG: 175,
	weeklyLossMinKg: 0.2,
	weeklyLossMaxKg: 0.4,
	waterTargetL: 2.5,
	sleepMinH: 7.5
} as const;

// ── Aritmetica dei giorni ─────────────────────────────────────────────────
//
// Sempre su stringhe 'YYYY-MM-DD' passando per UTC: usando `new Date(day)` in
// ora locale, un fuso a est di Greenwich sposta il giorno indietro di uno e
// tutta la griglia delle settimane scivola.

export function dayToUtc(day: string): Date {
	return new Date(day + 'T00:00:00Z');
}

export function addDays(day: string, n: number): string {
	const d = dayToUtc(day);
	d.setUTCDate(d.getUTCDate() + n);
	return d.toISOString().slice(0, 10);
}

export function diffDays(from: string, to: string): number {
	return Math.round((dayToUtc(to).getTime() - dayToUtc(from).getTime()) / 86_400_000);
}

/**
 * Il giorno corrente in Italia.
 *
 * Il server gira in UTC: dopo mezzanotte e prima delle due, l'ora italiana è
 * già il giorno dopo mentre UTC è ancora il giorno prima. Registrare la
 * giornata sbagliata all'una di notte è esattamente il caso che capita.
 */
export function todayRome(): string {
	return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date());
}

/** Settimana di protocollo (1–13) a cui appartiene un giorno, oltre i bordi inclusa. */
export function weekOf(day: string): number {
	return Math.floor(diffDays(TRACKER_START, day) / 7) + 1;
}

/** Settimana corrente, tenuta dentro i confini del blocco. */
export function currentWeek(day: string): number {
	return Math.max(1, Math.min(PROTOCOL_WEEKS, weekOf(day)));
}

export function weekStart(week: number): string {
	return addDays(TRACKER_START, (week - 1) * 7);
}

export function weekEnd(week: number): string {
	return addDays(TRACKER_START, week * 7 - 1);
}

/** I sette giorni di una settimana di protocollo, dal primo all'ultimo. */
export function weekDays(week: number): string[] {
	const start = weekStart(week);
	return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

const DAY_FMT = new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const LONG_FMT = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const SHORT_FMT = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', timeZone: 'UTC' });

export function formatDay(day: string): string {
	return DAY_FMT.format(dayToUtc(day));
}

export function formatDayLong(day: string): string {
	return LONG_FMT.format(dayToUtc(day));
}

export function formatDayShort(day: string): string {
	return SHORT_FMT.format(dayToUtc(day));
}
