import { redirect, type RequestHandler } from '@sveltejs/kit';
import { SESSION_COOKIE } from '$lib/server/auth';

/** Uscita: si cancella il cookie e non resta niente da invalidare lato server. */
export const POST: RequestHandler = async ({ cookies }) => {
	cookies.delete(SESSION_COOKIE, { path: '/' });
	redirect(303, '/login');
};
