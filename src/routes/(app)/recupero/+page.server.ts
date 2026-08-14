import type { PageServerLoad } from './$types';
import {
	getBlockDays,
	getEvents,
	getRuns,
	getRunMinutesByDay,
	goldenFormula,
	nextDeadline,
	summarizeWeek
} from '$lib/server/rehab';
import { getManySeries } from '$lib/server/queries';
import { PROTOCOL_WEEKS, TRACKER_START, addDays, weekEnd } from '$lib/rehab';

/** Finestra della risposta al carico: un mese è quanto serve per vedere un andamento senza perdere il dettaglio del giorno. */
const RESPONSE_DAYS = 30;

export const load: PageServerLoad = async ({ parent }) => {
	const { today, config, week } = await parent();

	const blockFrom = TRACKER_START;
	const blockTo = weekEnd(PROTOCOL_WEEKS);

	const [days, runs, events] = await Promise.all([getBlockDays(blockFrom, blockTo), getRuns(), getEvents()]);

	// La finestra non risale mai prima dell'inizio del blocco: mostrerebbe una
	// settimana di giorni vuoti che non sono mai stati da compilare.
	const responseFrom = [addDays(today, -(RESPONSE_DAYS - 1)), blockFrom].sort().at(-1) as string;

	const [runMinutes, series] = await Promise.all([
		getRunMinutesByDay(responseFrom, today),
		getManySeries(['steps', 'sleepAsleep'], responseFrom, today)
	]);

	const byDay = new Map(days.map((d) => [d.day, d]));

	/** Un punto per giorno di calendario, buchi compresi: la linea deve poter spezzarsi. */
	const response = days
		.filter((d) => d.day >= responseFrom && d.day <= today)
		.map((d) => ({ day: d.day, pain: d.pain, swelling: d.swelling }));

	const summary = summarizeWeek(week, days, runs, config.proteinMinG, today);
	const ledger = goldenFormula(summary, config);

	/** Una colonna per settimana del blocco, con quante regole sono state centrate. */
	const cells = Array.from({ length: PROTOCOL_WEEKS }, (_, i) => {
		const w = i + 1;
		const s = summarizeWeek(w, days, runs, config.proteinMinG, today);
		const rules = goldenFormula(s, config);
		return { week: w, score: rules.filter((r) => r.met).length, total: rules.length, logged: s.logged };
	});

	/**
	 * Quello che è successo negli ultimi tre giorni e che il protocollo dice di
	 * non ignorare. Tre giorni e non uno perché la risposta al carico si vede il
	 * mattino dopo, a volte due; una sola giornata la lascerebbe scorrere via.
	 */
	const recent = days.filter((d) => d.day > addDays(today, -3) && d.day <= today);
	const alerts = [
		recent.some((d) => d.swelling && d.swelling !== 'no')
			? {
					sign: 'Gonfiore negli ultimi giorni',
					action: 'Ridurre o sospendere e confrontarsi con il fisioterapista'
				}
			: null,
		recent.some((d) => d.pain != null && d.pain >= 3)
			? { sign: 'Dolore a 3 o più', action: 'Valutare il carico e la risposta nelle 24 ore prima di salire' }
			: null
	].filter((a): a is { sign: string; action: string } => a !== null);

	const nextRun = runs.find((r) => r.actualRunMin == null && r.plannedOn >= today) ?? null;

	// Il peso più recente disponibile, anche di qualche giorno fa: pesarsi ogni
	// giorno non è previsto, e un trattino non direbbe niente di utile.
	const lastWeight = days.filter((d) => d.day <= today && d.weightKg.value != null).at(-1)?.weightKg ?? null;

	const todayRow = byDay.get(today) ?? null;

	return {
		todayLog: todayRow,
		response,
		summary,
		ledger,
		cells,
		alerts,
		nextRun,
		nextDeadline: nextDeadline(events, today),
		milestones: events
			.filter((e) => e.day)
			.map((e) => ({ day: e.day as string, title: e.title })),
		weight: lastWeight?.value ?? null,
		weightFromWatch: lastWeight?.fromHealth ?? false,
		runMinutes: runMinutes[today] ?? null,
		steps: (series.steps ?? []).find((p) => p.day === today)?.value ?? null,
		sleep: (series.sleepAsleep ?? []).find((p) => p.day === today)?.value ?? null
	};
};
