import { redirect, error, type Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { SESSION_COOKIE, verifySession } from '$lib/server/auth';

/** Rotte raggiungibili senza sessione. `/api/ingest` si autentica da sé, con il token della CLI. */
const PUBLIC_PATHS = ['/login', '/api/ingest'];

const isPublic = (pathname: string) => PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));

export const handle: Handle = async ({ event, resolve }) => {
	const secret = env.AUTH_SECRET;
	event.locals.authenticated = secret
		? await verifySession(event.cookies.get(SESSION_COOKIE), secret)
		: false;

	if (!event.locals.authenticated && !isPublic(event.url.pathname)) {
		// Le chiamate API rispondono 401: un redirect verso l'HTML del login
		// manderebbe in confusione il chiamante.
		if (event.url.pathname.startsWith('/api/')) error(401, 'Non autenticato');

		const next = event.url.pathname + event.url.search;
		redirect(303, next === '/' ? '/login' : `/login?next=${encodeURIComponent(next)}`);
	}

	return resolve(event);
};
