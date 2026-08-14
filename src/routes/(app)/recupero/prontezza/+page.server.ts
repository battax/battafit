import type { PageServerLoad } from './$types';
import { getManySeries } from '$lib/server/queries';
import { getBlockDays, getSets } from '$lib/server/rehab';
import { BASELINE_DAYS, LOAD_WINDOW, computeReadiness, readinessTrend } from '$lib/readiness';
import { WEEKLY_TARGETS, weekDays, weekOf } from '$lib/rehab';

/**
 * Prontezza.
 *
 * Il giorno di riferimento qui è l'ultimo importato da Salute, non oggi in
 * Italia come nel resto della sezione: HRV, frequenza a riposo e sonno li
 * scrive l'orologio, e prima dell'import di oggi semplicemente non esistono.
 * Chiedere la prontezza di una giornata che i sensori non hanno ancora
 * consegnato darebbe quattro trattini ogni sera.
 */

const TREND_DAYS = 30;

/** Serve tutta la storia che la base della giornata più vecchia del grafico richiede. */
const FETCH_DAYS = TREND_DAYS + BASELINE_DAYS + LOAD_WINDOW + 2;

const METRICS = ['hrv', 'restingHr', 'sleepAsleep', 'activeEnergy'];

function shift(day: string, by: number): string {
	const d = new Date(day + 'T00:00:00Z');
	d.setUTCDate(d.getUTCDate() + by);
	return d.toISOString().slice(0, 10);
}

export const load: PageServerLoad = async ({ parent }) => {
	const { latestDay, empty, today } = await parent();

	if (empty || !latestDay) {
		return { readiness: null, trend: [], knee: null, sensorDay: null };
	}

	const from = shift(latestDay, -(FETCH_DAYS - 1));

	/**
	 * Il ginocchio: la settimana in corso del protocollo, letta dal registro.
	 * Non ricalcola niente e non aggiunge campi — è uno specchio di quello che
	 * `/recupero/registro` ha già raccolto, messo accanto ai sensori perché le
	 * due letture si guardano insieme e vivevano in due schede diverse.
	 */
	const week = weekOf(today);
	const days = weekDays(week);

	const [series, blockDays, sets] = await Promise.all([
		getManySeries(METRICS, from, latestDay),
		getBlockDays(days[0], days[days.length - 1]),
		getSets({ limit: 400 })
	]);

	const readinessSeries = {
		hrv: series.hrv ?? [],
		restingHr: series.restingHr ?? [],
		sleep: series.sleepAsleep ?? [],
		activeEnergy: series.activeEnergy ?? []
	};

	const trendDays = Array.from({ length: TREND_DAYS }, (_, i) => shift(latestDay, -(TREND_DAYS - 1 - i)));

	const logged = blockDays.filter((d) => d.logged);
	const pains = logged.map((d) => d.pain).filter((v): v is number => v != null);
	const swellingDays = logged.filter((d) => d.swelling != null && d.swelling !== 'no').length;

	/**
	 * Forza del quadricipite: non c'è un dinamometro, ma c'è il carico che ogni
	 * gamba regge in palestra. Lo scarto fra i due lati è la lettura più vicina
	 * che il registro sappia dare, ed è dichiarata per quello che è.
	 */
	const byExercise = new Map<string, { right: number; left: number }>();
	for (const s of sets) {
		if (s.loadKg == null || (s.side !== 'destro' && s.side !== 'sinistro')) continue;
		const row = byExercise.get(s.exercise) ?? { right: 0, left: 0 };
		if (s.side === 'destro') row.right = Math.max(row.right, s.loadKg);
		else row.left = Math.max(row.left, s.loadKg);
		byExercise.set(s.exercise, row);
	}
	const deficits = [...byExercise.values()]
		.filter((r) => r.right > 0 && r.left > 0)
		.map((r) => ((Math.max(r.right, r.left) - Math.min(r.right, r.left)) / Math.max(r.right, r.left)) * 100);

	return {
		sensorDay: latestDay,
		readiness: computeReadiness(latestDay, readinessSeries),
		trend: readinessTrend(trendDays, readinessSeries),
		knee: {
			week,
			logged: logged.length,
			elapsed: days.filter((d) => d <= today).length,
			pain: pains.length ? pains.reduce((a, b) => a + b, 0) / pains.length : null,
			painMax: pains.length ? Math.max(...pains) : null,
			swellingDays,
			fkt: logged.filter((d) => d.fkt).length,
			fktTarget: WEEKLY_TARGETS.fkt,
			deficit: deficits.length ? Math.max(...deficits) : null
		}
	};
};
