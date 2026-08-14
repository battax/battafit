import { createReadStream } from 'node:fs';
import { readFile, stat, readdir } from 'node:fs/promises';
import path from 'node:path';
import StreamZip from 'node-stream-zip';
import type { Readable } from 'node:stream';

/**
 * Accesso all'export di Apple Health, che può arrivare in due forme: lo zip
 * così come esce dall'iPhone, oppure la cartella già scompattata.
 *
 * L'interfaccia è la stessa nei due casi, così il parser non deve sapere da
 * dove stanno arrivando i byte. In entrambi i casi l'XML viene letto in
 * streaming: il file può superare il gigabyte e non entrerebbe in memoria.
 */
export interface ExportSource {
	/** Dimensione dell'XML in byte, per la barra di avanzamento. */
	xmlSize: number;
	/** Un nuovo stream sull'export.xml. Va richiamato per ogni passata. */
	openXml(): Promise<Readable>;
	/** Legge un file di traccia GPX indicato da `<FileReference path="/workout-routes/...">`. */
	readRoute(relPath: string): Promise<string | null>;
	close(): Promise<void>;
}

/** Nello zip tutto sta sotto `apple_health_export/`; da cartella scompattata quel prefisso può non esserci. */
function normalizeRoutePath(relPath: string): string {
	return relPath.replace(/^\/+/, '');
}

async function fromZip(zipPath: string): Promise<ExportSource> {
	const zip = new StreamZip.async({ file: zipPath });
	const entries = await zip.entries();

	const xmlEntry = Object.keys(entries).find((n) => n.endsWith('export.xml') && !n.includes('cda'));
	if (!xmlEntry) {
		throw new Error(
			`Nel file zip non c'è nessun export.xml.\n` +
				`Contiene: ${Object.keys(entries).slice(0, 10).join(', ')}\n` +
				`Assicurati di usare l'export prodotto da Salute → profilo → "Esporta tutti i dati sanitari".`
		);
	}

	const prefix = xmlEntry.slice(0, xmlEntry.length - 'export.xml'.length);

	return {
		xmlSize: entries[xmlEntry].size,
		openXml: () => zip.stream(xmlEntry) as Promise<Readable>,
		async readRoute(relPath) {
			const candidates = [prefix + normalizeRoutePath(relPath), normalizeRoutePath(relPath)];
			for (const c of candidates) {
				if (entries[c]) return (await zip.entryData(c)).toString('utf8');
			}
			return null;
		},
		close: () => zip.close()
	};
}

async function fromDirectory(dir: string): Promise<ExportSource> {
	// L'utente può puntare alla cartella che contiene apple_health_export, o direttamente a quella.
	const names = await readdir(dir);
	const base = names.includes('export.xml') ? dir : path.join(dir, 'apple_health_export');
	const xmlPath = path.join(base, 'export.xml');
	const info = await stat(xmlPath).catch(() => null);
	if (!info) throw new Error(`Non trovo export.xml in ${base}`);

	return {
		xmlSize: info.size,
		openXml: async () => createReadStream(xmlPath),
		async readRoute(relPath) {
			const full = path.join(base, normalizeRoutePath(relPath));
			return readFile(full, 'utf8').catch(() => null);
		},
		close: async () => {}
	};
}

export async function openExport(target: string): Promise<ExportSource> {
	const info = await stat(target).catch(() => null);
	if (!info) throw new Error(`Percorso inesistente: ${target}`);

	if (info.isDirectory()) return fromDirectory(target);
	if (target.toLowerCase().endsWith('.zip')) return fromZip(target);
	if (target.toLowerCase().endsWith('.xml')) {
		return {
			xmlSize: info.size,
			openXml: async () => createReadStream(target),
			// Un export.xml isolato non porta con sé le tracce: le cerchiamo accanto, se ci sono.
			readRoute: (relPath) =>
				readFile(path.join(path.dirname(target), normalizeRoutePath(relPath)), 'utf8').catch(() => null),
			close: async () => {}
		};
	}

	throw new Error(`Formato non riconosciuto: ${target} (attesi .zip, .xml o una cartella)`);
}
