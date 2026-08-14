/**
 * Lettura dei campi di un form.
 *
 * I form HTML mandano stringhe, e una casella lasciata vuota arriva come `''`,
 * non come assente. Senza queste conversioni un campo svuotato diventerebbe
 * `0` in un `real` e `"" `in un `text`: il registro si riempirebbe di zeri
 * che sembrano misure vere. Qui il vuoto torna a essere `null`.
 */

export function str(data: FormData, key: string): string | null {
	const raw = data.get(key);
	if (typeof raw !== 'string') return null;
	const trimmed = raw.trim();
	return trimmed === '' ? null : trimmed;
}

/**
 * Numero, con la virgola decimale accettata: su tastiera italiana è quello che
 * esce naturalmente, e rifiutarlo significherebbe perdere il dato in silenzio.
 */
export function num(data: FormData, key: string): number | null {
	const raw = str(data, key);
	if (raw == null) return null;
	const parsed = Number(raw.replace(',', '.'));
	return Number.isFinite(parsed) ? parsed : null;
}

/** Numero intero limitato a un intervallo; fuori scala torna `null` invece di essere troncato. */
export function int(data: FormData, key: string, min: number, max: number): number | null {
	const value = num(data, key);
	if (value == null) return null;
	const rounded = Math.round(value);
	return rounded >= min && rounded <= max ? rounded : null;
}

export function bool(data: FormData, key: string): boolean {
	const raw = data.get(key);
	return raw === 'on' || raw === 'true' || raw === '1' || raw === 'si';
}

/** Valore vincolato a una lista chiusa: quello che non è previsto diventa `null`. */
export function oneOf<T extends string>(data: FormData, key: string, allowed: readonly T[]): T | null {
	const raw = str(data, key);
	return raw != null && (allowed as readonly string[]).includes(raw) ? (raw as T) : null;
}

/** Data in formato ISO, validata: una stringa qualsiasi non deve arrivare al database. */
export function day(data: FormData, key: string): string | null {
	const raw = str(data, key);
	if (raw == null || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
	return Number.isNaN(new Date(raw + 'T00:00:00Z').getTime()) ? null : raw;
}
