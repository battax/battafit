<script lang="ts">
	import { scaleLinear } from 'd3-scale';
	import { line as d3line, area as d3area, curveMonotoneX } from 'd3-shape';
	import { extent } from 'd3-array';

	/**
	 * Frequenza cardiaca dentro un allenamento.
	 *
	 * L'asse orizzontale è il tempo trascorso dall'inizio, non un calendario:
	 * qui interessa dove è arrivato lo sforzo al minuto dodici, non in che data
	 * fosse. Per questo non riusa il grafico temporale delle altre pagine.
	 */

	interface Props {
		samples: { offsetSec: number; bpm: number }[];
		height?: number;
		color?: string;
		/** Frequenza media, tracciata come riferimento orizzontale. */
		average?: number | null;
	}

	let { samples, height = 200, color = 'var(--color-motion)', average = null }: Props = $props();

	let width = $state(720);
	let hovered = $state<number | null>(null);

	const PAD = { top: 12, right: 8, bottom: 22, left: 40 };
	const innerW = $derived(Math.max(10, width - PAD.left - PAD.right));
	const innerH = $derived(Math.max(10, height - PAD.top - PAD.bottom));

	const x = $derived(
		scaleLinear()
			.domain(extent(samples, (s) => s.offsetSec) as [number, number])
			.range([0, innerW])
	);

	const y = $derived.by(() => {
		const [lo, hi] = extent(samples, (s) => s.bpm) as [number, number];
		if (lo === undefined) return scaleLinear().domain([60, 180]).range([innerH, 0]);
		const pad = Math.max(4, (hi - lo) * 0.12);
		return scaleLinear().domain([lo - pad, hi + pad]).range([innerH, 0]).nice();
	});

	const linePath = $derived(
		d3line<{ offsetSec: number; bpm: number }>()
			.x((s) => x(s.offsetSec))
			.y((s) => y(s.bpm))
			.curve(curveMonotoneX)(samples)
	);

	const areaPath = $derived(
		d3area<{ offsetSec: number; bpm: number }>()
			.x((s) => x(s.offsetSec))
			.y0(innerH)
			.y1((s) => y(s.bpm))
			.curve(curveMonotoneX)(samples)
	);

	/** Secondi → "12:30", o "1:04:12" per le uscite lunghe. */
	function clock(seconds: number): string {
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = Math.round(seconds % 60);
		if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
		return `${m}:${String(s).padStart(2, '0')}`;
	}

	function onMove(event: PointerEvent) {
		if (!samples.length) return;
		const rect = (event.currentTarget as SVGElement).getBoundingClientRect();
		const t = x.invert(Math.max(0, Math.min(innerW, event.clientX - rect.left - PAD.left)));
		let best = 0;
		let bestDist = Infinity;
		for (let i = 0; i < samples.length; i++) {
			const d = Math.abs(samples[i].offsetSec - t);
			if (d < bestDist) {
				bestDist = d;
				best = i;
			}
		}
		hovered = best;
	}

	const active = $derived(hovered != null ? samples[hovered] : null);
	const tooltipX = $derived(active ? PAD.left + x(active.offsetSec) : 0);
	const tooltipFlip = $derived(tooltipX > width - 110);
</script>

<div class="relative w-full" bind:clientWidth={width}>
	{#if samples.length > 1}
		<!-- SVG in assoluto: vedi la nota in TimeChart, stessa ragione. -->
		<div class="relative" style="height: {height}px">
		<svg
			{width}
			{height}
			role="img"
			aria-label="Frequenza cardiaca durante l'allenamento"
			onpointermove={onMove}
			onpointerleave={() => (hovered = null)}
			class="absolute inset-0 touch-pan-y select-none"
		>
			<g transform="translate({PAD.left},{PAD.top})">
				{#each y.ticks(4) as tick (tick)}
					<line x1="0" x2={innerW} y1={y(tick)} y2={y(tick)} stroke="var(--color-grid)" stroke-width="1" />
					<text x="-8" y={y(tick)} text-anchor="end" dominant-baseline="middle" class="fill-ink-3 font-mono text-[10px]">
						{tick}
					</text>
				{/each}

				{#if average}
					<line
						x1="0"
						x2={innerW}
						y1={y(average)}
						y2={y(average)}
						stroke="var(--color-ink-3)"
						stroke-width="1"
						stroke-dasharray="3 4"
					/>
					<text x={innerW} y={y(average) - 5} text-anchor="end" class="fill-ink-3 font-mono text-[10px]">
						media {Math.round(average)}
					</text>
				{/if}

				<path d={areaPath} fill={color} opacity="0.1" />
				<path
					d={linePath}
					fill="none"
					stroke={color}
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					pathLength="1"
					class="glow [animation:trace_1.2s_var(--ease-settle)_both]"
					style="color: {color}"
				/>

				{#each x.ticks(Math.min(6, Math.max(2, Math.round(innerW / 90)))) as tick (tick)}
					<text x={x(tick)} y={innerH + 15} text-anchor="middle" class="fill-ink-3 font-mono text-[10px]">
						{clock(tick)}
					</text>
				{/each}

				{#if active}
					<line x1={x(active.offsetSec)} x2={x(active.offsetSec)} y1="0" y2={innerH} stroke="var(--color-line-strong)" stroke-width="1" />
					<circle cx={x(active.offsetSec)} cy={y(active.bpm)} r="6" fill="var(--color-panel-solid)" />
					<circle cx={x(active.offsetSec)} cy={y(active.bpm)} r="4" fill={color} />
				{/if}
			</g>
		</svg>
		</div>

		{#if active}
			<div
				class="pointer-events-none absolute top-1 z-10 rounded-lg border border-line-strong bg-panel-2/95 px-2.5 py-1.5 shadow-lg shadow-black/40"
				style="left: {tooltipX}px; transform: translateX({tooltipFlip ? '-100%' : '0'})"
			>
				<p class="font-mono text-[10px] whitespace-nowrap text-ink-3">{clock(active.offsetSec)}</p>
				<p class="font-mono text-sm font-medium whitespace-nowrap text-ink">
					{Math.round(active.bpm)}<span class="ml-1 text-xs text-ink-2">bpm</span>
				</p>
			</div>
		{/if}
	{:else}
		<div class="flex items-center justify-center text-sm text-ink-3" style="height: {height}px">
			Nessun dato cardiaco per questo allenamento
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
