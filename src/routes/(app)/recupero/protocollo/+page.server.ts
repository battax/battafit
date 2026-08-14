import { fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
	addEvent,
	deleteEvent,
	getContacts,
	getEvents,
	saveContact,
	saveEvent,
	saveConfig
} from '$lib/server/rehab';
import { bool, day, num, str } from '$lib/server/form';

export const load: PageServerLoad = async ({ parent }) => {
	const { config, today } = await parent();
	const [events, contacts] = await Promise.all([getEvents(), getContacts()]);
	return { config, events, contacts, today };
};

export const actions: Actions = {
	/** Gli obiettivi: gli unici numeri del protocollo che si possono spostare da soli. */
	targets: async ({ request }) => {
		const data = await request.formData();

		const values = {
			startWeightKg: num(data, 'startWeightKg'),
			targetWeightKg: num(data, 'targetWeightKg'),
			caloriesTarget: num(data, 'caloriesTarget'),
			proteinMinG: num(data, 'proteinMinG'),
			proteinTargetG: num(data, 'proteinTargetG'),
			proteinHighG: num(data, 'proteinHighG'),
			weeklyLossMinKg: num(data, 'weeklyLossMinKg'),
			weeklyLossMaxKg: num(data, 'weeklyLossMaxKg'),
			waterTargetL: num(data, 'waterTargetL'),
			sleepMinH: num(data, 'sleepMinH')
		};

		if (values.proteinMinG != null && values.proteinHighG != null && values.proteinMinG > values.proteinHighG) {
			return fail(400, { error: 'Il minimo di proteine non può stare sopra la fascia alta.' });
		}

		// I campi svuotati tornano al valore di partenza invece di azzerarsi: un
		// obiettivo a zero renderebbe ogni giornata "rispettata".
		await saveConfig(Object.fromEntries(Object.entries(values).filter(([, v]) => v != null)));
		redirect(303, '/recupero/protocollo');
	},

	addEvent: async ({ request }) => {
		const data = await request.formData();
		const title = str(data, 'title');
		if (!title) return fail(400, { error: "Serve il nome dell'evento." });

		await addEvent({
			day: day(data, 'day'),
			title,
			detail: str(data, 'detail'),
			professional: str(data, 'professional'),
			done: bool(data, 'done')
		});
		redirect(303, '/recupero/protocollo');
	},

	toggleEvent: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!Number.isInteger(id) || id <= 0) return fail(400, { error: 'Evento non valido.' });

		await saveEvent(id, { done: bool(data, 'done') });
		redirect(303, '/recupero/protocollo');
	},

	deleteEvent: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!Number.isInteger(id) || id <= 0) return fail(400, { error: 'Evento non valido.' });

		await deleteEvent(id);
		redirect(303, '/recupero/protocollo');
	},

	contact: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!Number.isInteger(id) || id <= 0) return fail(400, { error: 'Recapito non valido.' });

		// Solo i due campi che il form mostra: toccare anche gli altri li
		// azzererebbe a ogni salvataggio, senza che si veda da nessuna parte.
		await saveContact(id, { name: str(data, 'name'), contact: str(data, 'contact') });
		redirect(303, '/recupero/protocollo');
	}
};
