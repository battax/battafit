import type { LayoutServerLoad } from './$types';
import { getLatestDay, getLastIngest, isEmpty, getSeries } from '$lib/server/queries';

const SPINE_DAYS = 30;

/**
 * Dati comuni a tutte le pagine dell'app.
 *
 * `latestDay` è l'ancora temporale di tutta la dashboard: i periodi si contano
 * all'indietro dall'ultimo giorno importato, non da oggi. Se l'ultimo export è
 * di una settimana fa, "ultimi 7 giorni" mostra comunque una settimana piena di
 * dati invece di una pagina vuota.
 *
 * `spine` è la frequenza a riposo che disegna la striscia sotto ogni titolo di
 * pagina. Vive qui e non nelle singole pagine perché è identica su tutte: è il
 * polso dell'app, non una metrica di sezione.
 */
export const load: LayoutServerLoad = async () => {
	const [latestDay, lastIngest, empty] = await Promise.all([getLatestDay(), getLastIngest(), isEmpty()]);

	let spine: { day: string; value: number | null }[] = [];
	if (latestDay && !empty) {
		const from = new Date(latestDay + 'T00:00:00Z');
		from.setUTCDate(from.getUTCDate() - (SPINE_DAYS - 1));
		spine = await getSeries('restingHr', from.toISOString().slice(0, 10), latestDay);
	}

	return {
		latestDay,
		empty,
		spine,
		lastIngest: lastIngest
			? { finishedAt: lastIngest.finishedAt, source: lastIngest.source, note: lastIngest.note }
			: null
	};
};
