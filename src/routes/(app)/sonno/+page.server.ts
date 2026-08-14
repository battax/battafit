import type { PageServerLoad } from './$types';
import { getSleep, getManySeries } from '$lib/server/queries';
import { resolveRange } from '$lib/range';
import { groupNightsByDay } from '$lib/sleep';

/**
 * Sonno.
 *
 * Oltre a durata e fasi calcoliamo la regolarità: a che ora si va a letto in
 * media e quanto quell'ora oscilla da una notte all'altra. Sulla qualità del
 * sonno la costanza pesa spesso più del totale di ore, e non è un numero che
 * l'app Salute mostri.
 *
 * Le sessioni arrivano dal database come le registra l'orologio — più d'una per
 * giornata quando c'è un pisolino o una notte spezzata — e vengono raggruppate
 * per giorno prima di qualsiasi conto: "media per notte" deve dividere per le
 * notti, non per le sessioni.
 */

export const load: PageServerLoad = async ({ parent, url }) => {
	const { latestDay, empty } = await parent();
	const range = resolveRange(url.searchParams.get('periodo'), latestDay);

	if (empty) return { range, nights: [], series: {}, stats: null };

	const [sessions, series] = await Promise.all([
		getSleep(range.from, range.to),
		getManySeries(['sleepAsleep', 'sleepDeep', 'sleepRem'], range.from, range.to)
	]);

	const nights = groupNightsByDay(sessions);
	const withSleep = nights.filter((n) => (n.asleepSec ?? 0) > 0);

	/**
	 * Ora di addormentamento come minuti dalla mezzanotte, riportata su un asse
	 * continuo: le 23:30 diventano −30 invece di 1410, altrimenti la media fra
	 * chi va a letto alle 23:30 e chi alle 00:30 darebbe mezzogiorno.
	 */
	const bedtimes = withSleep.map((n) => {
		const d = new Date(n.startedAt);
		const minutes = d.getHours() * 60 + d.getMinutes();
		return minutes > 12 * 60 ? minutes - 24 * 60 : minutes;
	});

	const wakes = withSleep.map((n) => {
		const d = new Date(n.endedAt);
		return d.getHours() * 60 + d.getMinutes();
	});

	const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
	const stdev = (xs: number[]) => {
		const m = avg(xs);
		if (m == null || xs.length < 2) return null;
		return Math.sqrt(xs.reduce((acc, x) => acc + (x - m) ** 2, 0) / xs.length);
	};

	const totalAsleep = withSleep.reduce((a, n) => a + (n.asleepSec ?? 0), 0);
	const totalDeep = withSleep.reduce((a, n) => a + (n.deepSec ?? 0), 0);
	const totalRem = withSleep.reduce((a, n) => a + (n.remSec ?? 0), 0);

	return {
		range,
		nights: nights.map((n) => ({
			day: n.day,
			deepSec: n.deepSec,
			coreSec: n.coreSec,
			remSec: n.remSec,
			awakeSec: n.awakeSec,
			asleepSec: n.asleepSec
		})),
		series,
		stats: withSleep.length
			? {
					nights: withSleep.length,
					avgAsleepSec: totalAsleep / withSleep.length,
					deepShare: totalAsleep ? totalDeep / totalAsleep : null,
					remShare: totalAsleep ? totalRem / totalAsleep : null,
					avgBedtime: avg(bedtimes),
					avgWake: avg(wakes),
					bedtimeSpread: stdev(bedtimes)
				}
			: null
	};
};
