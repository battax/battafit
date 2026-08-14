import type { PageServerLoad } from './$types';
import { getManySeries } from '$lib/server/queries';
import { resolveRange } from '$lib/range';

const METRICS = ['weight', 'bodyFat', 'leanMass', 'bmi', 'wristTemp'];

export const load: PageServerLoad = async ({ parent, url }) => {
	const { latestDay, empty } = await parent();
	const range = resolveRange(url.searchParams.get('periodo'), latestDay);

	if (empty) return { range, series: {}, first: {}, last: {} };

	const series = await getManySeries(METRICS, range.from, range.to);

	/**
	 * Per il peso e la composizione corporea il confronto sensato è fra la prima
	 * e l'ultima misura del periodo, non fra un valore e una media: sono
	 * grandezze che si spostano lentamente e si pesano di rado.
	 */
	const first: Record<string, number | null> = {};
	const last: Record<string, number | null> = {};
	for (const metric of METRICS) {
		const valued = (series[metric] ?? []).filter((p) => p.value != null);
		first[metric] = valued[0]?.value ?? null;
		last[metric] = valued.at(-1)?.value ?? null;
	}

	return { range, series, first, last };
};
