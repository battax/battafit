import type { PageServerLoad } from './$types';
import { getManySeries } from '$lib/server/queries';
import { previousRange, resolveRange } from '$lib/range';

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

	if (empty)
		return {
			range,
			series: {},
			totals: null,
			ringsClosed: 0,
			daysWithData: 0,
			previous: null,
			best: null as { day: string; value: number } | null
		};

	/**
	 * Il periodo precedente di pari durata serve solo al pannello Insight, e solo
	 * per i passi: è la metrica guida della pagina, e chiedere al database anche
	 * le altre cinque raddoppierebbe le query per delle frasi che nessuno ha
	 * chiesto. Su "Tutto" non esiste un periodo prima, e il confronto sparisce.
	 */
	const prev = previousRange(range);

	const [series, prevSeries] = await Promise.all([
		getManySeries(METRICS, range.from, range.to),
		prev ? getManySeries(['steps'], prev.from, prev.to) : Promise.resolve({} as Record<string, never[]>)
	]);

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

	/** Media al giorno del periodo prima, sulle sue giornate con dati: solo così è confrontabile. */
	const prevPoints = (prevSeries.steps ?? []).filter((p) => p.value != null);
	const previous = prevPoints.length
		? { stepsPerDay: prevPoints.reduce((a, p) => a + (p.value ?? 0), 0) / prevPoints.length }
		: null;

	/** Il giorno con più passi del periodo: è l'unico picco che vale la pena nominare. */
	const best = (series.steps ?? [])
		.filter((p) => p.value != null)
		.reduce<{ day: string; value: number } | null>(
			(acc, p) => (acc == null || (p.value as number) > acc.value ? { day: p.day, value: p.value as number } : acc),
			null
		);

	return {
		range,
		series,
		previous,
		best,
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
