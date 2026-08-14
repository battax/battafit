/**
 * Autenticazione per una dashboard a utente singolo.
 *
 * Niente tabella utenti né libreria di sessioni: la password vive come hash in
 * una variabile d'ambiente e la sessione è un cookie firmato. Tutto è costruito
 * su Web Crypto, che è disponibile sia in Node che sui runtime edge, quindi non
 * ci sono binari nativi da compilare al deploy.
 */

const PBKDF2_ITERATIONS = 210_000; // raccomandazione OWASP per PBKDF2-SHA256
const SESSION_DAYS = 30;
export const SESSION_COOKIE = 'battafit_session';

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
	return Buffer.from(bytes).toString('base64url');
}

function fromB64url(s: string): Uint8Array {
	return new Uint8Array(Buffer.from(s, 'base64url'));
}

/** Confronto a tempo costante: esce sempre dopo lo stesso numero di operazioni. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
	return diff === 0;
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
	const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
	const bits = await crypto.subtle.deriveBits(
		{ name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
		key,
		256
	);
	return new Uint8Array(bits);
}

/**
 * Genera l'hash da incollare in AUTH_PASSWORD_HASH.
 *
 * Formato: `pbkdf2:iterazioni:salt:hash`. Il separatore è due punti e non il
 * dollaro convenzionale perché Vite passa i file `.env` attraverso
 * dotenv-expand: un `$210000` verrebbe scambiato per una variabile d'ambiente
 * ed espanso a stringa vuota, e la password non entrerebbe più. I due punti non
 * compaiono nell'alfabeto base64url, quindi restano un separatore sicuro.
 */
export async function hashPassword(password: string): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
	return `pbkdf2:${PBKDF2_ITERATIONS}:${b64url(salt)}:${b64url(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
	const parts = stored.trim().split(':');
	if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
	const iterations = Number(parts[1]);
	if (!Number.isInteger(iterations) || iterations < 1000) return false;
	const hash = await pbkdf2(password, fromB64url(parts[2]), iterations);
	return timingSafeEqual(hash, fromB64url(parts[3]));
}

async function hmacKey(secret: string): Promise<CryptoKey> {
	return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
		'sign',
		'verify'
	]);
}

/** Cookie di sessione: payload con la scadenza + firma HMAC. Nessuno stato lato server. */
export async function createSession(secret: string): Promise<{ value: string; maxAge: number }> {
	const maxAge = SESSION_DAYS * 24 * 60 * 60;
	const payload = b64url(enc.encode(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + maxAge })));
	const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(payload));
	return { value: `${payload}.${b64url(new Uint8Array(sig))}`, maxAge };
}

export async function verifySession(token: string | undefined, secret: string): Promise<boolean> {
	if (!token) return false;
	const [payload, sig] = token.split('.');
	if (!payload || !sig) return false;

	const valid = await crypto.subtle.verify(
		'HMAC',
		await hmacKey(secret),
		fromB64url(sig) as BufferSource,
		enc.encode(payload)
	);
	if (!valid) return false;

	try {
		const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString());
		return typeof exp === 'number' && exp > Math.floor(Date.now() / 1000);
	} catch {
		return false;
	}
}

/** Confronto a tempo costante fra token opachi (usato dall'endpoint di ingest). */
export function tokensMatch(a: string | undefined, b: string | undefined): boolean {
	if (!a || !b) return false;
	return timingSafeEqual(enc.encode(a), enc.encode(b));
}
