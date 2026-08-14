/**
 * Da sessioni di sonno a notti.
 *
 * Apple registra il sonno come sessioni, e in una stessa giornata ce ne può
 * essere più d'una: un pisolino del pomeriggio e la notte, oppure una notte
 * spezzata in tronconi che l'orologio non ha ricucito. La tabella li tiene
 * separati, ed è giusto — sono eventi distinti.
 *
 * Tutto il resto dell'app però ragiona per giornate: una colonna per notte nel
 * grafico, una media "per notte" nelle statistiche. Senza questo passaggio, due
 * sessioni nello stesso giorno diventano due colonne sovrapposte alla stessa
 * ascissa (e, essendo il grafico indicizzato per giorno, un errore di chiave
 * duplicata che porta giù l'intera pagina), mentre la media "per notte" viene
 * divisa per il numero di sessioni e sottostima il sonno di chi fa un pisolino.
 */

export interface SleepSessionLike {
	day: string;
	startedAt: Date | string;
	endedAt: Date | string;
	asleepSec: number | null;
	deepSec: number | null;
	coreSec: number | null;
	remSec: number | null;
	awakeSec: number | null;
}

export interface Night {
	day: string;
	asleepSec: number | null;
	deepSec: number | null;
	coreSec: number | null;
	remSec: number | null;
	awakeSec: number | null;
	/** Inizio e fine della sessione **più lunga** della giornata. */
	startedAt: Date;
	endedAt: Date;
	/** Quante sessioni sono confluite in questa notte. */
	sessions: number;
}

/**
 * Somma le fasi di tutte le sessioni di una giornata.
 *
 * Gli orari invece **non** si sommano: vengono dalla sessione più lunga, che è
 * il sonno vero. Prendere l'inizio del pisolino delle 15 come "ora di
 * addormentamento" sposterebbe di ore la media dell'orario in cui vai a letto,
 * che è proprio il numero che la pagina del sonno mette in evidenza.
 */
export function groupNightsByDay(sessions: SleepSessionLike[]): Night[] {
	const byDay = new Map<string, SleepSessionLike[]>();
	for (const s of sessions) {
		const list = byDay.get(s.day);
		if (list) list.push(s);
		else byDay.set(s.day, [s]);
	}

	const out: Night[] = [];
	for (const [day, list] of byDay) {
		const sum = (pick: (s: SleepSessionLike) => number | null) => {
			let total = 0;
			let seen = false;
			for (const s of list) {
				const v = pick(s);
				if (v != null) {
					total += v;
					seen = true;
				}
			}
			// Niente zeri finti: se nessuna sessione ha quella fase, resta ignota.
			return seen ? total : null;
		};

		const main = list.reduce((a, b) => ((b.asleepSec ?? 0) > (a.asleepSec ?? 0) ? b : a));

		out.push({
			day,
			asleepSec: sum((s) => s.asleepSec),
			deepSec: sum((s) => s.deepSec),
			coreSec: sum((s) => s.coreSec),
			remSec: sum((s) => s.remSec),
			awakeSec: sum((s) => s.awakeSec),
			startedAt: new Date(main.startedAt),
			endedAt: new Date(main.endedAt),
			sessions: list.length
		});
	}

	return out.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
}
