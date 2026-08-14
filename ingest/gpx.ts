/**
 * Estrazione delle tracce GPS dai file GPX che accompagnano gli allenamenti
 * all'aperto.
 *
 * I GPX di Apple campionano circa una volta al secondo: un'uscita in bici di
 * due ore fa 7000 punti, che nel database sarebbero decine di megabyte e sulla
 * mappa non aggiungono nulla di visibile. Riduciamo a un tetto di punti
 * mantenendo sempre il primo e l'ultimo, così la traccia resta chiusa.
 */

export interface RoutePoint {
	lon: number;
	lat: number;
	ele: number | null;
	t: number; // secondi dall'inizio della traccia
}

const TRKPT = /<trkpt\s+[^>]*lat="([-\d.]+)"[^>]*lon="([-\d.]+)"[^>]*>([\s\S]*?)<\/trkpt>/g;
const ELE = /<ele>([-\d.]+)<\/ele>/;
const TIME = /<time>([^<]+)<\/time>/;

export function parseGpx(xml: string): RoutePoint[] {
	const points: RoutePoint[] = [];
	let t0: number | null = null;

	for (const m of xml.matchAll(TRKPT)) {
		const lat = Number(m[1]);
		const lon = Number(m[2]);
		if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

		const body = m[3];
		const ele = ELE.exec(body);
		const time = TIME.exec(body);
		const ts = time ? Date.parse(time[1]) : NaN;
		if (t0 === null && Number.isFinite(ts)) t0 = ts;

		points.push({
			lon,
			lat,
			ele: ele ? Number(ele[1]) : null,
			t: Number.isFinite(ts) && t0 !== null ? Math.round((ts - t0) / 1000) : points.length
		});
	}

	return points;
}

/** Campiona la traccia a intervalli regolari, preservando inizio e fine. */
export function downsampleRoute(points: RoutePoint[], maxPoints: number): RoutePoint[] {
	if (points.length <= maxPoints) return points;
	const step = (points.length - 1) / (maxPoints - 1);
	const out: RoutePoint[] = [];
	for (let i = 0; i < maxPoints - 1; i++) out.push(points[Math.round(i * step)]);
	out.push(points[points.length - 1]);
	return out;
}

export function routeBbox(points: RoutePoint[]): [number, number, number, number] | null {
	if (!points.length) return null;
	let minLon = Infinity,
		minLat = Infinity,
		maxLon = -Infinity,
		maxLat = -Infinity;
	for (const p of points) {
		if (p.lon < minLon) minLon = p.lon;
		if (p.lat < minLat) minLat = p.lat;
		if (p.lon > maxLon) maxLon = p.lon;
		if (p.lat > maxLat) maxLat = p.lat;
	}
	return [minLon, minLat, maxLon, maxLat];
}

/** Dislivello positivo cumulato, in metri. Ignora le oscillazioni sotto il metro, che sono rumore del GPS. */
export function elevationGain(points: RoutePoint[]): number | null {
	let gain = 0;
	let last: number | null = null;
	let seen = false;

	for (const p of points) {
		if (p.ele == null) continue;
		seen = true;
		if (last !== null && p.ele - last > 1) gain += p.ele - last;
		if (last === null || Math.abs(p.ele - last) > 1) last = p.ele;
	}

	return seen ? Math.round(gain) : null;
}
