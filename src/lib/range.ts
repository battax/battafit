/**
 * Periodi selezionabili.
 *
 * L'intervallo è ancorato all'ultimo giorno importato, non a oggi: se l'ultimo
 * export risale a una settimana fa, "7 giorni" deve comunque mostrare sette
 * giorni pieni invece di una pagina mezza vuota.
 */

export const RANGES = [
	{ key: '7g', label: '7 giorni', days: 7 },
	{ key: '30g', label: '30 giorni', days: 30 },
	{ key: '90g', label: '90 giorni', days: 90 },
	{ key: '1a', label: '1 anno', days: 365 },
	{ key: 'tutto', label: 'Tutto', days: 0 }
] as const;

export type RangeKey = (typeof RANGES)[number]['key'];

export interface ResolvedRange {
	from: string;
	to: string;
	key: RangeKey;
	label: string;
}

export function resolveRange(key: string | null, latestDay: string | null): ResolvedRange {
	const found = RANGES.find((r) => r.key === key) ?? RANGES[1];
	const to = latestDay ?? new Date().toISOString().slice(0, 10);

	if (found.days === 0) return { from: '1970-01-01', to, key: found.key, label: found.label };

	const start = new Date(to + 'T00:00:00Z');
	start.setUTCDate(start.getUTCDate() - (found.days - 1));

	return { from: start.toISOString().slice(0, 10), to, key: found.key, label: found.label };
}

/** Il periodo di pari durata immediatamente precedente, per i confronti. */
export function previousRange(range: ResolvedRange): { from: string; to: string } | null {
	const found = RANGES.find((r) => r.key === range.key);
	if (!found || found.days === 0) return null;

	const end = new Date(range.from + 'T00:00:00Z');
	end.setUTCDate(end.getUTCDate() - 1);
	const start = new Date(end);
	start.setUTCDate(start.getUTCDate() - (found.days - 1));

	return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
}
