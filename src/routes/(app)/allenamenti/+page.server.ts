import type { PageServerLoad } from './$types';
import { getWorkouts, countWorkouts, getWorkoutTypes } from '$lib/server/queries';
import { resolveRange } from '$lib/range';

const PAGE_SIZE = 25;

export const load: PageServerLoad = async ({ parent, url }) => {
	const { latestDay, empty } = await parent();
	const range = resolveRange(url.searchParams.get('periodo'), latestDay);
	const type = url.searchParams.get('tipo') ?? undefined;
	const pageNumber = Math.max(1, Number(url.searchParams.get('pagina') ?? '1') || 1);

	if (empty) return { range, type, workouts: [], types: [], total: 0, pageNumber, pageSize: PAGE_SIZE };

	const [workouts, total, types] = await Promise.all([
		getWorkouts({
			from: range.from,
			to: range.to,
			type,
			limit: PAGE_SIZE,
			offset: (pageNumber - 1) * PAGE_SIZE
		}),
		countWorkouts({ from: range.from, to: range.to, type }),
		// I conteggi per tipo ignorano il filtro attivo: servono a costruirlo.
		getWorkoutTypes(range.from, range.to)
	]);

	return { range, type, workouts, types, total, pageNumber, pageSize: PAGE_SIZE };
};
