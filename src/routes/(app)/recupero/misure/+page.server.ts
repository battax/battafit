import { fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { deleteMeasure, getMeasures, saveMeasure } from '$lib/server/rehab';
import { MEASURE_PLAN } from '$lib/rehab';
import { bool, day, num, str } from '$lib/server/form';

export const load: PageServerLoad = async ({ parent, url }) => {
	const { today } = await parent();
	const measures = await getMeasures();

	/** La prossima data in calendario, o l'ultima se il calendario è finito. */
	const next = MEASURE_PLAN.find((d) => d >= today) ?? MEASURE_PLAN[MEASURE_PLAN.length - 1];

	// La riga da modificare: quella chiesta nell'indirizzo, altrimenti si
	// compila una misurazione nuova alla prossima data prevista.
	const editing = url.searchParams.get('giorno');
	const draft = measures.find((m) => m.day === editing) ?? null;

	const first = measures.find((m) => m.thighRightCm != null && m.thighLeftCm != null) ?? null;
	const last = [...measures].reverse().find((m) => m.thighRightCm != null && m.thighLeftCm != null) ?? null;

	const gap = (m: typeof first) =>
		m && m.thighRightCm != null && m.thighLeftCm != null ? m.thighRightCm - m.thighLeftCm : null;

	/**
	 * Le due cosce affiancate, una coppia per misurazione.
	 *
	 * Non una serie della differenza: cinque misure in tre mesi non fanno una
	 * linea, e una scala che si adatta a mezzo centimetro racconterebbe una
	 * guarigione che non c'è. Le due lunghezze affiancate dicono la stessa cosa
	 * e reggono già dalla prima volta che si prende il metro.
	 */
	const pairs = measures
		.filter((m) => m.thighRightCm != null && m.thighLeftCm != null)
		.map((m) => {
			const right = m.thighRightCm as number;
			const left = m.thighLeftCm as number;
			return {
				day: m.day,
				right,
				left,
				gap: right - left,
				thinner: right < left ? ('destra' as const) : right > left ? ('sinistra' as const) : ('nessuna' as const)
			};
		});

	return {
		measures,
		draft,
		defaultDay: draft?.day ?? next,
		nextPlanned: next,
		pairs,
		/** Fondo scala comune a tutte le barre: due misurazioni non devono cambiare la scala l'una all'altra. */
		maxThigh: Math.max(1, ...pairs.map((p) => Math.max(p.right, p.left))),
		firstGap: gap(first),
		lastGap: gap(last)
	};
};

export const actions: Actions = {
	save: async ({ request }) => {
		const data = await request.formData();
		const dayValue = day(data, 'day');
		if (!dayValue) return fail(400, { error: 'Serve la data della misurazione.' });

		await saveMeasure(dayValue, {
			waistCm: num(data, 'waistCm'),
			thighRightCm: num(data, 'thighRightCm'),
			thighLeftCm: num(data, 'thighLeftCm'),
			chestCm: num(data, 'chestCm'),
			armRightCm: num(data, 'armRightCm'),
			armLeftCm: num(data, 'armLeftCm'),
			photo: bool(data, 'photo'),
			note: str(data, 'note')
		});

		redirect(303, '/recupero/misure');
	},

	delete: async ({ request }) => {
		const data = await request.formData();
		const dayValue = day(data, 'day');
		if (!dayValue) return fail(400, { error: 'Riga non valida.' });

		await deleteMeasure(dayValue);
		redirect(303, '/recupero/misure');
	}
};
