import { fail, redirect, type Actions, type ServerLoad } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { SESSION_COOKIE, createSession, verifyPassword } from '$lib/server/auth';

/**
 * Accesso.
 *
 * Un solo utente, quindi non c'è nessun campo "nome": la password è tutta
 * l'identità. I tentativi falliti vengono rallentati in memoria — su serverless
 * il contatore non sopravvive a ogni istanza, ma alza comunque il costo di un
 * tentativo a forza bruta, e la password è protetta da PBKDF2 a 210.000
 * iterazioni che è la difesa vera.
 */

const attempts = new Map<string, { count: number; until: number }>();
const MAX_ATTEMPTS = 8;
const LOCK_MS = 5 * 60 * 1000;

export const load: ServerLoad = async ({ locals, url }) => {
	if (locals.authenticated) redirect(303, url.searchParams.get('next') ?? '/');
	return { configured: Boolean(env.AUTH_PASSWORD_HASH && env.AUTH_SECRET) };
};

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress, url }) => {
		if (!env.AUTH_PASSWORD_HASH || !env.AUTH_SECRET) {
			return fail(500, { error: 'Il server non ha ancora AUTH_PASSWORD_HASH e AUTH_SECRET configurate.' });
		}

		const ip = getClientAddress();
		const record = attempts.get(ip);
		if (record && record.count >= MAX_ATTEMPTS && Date.now() < record.until) {
			const minutes = Math.ceil((record.until - Date.now()) / 60000);
			return fail(429, { error: `Troppi tentativi. Riprova fra ${minutes} minuti.` });
		}

		const data = await request.formData();
		const password = String(data.get('password') ?? '');

		if (!password) return fail(400, { error: 'Inserisci la password.' });

		if (!(await verifyPassword(password, env.AUTH_PASSWORD_HASH))) {
			const next = { count: (record?.count ?? 0) + 1, until: Date.now() + LOCK_MS };
			attempts.set(ip, next);
			return fail(401, { error: 'Password non corretta.' });
		}

		attempts.delete(ip);

		const session = await createSession(env.AUTH_SECRET);
		cookies.set(SESSION_COOKIE, session.value, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: url.protocol === 'https:',
			maxAge: session.maxAge
		});

		const next = data.get('next');
		redirect(303, typeof next === 'string' && next.startsWith('/') ? next : '/');
	}
};
