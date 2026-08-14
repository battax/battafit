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

/**
 * Il documento clinico che Apple affianca all'export vero.
 *
 * Contiene le stesse informazioni in formato CDA, che non ci serve, ed è
 * l'unico altro XML nell'archivio: escluderlo basta a individuare quello buono
 * senza dipendere da come si chiama.
 */
function isClinicalDocument(name: string): boolean {
	return /cda/i.test(name.split('/').pop() ?? '');
}

/**
 * **Salute traduce il nome del file secondo la lingua dell'iPhone**: `export.xml`
 * in inglese, `esportazione.xml` in italiano, `exportar.xml` in spagnolo.
 * Cercare la stringa "export" nel nome funzionava solo per chi ha il telefono in
 * inglese. La cartella `apple_health_export/` invece non è tradotta, e nemmeno
 * i tag dentro l'XML: è solo il nome del file a cambiare.
 *
 * Quindi non si cerca un nome, si scarta quello che non serve — il documento
 * clinico — e fra ciò che resta si prende il file più grande, che è sempre
 * quello con i record dentro.
 */
async function fromZip(zipPath: string): Promise<ExportSource> {
	const zip = new StreamZip.async({ file: zipPath });
	const entries = await zip.entries();

	const names = Object.keys(entries).filter((n) => !entries[n].isDirectory);
	const xmls = names.filter((n) => n.toLowerCase().endsWith('.xml') && !isClinicalDocument(n));
	// Fra più XML vince il più grande: è quello con dentro i record.
	const xmlEntry = xmls.sort((a, b) => entries[b].size - entries[a].size)[0] ?? null;

	if (!xmlEntry) {
		const allXml = names.filter((n) => n.toLowerCase().endsWith('.xml'));
		await zip.close();
		throw new Error(
			`Nel file zip non c'è nessun XML di export.\n` +
				(allXml.length
					? `Ho trovato solo documenti clinici: ${allXml.slice(0, 5).join(', ')}\n`
					: `Contiene: ${names.slice(0, 8).join(', ')}\n`) +
				`Assicurati di usare l'export prodotto da Salute → profilo → "Esporta tutti i dati sanitari".`
		);
	}

	const prefix = xmlEntry.includes('/') ? xmlEntry.slice(0, xmlEntry.lastIndexOf('/') + 1) : '';

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

/** Un XML già su disco, con le tracce cercate accanto a lui. */
async function fromXmlFile(xmlPath: string, routeBase: string): Promise<ExportSource> {
	const info = await stat(xmlPath).catch(() => null);
	if (!info) throw new Error(`Non trovo ${xmlPath}`);

	return {
		xmlSize: info.size,
		openXml: async () => createReadStream(xmlPath),
		readRoute: (relPath) =>
			readFile(path.join(routeBase, normalizeRoutePath(relPath)), 'utf8').catch(() => null),
		close: async () => {}
	};
}

async function fromDirectory(dir: string): Promise<ExportSource> {
	const isExportXml = (n: string) => n.toLowerCase().endsWith('.xml') && !isClinicalDocument(n);

	// Si può puntare alla cartella che contiene apple_health_export, o direttamente a quella.
	const here = await readdir(dir);
	const base = here.some(isExportXml) ? dir : path.join(dir, 'apple_health_export');
	const inBase = base === dir ? here : await readdir(base).catch(() => [] as string[]);

	const candidates = inBase.filter(isExportXml);
	if (!candidates.length) throw new Error(`Non trovo nessun XML di export in ${base}`);

	// Anche qui, fra più XML vince il più grande.
	const sized = await Promise.all(
		candidates.map(async (n) => ({ n, size: (await stat(path.join(base, n)).catch(() => null))?.size ?? 0 }))
	);
	const chosen = sized.sort((a, b) => b.size - a.size)[0];

	return fromXmlFile(path.join(base, chosen.n), base);
}

export async function openExport(target: string): Promise<ExportSource> {
	const info = await stat(target).catch(() => null);
	if (!info) throw new Error(`Percorso inesistente: ${target}`);

	if (info.isDirectory()) return fromDirectory(target);
	if (target.toLowerCase().endsWith('.zip')) return fromZip(target);
	// Un XML isolato non porta con sé le tracce: le cerchiamo nella sua cartella, se ci sono.
	if (target.toLowerCase().endsWith('.xml')) return fromXmlFile(target, path.dirname(target));

	throw new Error(`Formato non riconosciuto: ${target} (attesi .zip, .xml o una cartella)`);
}
