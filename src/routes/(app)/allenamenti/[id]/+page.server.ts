import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getWorkout, getWorkoutSamples, getWorkoutNeighbours } from '$lib/server/queries';

export const load: PageServerLoad = async ({ params }) => {
	const workout = await getWorkout(params.id);
	if (!workout) error(404, 'Allenamento non trovato');

	const [samples, neighbours] = await Promise.all([
		getWorkoutSamples(workout.id),
		getWorkoutNeighbours(workout.startedAt)
	]);

	return { workout, samples, neighbours };
};
