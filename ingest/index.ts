#!/usr/bin/env node
import 'dotenv/config';
import { parseArgs } from 'node:util';
import { writeFile } from 'node:fs/promises';
import { openExport } from './source.ts';
import { parseAppleExport } from './apple-health.ts';
import { pushResult } from './push.ts';

/**
 * CLI di importazione.
 *
 *   npm run ingest -- ~/Downloads/export.zip
 *   npm run ingest -- ~/Downloads/export.zip --since 2025-01-01
 *   npm run ingest -- ~/Downloads/export.zip --dry-run
 *
 * Gira sul computer, non sul server: l'export può superare il gigabyte e
 * nessuna piattaforma serverless accetterebbe un caricamento del genere. Qui il
 * file viene ridotto ad aggregati e solo quelli viaggiano verso la dashboard.
 */

const HELP = `
battafit — importazione dei dati di Apple Salute

  npm run ingest -- <percorso> [opzioni]

  <percorso>   export.zip, export.xml, o la cartella già scompattata

Opzioni
  --since <AAAA-MM-GG>  importa solo dai dati da questa data in poi
  --url <indirizzo>     dashboard di destinazione (default: BATTAFIT_URL o localhost:5173)
  --token <token>       token di ingest (default: INGEST_TOKEN dal file .env)
  --dry-run             analizza e mostra il riepilogo senza scrivere nulla
  --out <file.json>     salva su file il risultato dell'analisi (utile per capire cosa è stato letto)
  --help                mostra questo messaggio
`;

function fmt(n: number): string {
	return new Intl.NumberFormat('it-IT').format(n);
}

function bar(fraction: number, width = 24): string {
	const filled = Math.round(Math.max(0, Math.min(1, fraction)) * width);
	return '█'.repeat(filled) + '░'.repeat(width - filled);
}

async function main() {
	const { values, positionals } = parseArgs({
		allowPositionals: true,
		options: {
			since: { type: 'string' },
			url: { type: 'string' },
			token: { type: 'string' },
			'dry-run': { type: 'boolean', default: false },
			out: { type: 'string' },
			help: { type: 'boolean', default: false }
		}
	});

	if (values.help || positionals.length === 0) {
		console.log(HELP);
		process.exit(values.help ? 0 : 1);
	}

	const target = positionals[0];
	const dryRun = values['dry-run'];
	const url = values.url ?? process.env.BATTAFIT_URL ?? 'http://localhost:5173';
	const token = values.token ?? process.env.INGEST_TOKEN ?? '';

	if (!dryRun && !token) {
		console.error(
			'Manca il token di ingest.\n' +
				'Aggiungi INGEST_TOKEN al file .env (generalo con: npm run auth:secret) oppure passa --token.'
		);
		process.exit(1);
	}

	if (values.since && !/^\d{4}-\d{2}-\d{2}$/.test(values.since)) {
		console.error(`--since vuole una data nel formato AAAA-MM-GG, ricevuto: ${values.since}`);
		process.exit(1);
	}

	console.log(`\n  Apro  ${target}`);
	const source = await openExport(target);
	console.log(`  export.xml: ${(source.xmlSize / 1024 / 1024).toFixed(0)} MB\n`);

	let lastDraw = 0;
	const started = Date.now();

	const result = await parseAppleExport(source, {
		since: values.since,
		onProgress(phase, bytes, total) {
			// Ridisegnare a ogni chunk rallenterebbe più della lettura stessa.
			const now = Date.now();
			if (now - lastDraw < 100) return;
			lastDraw = now;
			const pct = total ? bytes / total : 0;
			process.stdout.write(`\r  ${phase.padEnd(12)} ${bar(pct)} ${(pct * 100).toFixed(0)}%   `);
		}
	});

	process.stdout.write('\r' + ' '.repeat(60) + '\r');
	await source.close();

	const seconds = ((Date.now() - started) / 1000).toFixed(1);
	const days = new Set(result.days.map((d) => d.day));
	const dayList = [...days].sort();

	console.log(`  Letti ${fmt(result.recordsRead)} record in ${seconds}s\n`);
	console.log(`  Giorni          ${fmt(days.size)}${dayList.length ? `  (${dayList[0]} → ${dayList.at(-1)})` : ''}`);
	console.log(`  Righe metriche  ${fmt(result.days.length)}`);
	console.log(`  Allenamenti     ${fmt(result.workouts.length)}`);
	console.log(`  Notti di sonno  ${fmt(result.sleep.length)}`);
	console.log(`  Campioni HR     ${fmt(result.samples.length)}`);

	for (const w of result.warnings) console.log(`  · ${w}`);

	if (values.out) {
		await writeFile(values.out, JSON.stringify(result, null, 2));
		console.log(`\n  Analisi salvata in ${values.out}`);
	}

	if (dryRun) {
		console.log('\n  --dry-run: non ho scritto niente.\n');
		return;
	}

	console.log(`\n  Invio a ${url}`);
	const runId = await pushResult(result, {
		url,
		token,
		source: 'apple-health-export',
		onProgress(sent, total) {
			process.stdout.write(`\r  blocchi      ${bar(sent / total)} ${sent}/${total}   `);
		}
	});

	console.log(`\n\n  Fatto. Importazione #${runId} completata.\n`);
}

main().catch((err) => {
	console.error(`\n  Errore: ${err instanceof Error ? err.message : String(err)}\n`);
	process.exit(1);
});
