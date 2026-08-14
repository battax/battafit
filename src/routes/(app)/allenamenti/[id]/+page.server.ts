import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getWorkout, getWorkoutSamples, getWorkoutNeighbours, getSameTypeHistory } from '$lib/server/queries';

export const load: PageServerLoad = async ({ params }) => {
	const workout = await getWorkout(params.id);
	if (!workout) error(404, 'Allenamento non trovato');

	const [samples, neighbours, history] = await Promise.all([
		getWorkoutSamples(workout.id),
		getWorkoutNeighbours(workout.startedAt),
		getSameTypeHistory(workout.type, workout.startedAt)
	]);

	/**
	 * La media delle sessioni precedenti della stessa disciplina.
	 *
	 * Ogni misura ha il suo conteggio, non uno solo per tutte: fra dieci sedute
	 * di pesi magari solo tre hanno la frequenza cardiaca, e dividere quelle tre
	 * per dieci darebbe una media falsa e sempre troppo bassa. Sotto le due
	 * sessioni non si fa nessuna media: con una sola non è un solito, è un caso.
	 */
	function mean(pick: (w: (typeof history)[number]) => number | null): { value: number; n: number } | null {
		const values = history.map(pick).filter((v): v is number => v != null && Number.isFinite(v));
		if (values.length < 2) return null;
		return { value: values.reduce((a, b) => a + b, 0) / values.length, n: values.length };
	}

	return {
		workout,
		samples,
		neighbours,
		usual: {
			durationSec: mean((w) => w.durationSec),
			distanceKm: mean((w) => w.distanceKm),
			energyKcal: mean((w) => w.energyKcal),
			avgHr: mean((w) => w.avgHr)
		}
	};
};
