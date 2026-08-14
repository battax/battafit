/**
 * Sintesi in parole di quello che i grafici mostrano in forma.
 *
 * Regola unica e non negoziabile: qui non si deduce niente. Ogni frase è la
 * lettura ad alta voce di un numero che sta già a schermo — quanti obiettivi
 * sono chiusi, di quanto i passi si scostano dalla media, se il sonno è stato
 * registrato. Se il dato manca, la frase non esiste; non viene stimata, non
 * viene arrotondata a zero e non viene sostituita da un incoraggiamento.
 *
 * È il motivo per cui il pannello non si chiama "Insight AI" come nei mockup:
 * non c'è nessun modello dietro, c'è una divisione. Prometterne uno vorrebbe
 * dire far leggere queste frasi con una fiducia che non si sono guadagnate.
 */

export interface Clause {
	text: string;
	/** `attention` non è un allarme: è solo ciò che vale la pena guardare per primo. */
	tone: 'neutral' | 'good' | 'attention';
}

const nf0 = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 });

/** "un", "due", "tre": sotto il quattro le cifre in mezzo a una frase stonano. */
const WORDS = ['nessun', 'un', 'due', 'tre'] as const;

/** Scostamento percentuale, `null` quando manca un termine o il paragone è vuoto. */
function deviation(value: number | null | undefined, baseline: number | null | undefined): number | null {
	if (value == null || baseline == null || !Number.isFinite(value) || !Number.isFinite(baseline)) return null;
	if (baseline === 0) return null;
	return ((value - baseline) / Math.abs(baseline)) * 100;
}

/** Durata in ore decimali → "7h 14m". */
function hours(value: number): string {
	const h = Math.floor(value);
	const m = Math.round((value - h) * 60);
	return m === 0 ? `${h}h` : `${h}h ${String(m).padStart(2, '0')}m`;
}

export interface DayInput {
	rings: { value: number | null | undefined; goal: number | null | undefined }[];
	steps: number | null | undefined;
	stepsBaseline: number | null | undefined;
	sleepHours: number | null | undefined;
	/** Allenamenti **di quel giorno**, non gli ultimi registrati in assoluto. */
	workouts: number;
	/** Il giorno mostrato è quello in corso: cambia i tempi verbali e ammette "ancora". */
	isToday: boolean;
}

export function daySummary(input: DayInput): Clause[] {
	const out: Clause[] = [];

	const withGoal = input.rings.filter((r) => r.value != null && r.goal);
	if (withGoal.length) {
		const closed = withGoal.filter((r) => (r.value as number) / (r.goal as number) >= 1).length;
		if (closed === 3) {
			out.push({ text: 'Tutti e tre gli obiettivi sono chiusi.', tone: 'good' });
		} else if (closed === 0) {
			out.push({
				text: input.isToday ? 'Nessun obiettivo ancora chiuso.' : 'Nessun obiettivo chiuso.',
				tone: 'attention'
			});
		} else {
			out.push({
				text: `${WORDS[closed]} obiettivo su tre ${input.isToday ? 'già chiuso' : 'chiuso'}.`.replace(/^./, (c) =>
					c.toUpperCase()
				),
				tone: 'neutral'
			});
		}
	}

	const stepsDev = deviation(input.steps, input.stepsBaseline);
	if (stepsDev != null && Math.abs(stepsDev) >= 5) {
		out.push({
			text: `Passi ${nf0.format(Math.abs(stepsDev))}% ${stepsDev > 0 ? 'sopra' : 'sotto'} la media di trenta giorni.`,
			tone: stepsDev > 0 ? 'good' : 'attention'
		});
	} else if (stepsDev != null) {
		out.push({ text: 'Passi in linea con la media di trenta giorni.', tone: 'neutral' });
	}

	if (input.sleepHours != null) {
		out.push({ text: `${hours(input.sleepHours)} di sonno registrati.`, tone: 'neutral' });
	} else if (!input.isToday) {
		// Su oggi il sonno arriva dopo, e dirlo mancante a metà giornata sarebbe
		// una nota su un dato che non era ancora dovuto.
		out.push({ text: 'Sonno non registrato in questa giornata.', tone: 'neutral' });
	}

	if (input.workouts > 0) {
		const n = input.workouts <= 3 ? WORDS[input.workouts] : nf0.format(input.workouts);
		out.push({
			text: `${n} ${input.workouts === 1 ? 'allenamento registrato' : 'allenamenti registrati'}.`.replace(/^./, (c) =>
				c.toUpperCase()
			),
			tone: 'good'
		});
	}

	return out;
}

const dayFormat = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', timeZone: 'UTC' });

export interface PeriodInput {
	/** Giornate del periodo che hanno almeno il dato dei passi. */
	daysWithData: number;
	/** Giornate del periodo in tutto, buchi compresi. */
	daysInPeriod: number;
	stepsPerDay: number | null;
	/** Media al giorno del periodo precedente di pari durata. `null` su "Tutto". */
	previousStepsPerDay: number | null;
	best: { day: string; value: number } | null;
	ringsClosed: number;
}

/**
 * La lettura del periodo scelto: media, confronto con il periodo prima, picco,
 * copertura. Sono le quattro domande che un grafico a trenta barre lascia
 * sempre aperte, e nessuna richiede di guardarlo due volte.
 */
export function periodInsight(input: PeriodInput): Clause[] {
	const out: Clause[] = [];

	if (input.stepsPerDay != null) {
		out.push({ text: `Media di ${nf0.format(input.stepsPerDay)} passi al giorno.`, tone: 'neutral' });
	}

	const dev = deviation(input.stepsPerDay, input.previousStepsPerDay);
	if (dev != null && Math.abs(dev) >= 3) {
		out.push({
			text: `${nf0.format(Math.abs(dev))}% ${dev > 0 ? 'più' : 'meno'} del periodo precedente di pari durata.`,
			tone: dev > 0 ? 'good' : 'attention'
		});
	} else if (dev != null) {
		out.push({ text: 'In linea con il periodo precedente di pari durata.', tone: 'neutral' });
	}

	if (input.best) {
		out.push({
			text: `Giornata più alta il ${dayFormat.format(new Date(input.best.day + 'T00:00:00Z'))}, ${nf0.format(input.best.value)} passi.`,
			tone: 'neutral'
		});
	}

	if (input.ringsClosed > 0) {
		out.push({
			text: `Tutti e tre gli anelli chiusi in ${nf0.format(input.ringsClosed)} ${input.ringsClosed === 1 ? 'giornata' : 'giornate'} su ${nf0.format(input.daysWithData)}.`,
			tone: 'good'
		});
	}

	// La copertura si nomina solo quando manca qualcosa: dire "nessun buco" a
	// ogni caricamento è rumore, dire che ne mancano dodici è un'informazione.
	const missing = input.daysInPeriod - input.daysWithData;
	if (missing > 0) {
		out.push({
			text: `${nf0.format(missing)} ${missing === 1 ? 'giornata' : 'giornate'} senza dati nel periodo.`,
			tone: 'attention'
		});
	}

	return out;
}
