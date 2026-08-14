import type { LayoutServerLoad } from './$types';
import { getConfig, seedRehab } from '$lib/server/rehab';
import { PROTOCOL_WEEKS, SURGERY_DAY, TRACKER_START, currentWeek, diffDays, todayRome } from '$lib/rehab';

/**
 * Contesto comune alle pagine del recupero.
 *
 * La semina gira qui e non in uno script a parte: le dodici corse e le scadenze
 * cliniche sono parte del protocollo, non dati da importare, e la sezione deve
 * funzionare subito dopo un `db:push` senza un passaggio manuale da ricordare.
 * È idempotente e non tocca mai una riga già scritta.
 *
 * Il giorno di riferimento è oggi in Italia, non l'ultimo giorno importato da
 * Salute: qui non si guarda uno storico, si compila la sera stessa.
 */
export const load: LayoutServerLoad = async () => {
	await seedRehab();

	const today = todayRome();
	const config = await getConfig();

	return {
		today,
		config,
		week: currentWeek(today),
		weeks: PROTOCOL_WEEKS,
		/** Giorni dall'intervento: l'unico numero che non si azzera a ogni blocco. */
		sinceSurgery: diffDays(SURGERY_DAY, today),
		/** Negativo prima dell'inizio, oltre 91 a blocco finito. */
		blockDay: diffDays(TRACKER_START, today) + 1
	};
};
