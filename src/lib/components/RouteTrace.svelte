<script lang="ts">
	/**
	 * La traccia GPS di un allenamento, disegnata come tracciato luminoso.
	 *
	 * Non c'è nessuna mappa sotto, ed è una scelta: una mappa richiederebbe una
	 * chiave verso un fornitore di tile e, soprattutto, gli manderebbe le
	 * coordinate di ogni uscita — cioè l'indirizzo di casa. La forma del
	 * percorso da sola dice già quale giro è stato fatto, e resta sul proprio
	 * server. La barra della scala dà la misura che la mappa avrebbe dato.
	 */

	interface Props {
		/** Punti [lon, lat, quota, offset_secondi] come salvati nel database. */
		route: [number, number, number | null, number][];
		height?: number;
		color?: string;
	}

	let { route, height = 300, color = 'var(--color-s7)' }: Props = $props();

	let width = $state(600);
	const PAD = 24;

	const meanLat = $derived(route.length ? route.reduce((a, p) => a + p[1], 0) / route.length : 0);

	/**
	 * Proiezione equirettangolare con correzione del coseno della latitudine.
	 * Su distanze da allenamento la deformazione è trascurabile, e senza la
	 * correzione un percorso quadrato verrebbe schiacciato in un rettangolo.
	 */
	const projected = $derived(
		route.map(([lon, lat, ele, t]) => ({
			x: lon * Math.cos((meanLat * Math.PI) / 180),
			y: -lat,
			ele,
			t
		}))
	);

	const bounds = $derived.by(() => {
		if (!projected.length) return null;
		let minX = Infinity,
			minY = Infinity,
			maxX = -Infinity,
			maxY = -Infinity;
		for (const p of projected) {
			if (p.x < minX) minX = p.x;
			if (p.y < minY) minY = p.y;
			if (p.x > maxX) maxX = p.x;
			if (p.y > maxY) maxY = p.y;
		}
		return { minX, minY, maxX, maxY, w: maxX - minX || 1e-9, h: maxY - minY || 1e-9 };
	});

	/** Una sola scala per i due assi, altrimenti il percorso si deforma. */
	const scale = $derived(
		bounds ? Math.min((width - PAD * 2) / bounds.w, (height - PAD * 2) / bounds.h) : 1
	);

	const offset = $derived.by(() => {
		if (!bounds) return { x: 0, y: 0 };
		return {
			x: (width - bounds.w * scale) / 2 - bounds.minX * scale,
			y: (height - bounds.h * scale) / 2 - bounds.minY * scale
		};
	});

	const path = $derived(
		projected.map((p, i) => `${i === 0 ? 'M' : 'L'}${(p.x * scale + offset.x).toFixed(1)},${(p.y * scale + offset.y).toFixed(1)}`).join('')
	);

	const start = $derived(projected[0]);
	const end = $derived(projected.at(-1));
	const at = (p: { x: number; y: number }) => ({ cx: p.x * scale + offset.x, cy: p.y * scale + offset.y });

	/** Metri per pixel, per dimensionare la barra della scala. */
	const metersPerPixel = $derived(111_320 / scale);

	/** Una barra di lunghezza "tonda" (100 m, 500 m, 1 km…) larga circa 80px. */
	const scaleBar = $derived.by(() => {
		const target = 80 * metersPerPixel;
		const steps = [50, 100, 200, 500, 1000, 2000, 5000, 10_000, 20_000, 50_000];
		const meters = steps.find((s) => s >= target) ?? steps.at(-1)!;
		return {
			px: meters / metersPerPixel,
			label: meters >= 1000 ? `${meters / 1000} km` : `${meters} m`
		};
	});
</script>

<div class="relative w-full overflow-hidden rounded-[10px] bg-panel-2" bind:clientWidth={width}>
	{#if route.length > 1}
		<!-- SVG in assoluto: vedi la nota in TimeChart, stessa ragione. -->
		<div class="relative" style="height: {height}px">
		<svg {width} {height} role="img" aria-label="Tracciato dell'allenamento" class="absolute inset-0">
			<path
				d={path}
				fill="none"
				stroke={color}
				stroke-width="2.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				pathLength="1"
				class="glow [animation:trace_1.6s_var(--ease-settle)_both]"
				style="color: {color}"
			/>

			{#if start}
				{@const s = at(start)}
				<circle cx={s.cx} cy={s.cy} r="5" fill="var(--color-panel-2)" />
				<circle cx={s.cx} cy={s.cy} r="3" fill="var(--color-ink)" />
			{/if}
			{#if end}
				{@const e = at(end)}
				<circle cx={e.cx} cy={e.cy} r="6" fill="var(--color-panel-2)" />
				<circle cx={e.cx} cy={e.cy} r="4" fill={color} />
			{/if}

			<g transform="translate(14,{height - 16})">
				<line x1="0" x2={scaleBar.px} y1="0" y2="0" stroke="var(--color-ink-3)" stroke-width="1.5" />
				<line x1="0" x2="0" y1="-3" y2="3" stroke="var(--color-ink-3)" stroke-width="1.5" />
				<line x1={scaleBar.px} x2={scaleBar.px} y1="-3" y2="3" stroke="var(--color-ink-3)" stroke-width="1.5" />
				<text x={scaleBar.px + 7} y="3.5" class="fill-ink-3 text-[10px]">{scaleBar.label}</text>
			</g>
		</svg>
		</div>

		<p class="absolute top-3 right-3 text-[10px] text-ink-3">
			<span class="mr-2"><span class="mr-1 inline-block size-1.5 rounded-full bg-ink align-middle"></span>partenza</span>
			<span><span class="mr-1 inline-block size-1.5 rounded-full align-middle" style="background: {color}"></span>arrivo</span>
		</p>
	{:else}
		<div class="flex items-center justify-center text-sm text-ink-3" style="height: {height}px">
			Nessuna traccia GPS per questo allenamento
		</div>
	{/if}
</div>

<style>
	@keyframes trace {
		from {
			stroke-dasharray: 1;
			stroke-dashoffset: 1;
		}
		to {
			stroke-dasharray: 1;
			stroke-dashoffset: 0;
		}
	}
</style>
