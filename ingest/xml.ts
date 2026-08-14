import { SaxesParser } from 'saxes';
import type { Readable } from 'node:stream';

export type Attributes = Record<string, string>;

export interface XmlHandlers {
	/** Chiamato all'apertura di ogni tag. Restituire `false` interrompe lo scorrimento. */
	onOpen?(name: string, attrs: Attributes): void | false;
	onClose?(name: string): void;
	/** Avanzamento in byte letti, per la progress bar. */
	onProgress?(bytesRead: number): void;
}

/**
 * Scorre un XML enorme in streaming, senza mai costruire un albero in memoria.
 *
 * `saxes` è strict, mentre l'export di Apple ogni tanto contiene caratteri che
 * non passano la validazione (nomi di sorgenti con simboli strani, per lo più).
 * Un errore su un singolo record non deve far fallire un import da mezzo
 * milione di righe, quindi gli errori vengono contati e ignorati: se sono tanti
 * il chiamante lo segnala all'utente.
 */
export async function streamXml(input: Readable, handlers: XmlHandlers): Promise<{ errors: number }> {
	const parser = new SaxesParser({ fragment: false });
	let errors = 0;
	let stopped = false;
	let bytesRead = 0;

	parser.on('error', () => {
		errors++;
	});

	parser.on('opentag', (node) => {
		if (stopped) return;
		if (handlers.onOpen?.(node.name, node.attributes as Attributes) === false) stopped = true;
	});

	if (handlers.onClose) {
		parser.on('closetag', (node) => {
			if (!stopped) handlers.onClose!(node.name);
		});
	}

	for await (const chunk of input) {
		const buf = chunk as Buffer;
		bytesRead += buf.length;
		parser.write(buf.toString('utf8'));
		handlers.onProgress?.(bytesRead);
		if (stopped) {
			input.destroy();
			return { errors };
		}
	}

	try {
		parser.close();
	} catch {
		errors++;
	}

	return { errors };
}

/**
 * Converte una data dell'export nel formato ISO.
 *
 * Apple scrive `2024-03-15 08:30:00 +0100`, che non è ISO valido: senza i due
 * punti nell'offset e con lo spazio al posto della T alcuni runtime lo
 * interpretano come UTC, spostando i dati di un'ora e facendo finire gli
 * allenamenti serali nel giorno sbagliato.
 */
export function parseAppleDate(value: string | undefined): Date | null {
	if (!value) return null;
	const iso = value.trim().replace(' ', 'T').replace(/\s([+-]\d{2}):?(\d{2})$/, '$1:$2');
	const d = new Date(iso);
	return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Il giorno di calendario a cui appartiene un timestamp dell'export.
 *
 * Prendiamo i primi dieci caratteri della stringa originale invece di
 * convertire la data: il valore è già scritto nel fuso in cui si trovava
 * l'orologio, che è esattamente il "giorno" che l'utente si aspetta di vedere.
 */
export function appleDay(value: string | undefined): string | null {
	if (!value || value.length < 10) return null;
	const day = value.slice(0, 10);
	return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}
