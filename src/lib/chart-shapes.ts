/**
 * Geometrie condivise dai grafici a barre.
 *
 * Una barra si arrotonda solo dall'estremità del dato, non dal basso: il lato
 * appoggiato all'asse deve restare squadrato, altrimenti la barra sembra
 * galleggiare invece di partire dallo zero. Nelle pile, solo il segmento più in
 * alto porta l'arrotondamento — arrotondarli tutti li farebbe leggere come
 * pillole indipendenti anziché come parti di un totale.
 */

/** Rettangolo con i due soli angoli superiori arrotondati. */
export function barPath(x: number, y: number, width: number, height: number, radius = 4): string {
	const r = Math.max(0, Math.min(radius, width / 2, height));
	if (r === 0) return `M${x},${y}h${width}v${height}h${-width}z`;

	return (
		`M${x},${y + r}` +
		`a${r},${r} 0 0 1 ${r},${-r}` +
		`h${width - 2 * r}` +
		`a${r},${r} 0 0 1 ${r},${r}` +
		`v${height - r}` +
		`h${-width}` +
		`z`
	);
}
