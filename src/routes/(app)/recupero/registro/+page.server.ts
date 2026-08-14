import { fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getRehabDay, getRehabDays, getRunMinutesByDay, saveRehabDay } from '$lib/server/rehab';
import { getManySeries } from '$lib/server/queries';
import { PROTOCOL_WEEKS, SWELLING, TRACKER_START, UPPER_BODY, weekEnd, weekOf } from '$lib/rehab';
import { int, num, oneOf, str } from '$lib/server/form';

const SWELLING_KEYS = SWELLING.map((s) => s.key);

/** Il giorno chiesto nell'indirizzo, se è una data valida dentro il blocco. */
function requestedDay(raw: string | null, today: string): string {
	if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return today;
	if (Number.isNaN(new Date(raw + 'T00:00:00Z').getTime())) return today;
	return raw;
}

export const load: PageServerLoad = async ({ parent, url }) => {
	const { today, config } = await parent();
	const day = requestedDay(url.searchParams.get('giorno'), today);

	const blockTo = weekEnd(PROTOCOL_WEEKS);

	const [entry, days, series, runMinutes] = await Promise.all([
		getRehabDay(day),
		getRehabDays(TRACKER_START, blockTo),
		getManySeries(['steps', 'sleepAsleep', 'weight'], day, day),
		getRunMinutesByDay(day, day)
	]);

	const sensed = {
		steps: (series.steps ?? [])[0]?.value ?? null,
		sleep: (series.sleepAsleep ?? [])[0]?.value ?? null,
		weight: (series.weight ?? [])[0]?.value ?? null,
		runMinutes: runMinutes[day] ?? null
	};

	return {
		day,
		entry,
		sensed,
		config,
		week: weekOf(day),
		saved: url.searchParams.has('salvato'),
		/** Solo i giorni compilati: la cronologia elenca cosa c'è, non 91 righe vuote. */
		history: days.filter((d) => d.day <= today).reverse()
	};
};

export const actions: Actions = {
	default: async ({ request, url }) => {
		const data = await request.formData();
		const day = str(data, 'day');

		if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
			return fail(400, { error: 'Giorno non valido.' });
		}

		await saveRehabDay(day, {
			pain: int(data, 'pain', 0, 10),
			swelling: oneOf(data, 'swelling', SWELLING_KEYS),
			fkt: oneOf(data, 'fkt', ['si', 'no'] as const) === 'si',
			upperBody: oneOf(data, 'upperBody', UPPER_BODY),
			calories: num(data, 'calories'),
			proteinG: num(data, 'proteinG'),
			carbsG: num(data, 'carbsG'),
			fatG: num(data, 'fatG'),
			waterL: num(data, 'waterL'),
			weightKg: num(data, 'weightKg'),
			waistCm: num(data, 'waistCm'),
			note: str(data, 'note')
		});

		// Redirect dopo la scrittura: senza, un ricarico della pagina rimanderebbe
		// lo stesso form e il giorno resterebbe agganciato all'invio precedente.
		redirect(303, `/recupero/registro?giorno=${day}&salvato=1`);
	}
};
