import { fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getRuns, getRunMinutesByDay, saveRun } from '$lib/server/rehab';
import { MORNING, RUN_PLAN, SURFACES, SWELLING } from '$lib/rehab';
import { day, int, num, oneOf, str } from '$lib/server/form';

const SWELLING_KEYS = SWELLING.map((s) => s.key);
const MORNING_KEYS = MORNING.map((m) => m.key);

export const load: PageServerLoad = async ({ parent }) => {
	const { today } = await parent();
	const runs = await getRuns();

	// I minuti dell'orologio nell'arco di tutta la progressione: servono a
	// riempire "corsa effettiva" senza rileggerli dal telefono.
	const from = RUN_PLAN[0].plannedOn;
	const to = RUN_PLAN[RUN_PLAN.length - 1].plannedOn;
	const sensed = await getRunMinutesByDay(from, today > to ? today : to);

	const done = runs.filter((r) => r.actualRunMin != null);

	return {
		runs,
		sensed,
		done: done.length,
		/** La prima seduta senza risposta: è quella che il form apre già aperta. */
		openId: runs.find((r) => r.actualRunMin == null)?.id ?? null,
		/** L'ultimo esito conosciuto: dice se si può salire di livello o si ripete. */
		lastOutcome: done.at(-1)?.outcome ?? null
	};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!Number.isInteger(id) || id <= 0) return fail(400, { error: 'Seduta non valida.' });

		await saveRun(id, {
			doneOn: day(data, 'doneOn'),
			surface: oneOf(data, 'surface', SURFACES),
			actualRunMin: num(data, 'actualRunMin'),
			avgSpeedKmh: num(data, 'avgSpeedKmh'),
			painDuring: int(data, 'painDuring', 0, 10),
			swellingEvening: oneOf(data, 'swellingEvening', SWELLING_KEYS),
			morningAfter: oneOf(data, 'morningAfter', MORNING_KEYS),
			painMorning: int(data, 'painMorning', 0, 10),
			note: str(data, 'note')
		});

		redirect(303, `/recupero/corsa?aperta=${id}`);
	}
};
