#!/usr/bin/env node
import { hashPassword } from '../src/lib/server/auth.ts';

/**
 * Generatore di segreti per la configurazione iniziale.
 *
 *   npm run auth:secret            → un valore casuale per AUTH_SECRET / INGEST_TOKEN
 *   npm run auth:hash -- "pippo"   → l'hash da mettere in AUTH_PASSWORD_HASH
 *
 * La password non viene mai salvata in chiaro da nessuna parte: nel file .env
 * finisce solo il suo hash, che non permette di risalire all'originale.
 */

const [command, ...rest] = process.argv.slice(2);

if (command === 'secret') {
	console.log(Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url'));
} else if (command === 'hash') {
	const password = rest.join(' ');
	if (!password) {
		console.error('Uso: npm run auth:hash -- "la-tua-password"');
		process.exit(1);
	}
	if (password.length < 8) {
		console.error('Scegli una password di almeno 8 caratteri.');
		process.exit(1);
	}
	console.log(await hashPassword(password));
} else {
	console.error('Comandi disponibili: secret | hash');
	process.exit(1);
}
