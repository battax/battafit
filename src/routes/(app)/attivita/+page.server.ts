import type { PageServerLoad } from './$types';
import { getManySeries } from '$lib/server/queries';
import { resolveRange } from '$lib/range';

const METRICS = [
	'steps',
	'distance',
	'flights',
	'activeEnergy',
	'exerciseTime',
	'standTime',
	'ringMove',
	'ringMoveGoal',
	'ringExercise',
	'ringExerciseGoal',
	'ringStand',
	'ringStandGoal'
];

export const load: PageServerLoad = async ({ parent, url }) => {
	const { latestDay, empty } = await parent();
	const range = resolveRange(url.searchParams.get('periodo'), latestDay);

	if (empty) return { range, series: {}, totals: null, ringsClosed: 0, daysWithData: 0 };

	const series = await getManySeries(METRICS, range.from, range.to);

	const sum = (metric: string) =>
		(series[metric] ?? []).reduce((acc, p) => acc + (p.value ?? 0), 0);

	/** Giornate in cui tutti e tre gli anelli sono stati chiusi. */
	const goals = new Map<string, { move?: number; moveGoal?: number; ex?: number; exGoal?: number; st?: number; stGoal?: number }>();
	const collect = (metric: string, field: 'move' | 'moveGoal' | 'ex' | 'exGoal' | 'st' | 'stGoal') => {
		for (const p of series[metric] ?? []) {
			if (p.value == null) continue;
			const row = goals.get(p.day) ?? {};
			row[field] = p.value;
			goals.set(p.day, row);
		}
	};
	collect('ringMove', 'move');
	collect('ringMoveGoal', 'moveGoal');
	collect('ringExercise', 'ex');
	collect('ringExerciseGoal', 'exGoal');
	collect('ringStand', 'st');
	collect('ringStandGoal', 'stGoal');

	let ringsClosed = 0;
	for (const r of goals.values()) {
		if (
			r.moveGoal && r.exGoal && r.stGoal &&
			(r.move ?? 0) >= r.moveGoal &&
			(r.ex ?? 0) >= r.exGoal &&
			(r.st ?? 0) >= r.stGoal
		) {
			ringsClosed++;
		}
	}

	const daysWithData = new Set((series.steps ?? []).filter((p) => p.value != null).map((p) => p.day)).size;

	return {
		range,
		series,
		totals: {
			steps: sum('steps'),
			distance: sum('distance'),
			flights: sum('flights'),
			activeEnergy: sum('activeEnergy'),
			exerciseTime: sum('exerciseTime'),
			standTime: sum('standTime')
		},
		ringsClosed,
		daysWithData
	};
};
