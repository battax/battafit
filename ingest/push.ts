import type { ParseResult } from './apple-health.ts';

/**
 * Invio dei dati importati alla dashboard.
 *
 * Dieci anni di storico fanno circa centomila righe giornaliere: in un'unica
 * richiesta sarebbero una ventina di megabyte, oltre il limite di corpo di
 * qualsiasi piattaforma serverless. Spediamo quindi a blocchi, tenendo lo
 * stesso `runId` per tutta la sessione così nello storico resta una riga sola.
 */

const BATCH_DAYS = 4000;
const BATCH_WORKOUTS = 100; // le tracce GPS pesano: blocchi piccoli
const BATCH_SAMPLES = 5000;
const BATCH_SLEEP = 1000;
const MAX_RETRIES = 3;

function chunk<T>(rows: T[], size: number): T[][] {
	const out: T[][] = [];
	for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
	return out;
}

async function postBatch(url: string, token: string, body: unknown, attempt = 1): Promise<{ runId: number }> {
	const res = await fetch(`${url.replace(/\/$/, '')}/api/ingest`, {
		method: 'POST',
		headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
		body: JSON.stringify(body)
	});

	if (res.ok) return (await res.json()) as { runId: number };

	const text = await res.text().catch(() => '');

	// I timeout e i 5xx capitano quando il database serverless si sta svegliando:
	// vale la pena riprovare prima di buttare via l'intero import.
	if (res.status >= 500 && attempt < MAX_RETRIES) {
		await new Promise((r) => setTimeout(r, 1000 * attempt));
		return postBatch(url, token, body, attempt + 1);
	}

	if (res.status === 401) {
		throw new Error(`Token rifiutato (401). Controlla che INGEST_TOKEN sia lo stesso qui e sul server.`);
	}

	throw new Error(`Invio fallito: HTTP ${res.status} ${text.slice(0, 300)}`);
}

export async function pushResult(
	result: ParseResult,
	opts: { url: string; token: string; source: string; onProgress?: (sent: number, total: number) => void }
): Promise<number> {
	const batches: Record<string, unknown>[] = [
		...chunk(result.days, BATCH_DAYS).map((days) => ({ days })),
		...chunk(result.workouts, BATCH_WORKOUTS).map((workouts) => ({ workouts })),
		...chunk(result.samples, BATCH_SAMPLES).map((samples) => ({ samples })),
		...chunk(result.sleep, BATCH_SLEEP).map((sleep) => ({ sleep }))
	];

	// Un import può non produrre nulla (per esempio con --since nel futuro):
	// mandiamo comunque un batch vuoto, così la run resta tracciata.
	if (!batches.length) batches.push({});

	let runId: number | undefined;

	for (let i = 0; i < batches.length; i++) {
		const isLast = i === batches.length - 1;
		const res = await postBatch(opts.url, opts.token, {
			...batches[i],
			runId,
			source: opts.source,
			recordsRead: i === 0 ? result.recordsRead : 0,
			done: isLast,
			note: isLast ? result.warnings.join(' ') || null : undefined
		});
		runId = res.runId;
		opts.onProgress?.(i + 1, batches.length);
	}

	return runId!;
}
