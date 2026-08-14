import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

/**
 * Connessione al database, aperta alla prima query e non all'importazione.
 *
 * SvelteKit importa i moduli server anche durante la compilazione, per
 * analizzare le rotte: se qui si aprisse subito la connessione, la build
 * fallirebbe su qualsiasi macchina senza DATABASE_URL — inclusi i runner di CI.
 * Il rinvio serve anche a freddo sul serverless, dove una funzione che non
 * tocca il database non paga il costo di connettersi.
 */

let instance: PostgresJsDatabase<typeof schema> | null = null;

function connect(): PostgresJsDatabase<typeof schema> {
	if (instance) return instance;

	if (!env.DATABASE_URL) {
		throw new Error(
			'DATABASE_URL non impostata. Copia .env.example in .env e inserisci la stringa di connessione a Postgres.'
		);
	}

	// `prepare: false` è necessario dietro un connection pooler (PgBouncer, pooler di Neon).
	const client = postgres(env.DATABASE_URL, { prepare: false, max: 5 });
	instance = drizzle(client, { schema, casing: 'snake_case' });
	return instance;
}

export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
	get(_target, prop) {
		const real = connect();
		const value = Reflect.get(real, prop, real);
		// I metodi di Drizzle contano sul proprio `this`: vanno legati all'istanza vera.
		return typeof value === 'function' ? value.bind(real) : value;
	}
});

export { schema };
