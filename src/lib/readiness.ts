/**
 * Prontezza: quanto oggi si scosta dal tuo normale.
 *
 * ─── Cosa questo file non fa ────────────────────────────────────────────────
 *
 * Non dice se puoi allenarti, non assegna un voto e non consiglia un carico.
 * Le regole su cosa fare con questo ginocchio le ha date il fisioterapista e
 * stanno in `rehab.ts`; qui si calcola una cosa sola, dichiarata per intero:
 * di quanto le quattro letture di oggi si allontanano dalla media delle
 * sessanta giornate precedenti.
 *
 * È per questo che il risultato è un numero con il segno e non un punteggio da
 * 0 a 100. Un voto assoluto pretende una scala assoluta — un 72 su cento
 * dovrebbe voler dire qualcosa per chiunque — mentre l'unico metro che questi
 * dati sostengono davvero è il confronto con sé stessi. «Otto punti sopra la
 * tua base» è verificabile guardando i contributi; «pronto» non lo è.
 *
 * ─── Come si calcola ────────────────────────────────────────────────────────
 *
 * Per ciascuna delle quattro letture si prende la media e la deviazione
 * standard delle ultime sessanta giornate, escluso il giorno stesso, e si
 * misura di quante deviazioni standard il valore di oggi se ne discosta. Lo
 * scarto viene tagliato a due deviazioni: una notte insonne isolata non deve
 * poter affondare da sola l'indice, perché sarebbe l'unica cosa che si legge
 * e non è l'unica cosa che è successa.
 *
 * Gli scarti si combinano con dei pesi. I pesi si rinormalizzano sui soli
 * contributi presenti: sul telefono di questo progetto il sonno è registrato
 * in meno di una notte su dieci, e un indice che scendesse ogni volta che
 * manca il sonno misurerebbe la carica dell'orologio, non il recupero. Quante
 * letture hanno contribuito è parte del risultato e va mostrato: un indice su
 * due contributi vale meno di uno su quattro, e chi lo legge deve saperlo.
 *
 * Sotto le quattordici giornate di storia non si calcola niente. Una media su
 * tre giorni non è una base, è un altro numero qualsiasi.
 */

/** Ampiezza della finestra su cui si costruisce la base personale. */
export const BASELINE_DAYS = 60;

/** Giornate minime con dati perché una base abbia senso. */
export const MIN_BASELINE = 14;

/** Oltre le due deviazioni standard lo scarto viene tagliato. */
export const Z_CLAMP = 2;

/** Sotto questo scostamento la giornata si dichiara in linea, non sopra né sotto. */
export const FLAT_BAND = 3;

/** Giorni su cui si somma il carico recente prima di confrontarlo con la base. */
export const LOAD_WINDOW = 3;

export interface Sample {
	day: string;
	value: number | null;
}

export interface ReadinessSeries {
	hrv: Sample[];
	restingHr: Sample[];
	sleep: Sample[];
	/** Calorie attive per giorno, grezze: la somma mobile la fa questo file. */
	activeEnergy: Sample[];
}

export interface Contribution {
	key: 'hrv' | 'restingHr' | 'sleep' | 'load';
	label: string;
	unit: string;
	/** Peso nominale, prima della rinormalizzazione. */
	weight: number;
	/** Peso effettivo su questo giorno, `0` se il contributo è escluso. */
	effectiveWeight: number;
	higherIsBetter: boolean;
	value: number | null;
	baseline: number | null;
	/** Scostamento percentuale dalla base, per chi legge in percentuale. */
	deviationPct: number | null;
	/** Scostamento in deviazioni standard, già tagliato. Positivo = a favore. */
	signed: number | null;
	/** Perché il contributo non entra nel conto. */
	excluded: 'nessun-dato' | 'base-insufficiente' | null;
}

export interface Readiness {
	day: string;
	/** Scostamento complessivo in punti, all'incirca fra −20 e +20. `null` se non calcolabile. */
	index: number | null;
	band: 'sopra' | 'linea' | 'sotto' | null;
	contributions: Contribution[];
	/** Contributi entrati nel conto, su quattro. */
	used: number;
}

const SPEC = [
	{ key: 'hrv', label: 'Variabilità cardiaca', unit: 'ms', weight: 0.35, higherIsBetter: true },
	{ key: 'restingHr', label: 'Frequenza a riposo', unit: 'bpm', weight: 0.25, higherIsBetter: false },
	{ key: 'sleep', label: 'Sonno', unit: 'h', weight: 0.25, higherIsBetter: true },
	{ key: 'load', label: 'Carico recente', unit: 'kcal', weight: 0.15, higherIsBetter: false }
] as const;

/**
 * Somma mobile su `window` giorni, allineata al giorno finale.
 *
 * Una finestra incompleta non viene sommata a metà: due giorni su tre darebbero
 * un carico più basso di quello vero e lo farebbero leggere come riposo.
 */
function rollingSum(samples: Sample[], window: number): Sample[] {
	return samples.map((s, i) => {
		if (i < window - 1) return { day: s.day, value: null };
		const slice = samples.slice(i - window + 1, i + 1);
		if (slice.some((p) => p.value == null)) return { day: s.day, value: null };
		return { day: s.day, value: slice.reduce((a, p) => a + (p.value as number), 0) };
	});
}

function stats(values: number[]): { mean: number; sd: number } {
	const mean = values.reduce((a, b) => a + b, 0) / values.length;
	const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
	return { mean, sd: Math.sqrt(variance) };
}

function clamp(v: number, limit: number): number {
	return Math.max(-limit, Math.min(limit, v));
}

/** Le quattro serie allineate a giorno, con il carico già ridotto a somma mobile. */
function prepare(series: ReadinessSeries): Record<Contribution['key'], Map<string, number>> {
	const toMap = (samples: Sample[]) => {
		const m = new Map<string, number>();
		for (const s of samples) if (s.value != null && Number.isFinite(s.value)) m.set(s.day, s.value);
		return m;
	};

	return {
		hrv: toMap(series.hrv),
		restingHr: toMap(series.restingHr),
		sleep: toMap(series.sleep),
		load: toMap(rollingSum(series.activeEnergy, LOAD_WINDOW))
	};
}

/** Le chiavi dei giorni della finestra di base che precede `day`, dal più vecchio. */
function baselineDays(day: string): string[] {
	const end = new Date(day + 'T00:00:00Z');
	const out: string[] = [];
	for (let i = BASELINE_DAYS; i >= 1; i--) {
		const d = new Date(end);
		d.setUTCDate(d.getUTCDate() - i);
		out.push(d.toISOString().slice(0, 10));
	}
	return out;
}

function computeWith(day: string, maps: Record<Contribution['key'], Map<string, number>>): Readiness {
	const window = baselineDays(day);

	const contributions: Contribution[] = SPEC.map((spec) => {
		const map = maps[spec.key];
		const value = map.get(day) ?? null;
		const history = window.map((d) => map.get(d)).filter((v): v is number => v != null);

		const base: Contribution = {
			key: spec.key,
			label: spec.label,
			unit: spec.unit,
			weight: spec.weight,
			effectiveWeight: 0,
			higherIsBetter: spec.higherIsBetter,
			value,
			baseline: null,
			deviationPct: null,
			signed: null,
			excluded: null
		};

		if (value == null) return { ...base, excluded: 'nessun-dato' };
		if (history.length < MIN_BASELINE) return { ...base, excluded: 'base-insufficiente' };

		const { mean, sd } = stats(history);
		// Una deviazione standard nulla vuol dire che la lettura non si è mai
		// mossa: qualunque scarto sarebbe infinito, quindi lo scarto è zero.
		const z = sd > 1e-9 ? clamp((value - mean) / sd, Z_CLAMP) : 0;

		return {
			...base,
			baseline: mean,
			deviationPct: mean === 0 ? null : ((value - mean) / Math.abs(mean)) * 100,
			signed: spec.higherIsBetter ? z : -z
		};
	});

	const included = contributions.filter((c) => c.signed != null);
	if (!included.length) {
		return { day, index: null, band: null, contributions, used: 0 };
	}

	const totalWeight = included.reduce((a, c) => a + c.weight, 0);
	for (const c of included) c.effectiveWeight = c.weight / totalWeight;

	const raw = included.reduce((a, c) => a + (c.signed as number) * c.weight, 0) / totalWeight;
	// Da deviazioni standard a punti: due deviazioni piene diventano venti punti,
	// che è una scala in cui uno scarto si legge senza dover pensare in sigma.
	const index = Math.round(raw * 10);

	return {
		day,
		index,
		band: index >= FLAT_BAND ? 'sopra' : index <= -FLAT_BAND ? 'sotto' : 'linea',
		contributions,
		used: included.length
	};
}

export function computeReadiness(day: string, series: ReadinessSeries): Readiness {
	return computeWith(day, prepare(series));
}

/**
 * L'indice per ogni giorno di un elenco, condividendo la preparazione delle
 * serie: rifarla trenta volte rifarebbe trenta somme mobili identiche.
 */
export function readinessTrend(days: string[], series: ReadinessSeries): { day: string; value: number | null }[] {
	const maps = prepare(series);
	return days.map((day) => ({ day, value: computeWith(day, maps).index }));
}

/** Come si legge la fascia, senza dire cosa farne. */
export const BAND_LABEL: Record<'sopra' | 'linea' | 'sotto', string> = {
	sopra: 'Sopra la tua base',
	linea: 'In linea con la tua base',
	sotto: 'Sotto la tua base'
};
