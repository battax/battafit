import { fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { addSet, bestByExercise, deleteSet, getSets } from '$lib/server/rehab';
import { SESSION_KINDS, SIDES, SWELLING } from '$lib/rehab';
import { day, int, num, oneOf, str } from '$lib/server/form';

const KIND_KEYS = SESSION_KINDS.map((k) => k.key);
const SIDE_KEYS = SIDES.map((s) => s.key);
const SWELLING_KEYS = SWELLING.map((s) => s.key);

export const load: PageServerLoad = async ({ parent }) => {
	const { today } = await parent();
	const rows = await getSets({ limit: 300 });
	const best = bestByExercise(rows);

	/**
	 * Il confronto fra i due lati, per gli esercizi fatti su entrambi.
	 *
	 * È la misura che il chirurgo ha lasciato aperta al controllo dei tre mesi:
	 * l'ipotrofia del quadricipite destro. Un metro attorno alla coscia la vede
	 * una volta al mese; il carico che regge una gamba rispetto all'altra la vede
	 * a ogni seduta, ed è l'unico numero che dice se il divario si sta chiudendo.
	 */
	const byExercise = new Map<string, { destro?: number; sinistro?: number }>();
	for (const b of best) {
		if (b.side !== 'destro' && b.side !== 'sinistro') continue;
		const entry = byExercise.get(b.exercise) ?? {};
		entry[b.side] = b.loadKg;
		byExercise.set(b.exercise, entry);
	}

	const asymmetry = [...byExercise.entries()]
		.filter(([, v]) => v.destro != null && v.sinistro != null)
		.map(([exercise, v]) => {
			const right = v.destro as number;
			const left = v.sinistro as number;
			const stronger = Math.max(right, left);
			return {
				exercise,
				right,
				left,
				/** Scarto in percentuale del lato più debole rispetto al più forte. */
				deficit: stronger > 0 ? ((stronger - Math.min(right, left)) / stronger) * 100 : 0,
				weaker: right < left ? ('destro' as const) : right > left ? ('sinistro' as const) : null
			};
		})
		.sort((a, b) => b.deficit - a.deficit);

	return {
		rows,
		best,
		asymmetry,
		today,
		/** Gli esercizi già usati, per non riscriverli a mano ogni volta. */
		exercises: [...new Set(rows.map((r) => r.exercise))].sort((a, b) => a.localeCompare(b, 'it'))
	};
};

export const actions: Actions = {
	add: async ({ request }) => {
		const data = await request.formData();

		const dayValue = day(data, 'day');
		const exercise = str(data, 'exercise');
		const kind = oneOf(data, 'kind', KIND_KEYS);

		if (!dayValue) return fail(400, { error: 'Serve la data della seduta.' });
		if (!exercise) return fail(400, { error: "Serve il nome dell'esercizio." });
		if (!kind) return fail(400, { error: 'Serve il tipo di seduta.' });

		await addSet({
			day: dayValue,
			kind,
			exercise,
			side: oneOf(data, 'side', SIDE_KEYS),
			sets: int(data, 'sets', 1, 20),
			reps: int(data, 'reps', 1, 200),
			loadKg: num(data, 'loadKg'),
			rir: int(data, 'rir', 0, 10),
			painBefore: int(data, 'painBefore', 0, 10),
			painAfter: int(data, 'painAfter', 0, 10),
			swellingNextDay: oneOf(data, 'swellingNextDay', SWELLING_KEYS),
			note: str(data, 'note')
		});

		redirect(303, '/recupero/carichi');
	},

	delete: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!Number.isInteger(id) || id <= 0) return fail(400, { error: 'Riga non valida.' });

		await deleteSet(id);
		redirect(303, '/recupero/carichi');
	}
};
