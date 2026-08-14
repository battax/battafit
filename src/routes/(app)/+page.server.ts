import type { PageServerLoad } from './$types';
import { getDay, getManySeries, getWorkouts, getSleep, type Point } from '$lib/server/queries';

/**
 * Panoramica: l'ultimo giorno importato, letto sullo sfondo delle quattro
 * settimane precedenti. Un numero da solo non dice se sia alto o basso, quindi
 * ogni valore arriva accompagnato dalla sua storia recente e dalla media del
 * periodo, che è il termine di paragone.
 */

const TREND_DAYS = 30;

const OVERVIEW_METRICS = [
	'steps',
	'activeEnergy',
	'exerciseTime',
	'restingHr',
	'hrv',
	'sleepAsleep',
	'weight',
	'ringMove',
	'ringMoveGoal',
	'ringExercise',
	'ringExerciseGoal',
	'ringStand',
	'ringStandGoal'
];

export const load: PageServerLoad = async ({ parent }) => {
	const { latestDay, empty } = await parent();

	if (empty || !latestDay) {
		return {
			day: null as string | null,
			today: {} as Record<string, number | null>,
			series: {} as Record<string, Point[]>,
			baselines: {} as Record<string, number | null>,
			workouts: [] as Awaited<ReturnType<typeof getWorkouts>>,
			nights: [] as Awaited<ReturnType<typeof getSleep>>
		};
	}

	const from = new Date(latestDay + 'T00:00:00Z');
	from.setUTCDate(from.getUTCDate() - (TREND_DAYS - 1));
	const fromDay = from.toISOString().slice(0, 10);

	const [today, series, workouts, nights] = await Promise.all([
		getDay(latestDay),
		getManySeries(OVERVIEW_METRICS, fromDay, latestDay),
		getWorkouts({ limit: 4 }),
		getSleep(fromDay, latestDay)
	]);

	/**
	 * La media di riferimento esclude il giorno corrente: confrontare un valore
	 * con una media che lo contiene ne smorza sempre lo scostamento.
	 */
	const baselines: Record<string, number | null> = {};
	for (const [metric, points] of Object.entries(series)) {
		const values = points.filter((p) => p.day !== latestDay && p.value != null).map((p) => p.value as number);
		baselines[metric] = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
	}

	return { day: latestDay as string | null, today, series, baselines, workouts, nights };
};
