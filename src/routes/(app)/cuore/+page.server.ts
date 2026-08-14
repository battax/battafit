import type { PageServerLoad } from './$types';
import { getManySeries, type Point } from '$lib/server/queries';
import { resolveRange, previousRange } from '$lib/range';

const METRICS = ['restingHr', 'hrv', 'vo2max', 'walkingHr', 'spo2', 'respiratoryRate'];

/** Media dei valori non nulli di una serie. */
function mean(points: { value: number | null }[]): number | null {
	const values = points.filter((p) => p.value != null).map((p) => p.value as number);
	return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

export const load: PageServerLoad = async ({ parent, url }) => {
	const { latestDay, empty } = await parent();
	const range = resolveRange(url.searchParams.get('periodo'), latestDay);

	if (empty) {
		return {
			range,
			series: {} as Record<string, Point[]>,
			current: {} as Record<string, number | null>,
			previous: {} as Record<string, number | null>
		};
	}

	const prev = previousRange(range);

	// Il periodo precedente serve solo per le variazioni in testa alla pagina.
	const [series, previousSeries] = await Promise.all([
		getManySeries(METRICS, range.from, range.to),
		prev ? getManySeries(METRICS, prev.from, prev.to) : Promise.resolve({} as Record<string, Point[]>)
	]);

	const current: Record<string, number | null> = {};
	const previous: Record<string, number | null> = {};
	for (const metric of METRICS) {
		current[metric] = mean(series[metric] ?? []);
		previous[metric] = mean(previousSeries[metric] ?? []);
	}

	return { range, series, current, previous };
};
