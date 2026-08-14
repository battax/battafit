<script lang="ts">
	import { scaleLinear, scaleUtc } from 'd3-scale';
	import { line as d3line, area as d3area, curveMonotoneX } from 'd3-shape';
	import { max as d3max, min as d3min } from 'd3-array';
	import Icon from './Icon.svelte';
	import { barPath } from '$lib/chart-shapes';

	/**
	 * Grafico temporale: una serie, per giorno, come linea o come barre.
	 *
	 * Linea e barre condividono lo stesso componente perché condividono tutto il
	 * resto — scale, assi, mirino, tooltip, stato vuoto. Tenerli separati
	 * significherebbe due tooltip che col tempo si comportano in modo diverso.
	 */

	export interface Point {
		day: string;
		value: number | null;
	}

	interface Props {
		data: Point[];
		/** Linea per le grandezze continue (frequenza, peso), barre per i conteggi (passi, minuti). */
		mark?: 'line' | 'bar';
		color?: string;
		height?: number;
		/** Formattazione del valore nel tooltip e sull'asse. */
		format?: (v: number) => string;
		unit?: string;
		/** Linea di riferimento orizzontale: obiettivo, media, soglia. */
		reference?: { value: number; label: string } | null;
		/** Le somme partono da zero; le misure fisiologiche no, o si appiattiscono. */
		zeroBased?: boolean;
		label?: string;
	}

	let {
		data,
		mark = 'line',
		color = 'var(--color-suit-blue)',
		height = 220,
		format = (v: number) => new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 }).format(v),
		unit = '',
		reference = null,
		zeroBased = mark === 'bar',
		label = ''
	}: Props = $props();

	let width = $state(720);
	let hovered = $state<number | null>(null);

	const PAD = { top: 12, right: 8, bottom: 24, left: 44 };

	const points = $derived(
		data
			.map((d, i) => ({ ...d, date: new Date(d.day + 'T00:00:00Z'), i }))
			.filter((d) => !Number.isNaN(d.date.getTime()))
	);
	const valued = $derived(points.filter((p) => p.value != null) as { day: string; value: number; date: Date; i: number }[]);

	const innerW = $derived(Math.max(10, width - PAD.left - PAD.right));
	const innerH = $derived(Math.max(10, height - PAD.top - PAD.bottom));

	/**
	 * Spazio orizzontale che spetta a un giorno.
	 *
	 * Le barre sono centrate sul proprio giorno, quindi quella del primo e
	 * quella dell'ultimo sborderebbero di mezza barra oltre l'area del grafico,
	 * finendo sopra le etichette dell'asse. Rientrando la scala di mezzo slot
	 * ogni barra resta dentro il proprio spazio.
	 */
	const slot = $derived.by(() => {
		if (points.length < 2) return Math.min(32, innerW);
		const span = points[points.length - 1].date.getTime() - points[0].date.getTime();
		const days = Math.max(1, Math.round(span / 86_400_000)) + 1;
		return innerW / days;
	});

	const inset = $derived(mark === 'bar' ? slot / 2 : 0);

	const x = $derived(
		scaleUtc()
			.domain(
				points.length
					? [points[0].date, points[points.length - 1].date]
					: [new Date(), new Date()]
			)
			.range([inset, innerW - inset])
	);

	const yDomain = $derived.by(() => {
		const values = valued.map((p) => p.value);
		if (reference) values.push(reference.value);
		if (!values.length) return [0, 1];

		/**
		 * `zeroBased` tiene lo zero dentro la scala, sopra o sotto i dati che sia.
		 * Fissarlo come estremo inferiore romperebbe le serie negative: una
		 * differenza fra le due cosce che va da −3,8 a −3,2 darebbe un dominio
		 * [0, −3,2], cioè rovesciato, e il grafico si ribalterebbe.
		 */
		const dataLo = d3min(values) ?? 0;
		const dataHi = d3max(values) ?? 1;
		const lo = zeroBased ? Math.min(0, dataLo) : dataLo;
		const hi = zeroBased ? Math.max(0, dataHi) : dataHi;
		if (lo === hi) return [lo - 1, hi + 1];

		// Un margine del 12% impedisce che il picco tocchi il bordo superiore.
		const pad = (hi - lo) * 0.12;
		return [zeroBased ? 0 : lo - pad, hi + pad];
	});

	const y = $derived(scaleLinear().domain(yDomain).range([innerH, 0]).nice());

	/**
	 * Larghezza di una barra: lo spazio di un giorno meno 2px di stacco.
	 * Il distacco fra le barre è la superficie che passa, non un bordo colorato.
	 */
	const barW = $derived(Math.max(1, slot - 2));

	/** Le interruzioni nella serie devono restare buchi, non essere ricucite. */
	const segments = $derived.by(() => {
		const out: { day: string; value: number; date: Date }[][] = [];
		let run: { day: string; value: number; date: Date }[] = [];
		for (const p of points) {
			if (p.value == null) {
				if (run.length) out.push(run);
				run = [];
			} else {
				run.push({ day: p.day, value: p.value, date: p.date });
			}
		}
		if (run.length) out.push(run);
		return out;
	});

	const linePath = $derived(
		d3line<{ date: Date; value: number }>()
			.x((d) => x(d.date))
			.y((d) => y(d.value))
			.curve(curveMonotoneX)
	);

	const areaPath = $derived(
		d3area<{ date: Date; value: number }>()
			.x((d) => x(d.date))
			.y0(innerH)
			.y1((d) => y(d.value))
			.curve(curveMonotoneX)
	);

	/**
	 * Densità delle tacche in funzione dell'altezza: lo stesso componente serve
	 * i grafici grandi delle sezioni e le strisce da 72px della panoramica, e
	 * quattro etichette in settanta pixel finiscono una sull'altra.
	 */
	const yTicks = $derived(y.ticks(Math.max(2, Math.min(5, Math.round(innerH / 45)))));
	const xTicks = $derived.by(() => {
		if (!points.length) return [] as Date[];
		const span = points[points.length - 1].date.getTime() - points[0].date.getTime();
		const days = span / 86_400_000;
		const count = innerW < 420 ? 3 : innerW < 640 ? 4 : 6;
		return x.ticks(Math.min(count, Math.max(2, Math.round(days))));
	});

	const xTickFormat = $derived.by(() => {
		const span = points.length
			? points[points.length - 1].date.getTime() - points[0].date.getTime()
			: 0;
		const days = span / 86_400_000;
		if (days > 400) return new Intl.DateTimeFormat('it-IT', { year: 'numeric', timeZone: 'UTC' });
		if (days > 70) return new Intl.DateTimeFormat('it-IT', { month: 'short', timeZone: 'UTC' });
		return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', timeZone: 'UTC' });
	});

	const tooltipFormat = new Intl.DateTimeFormat('it-IT', {
		weekday: 'short',
		day: 'numeric',
		month: 'long',
		timeZone: 'UTC'
	});

	/** Punto della serie più vicino alla x del puntatore. */
	function onMove(event: PointerEvent) {
		if (!valued.length) return;
		const rect = (event.currentTarget as SVGElement).getBoundingClientRect();
		const px = event.clientX - rect.left - PAD.left;
		const t = x.invert(Math.max(0, Math.min(innerW, px))).getTime();

		let best = 0;
		let bestDist = Infinity;
		for (let i = 0; i < valued.length; i++) {
			const d = Math.abs(valued[i].date.getTime() - t);
			if (d < bestDist) {
				bestDist = d;
				best = i;
			}
		}
		hovered = best;
	}

	const active = $derived(hovered != null ? valued[hovered] : null);
	const tooltipX = $derived(active ? PAD.left + x(active.date) : 0);
	/** Il tooltip si ribalta a sinistra quando starebbe stretto contro il bordo destro. */
	const tooltipFlip = $derived(tooltipX > width - 130);
</script>

<div class="relative w-full" bind:clientWidth={width}>
	{#if !valued.length}
		<div
			class="flex flex-col items-center justify-center gap-2 text-ink-3"
			style="height: {height}px"
		>
			<Icon name="empty" size={22} />
			<p class="text-sm">Nessun dato in questo periodo</p>
		</div>
	{:else}
		<!--
			L'SVG è posizionato in assoluto dentro un riquadro di altezza nota, così la
			sua larghezza fissa non contribuisce alla larghezza intrinseca del
			contenitore. Senza questo, in un contenitore che si adatta al contenuto il
			grafico allargherebbe il proprio genitore e poi rimisurerebbe sé stesso più
			largo, senza mai assestarsi.
		-->
		<div class="relative" style="height: {height}px">
		<svg
			{width}
			{height}
			role="img"
			aria-label={label || 'Grafico temporale'}
			onpointermove={onMove}
			onpointerleave={() => (hovered = null)}
			class="absolute inset-0 touch-pan-y select-none"
		>
			<g transform="translate({PAD.left},{PAD.top})">
				<!-- Griglia: hairline recessiva, mai in primo piano rispetto ai dati. -->
				{#each yTicks as tick (tick)}
					<line x1="0" x2={innerW} y1={y(tick)} y2={y(tick)} stroke="var(--color-grid)" stroke-width="1" />
					<text
						x="-10"
						y={y(tick)}
						text-anchor="end"
						dominant-baseline="middle"
						class="fill-ink-3 font-mono text-[10px]"
					>
						{format(tick)}
					</text>
				{/each}

				{#if reference}
					<line
						x1="0"
						x2={innerW}
						y1={y(reference.value)}
						y2={y(reference.value)}
						stroke="var(--color-ink-3)"
						stroke-width="1"
						stroke-dasharray="3 4"
					/>
					<text x={innerW} y={y(reference.value) - 6} text-anchor="end" class="fill-ink-3 font-mono text-[10px]">
						{reference.label}
					</text>
				{/if}

				{#if mark === 'bar'}
					{#each valued as p, i (p.day)}
						{@const h = Math.max(2, innerH - y(p.value))}
						<path
							d={barPath(x(p.date) - barW / 2, y(p.value), barW, h)}
							fill={color}
							opacity={hovered == null || hovered === i ? 1 : 0.45}
							class="[animation:grow_.5s_var(--ease-settle)_both]"
							style="animation-delay: {Math.min(i * 4, 300)}ms; transform-box: fill-box; transform-origin: bottom;"
						/>
					{/each}
				{:else}
					{#each segments as seg, si (si)}
						{#if seg.length > 1}
							<path d={areaPath(seg)} fill={color} opacity="0.1" />
							<path
								d={linePath(seg)}
								fill="none"
								stroke={color}
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								pathLength="1"
								class="glow [animation:draw_1s_var(--ease-settle)_both]"
								style="color: {color}"
							/>
						{:else}
							<circle cx={x(seg[0].date)} cy={y(seg[0].value)} r="2.5" fill={color} />
						{/if}
					{/each}
				{/if}

				<!-- Asse dei tempi: solo etichette, la linea di base è già data dalla griglia. -->
				{#each xTicks as tick (tick.getTime())}
					<text
						x={x(tick)}
						y={innerH + 16}
						text-anchor="middle"
						class="fill-ink-3 font-mono text-[10px]"
					>
						{xTickFormat.format(tick)}
					</text>
				{/each}

				{#if active}
					<line
						x1={x(active.date)}
						x2={x(active.date)}
						y1="0"
						y2={innerH}
						stroke="var(--color-line-strong)"
						stroke-width="1"
					/>
					{#if mark === 'line'}
						<!-- Anello della superficie attorno al punto: lo stacca dalla linea sottostante. -->
						<circle cx={x(active.date)} cy={y(active.value)} r="6" fill="var(--color-panel)" />
						<circle cx={x(active.date)} cy={y(active.value)} r="4" fill={color} />
					{/if}
				{/if}
			</g>
		</svg>
		</div>

		{#if active}
			<div
				class="pointer-events-none absolute top-1 z-10 rounded-lg border border-line-strong bg-panel-2/95 px-2.5 py-1.5 shadow-lg shadow-black/40 backdrop-blur-sm"
				style="left: {tooltipX}px; transform: translateX({tooltipFlip ? '-100%' : '0'})"
			>
				<p class="text-[10px] whitespace-nowrap text-ink-3">{tooltipFormat.format(active.date)}</p>
				<p class="font-mono text-sm font-medium whitespace-nowrap text-ink">
					{format(active.value)}<span class="ml-1 text-xs text-ink-2">{unit}</span>
				</p>
			</div>
		{/if}
	{/if}
</div>

<style>
	/* `pathLength="1"` sul tracciato rende la lunghezza indipendente dalla scala:
	   lo scostamento va da 1 a 0 e la linea si disegna da sinistra a destra. */
	@keyframes draw {
		from {
			stroke-dasharray: 1;
			stroke-dashoffset: 1;
		}
		to {
			stroke-dasharray: 1;
			stroke-dashoffset: 0;
		}
	}

	@keyframes grow {
		from {
			transform: scaleY(0);
			opacity: 0;
		}
		to {
			transform: scaleY(1);
			opacity: 1;
		}
	}
</style>
