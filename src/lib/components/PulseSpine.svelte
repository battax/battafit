<script lang="ts">
	import { scaleLinear } from 'd3-scale';
	import { line as d3line, curveMonotoneX } from 'd3-shape';
	import { extent } from 'd3-array';

	/**
	 * La spina dorsale: il divisore sotto il titolo di pagina non è un filetto,
	 * è la frequenza cardiaca a riposo degli ultimi trenta giorni.
	 *
	 * Sta nello spazio che sarebbe andato a una riga decorativa, quindi non
	 * costa niente in altezza, e viene dritta dal battito che attraversa la
	 * scritta del logo. Resta identica su tutte le pagine perché è il polso
	 * dell'app: un monitor che scorre in alto, non un ornamento per sezione.
	 *
	 * Il numero all'estremità destra è quello che la salva dal diventare
	 * carta da parati: la dichiara una lettura, non un tratto di penna.
	 */

	interface Props {
		points: { day: string; value: number | null }[];
		color?: string;
		height?: number;
	}

	let { points, color = 'var(--color-motion)', height = 34 }: Props = $props();

	let width = $state(600);

	const clean = $derived(
		points
			.map((p, i) => ({ i, v: p.value }))
			.filter((p): p is { i: number; v: number } => p.v != null && Number.isFinite(p.v))
	);

	const x = $derived(scaleLinear().domain([0, Math.max(1, points.length - 1)]).range([0, width]));

	const y = $derived.by(() => {
		const [lo, hi] = extent(clean, (d) => d.v) as [number, number];
		if (lo === undefined) return scaleLinear().domain([0, 1]).range([height - 6, 6]);
		// Il margine impedisce che i picchi tocchino i bordi della striscia.
		return scaleLinear()
			.domain(lo === hi ? [lo - 1, hi + 1] : [lo, hi])
			.range([height - 6, 6]);
	});

	const path = $derived(
		d3line<{ i: number; v: number }>()
			.x((d) => x(d.i))
			.y((d) => y(d.v))
			.curve(curveMonotoneX)(clean)
	);

	const last = $derived(clean.at(-1));
	const nf = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 });
</script>

{#if clean.length > 1}
	<div class="mt-3 flex items-center gap-4">
		<div class="relative min-w-0 flex-1" bind:clientWidth={width} style="height: {height}px">
			<svg
				{width}
				{height}
				class="absolute inset-0 overflow-visible"
				role="img"
				aria-label="Frequenza cardiaca a riposo degli ultimi {points.length} giorni"
			>
				<path
					d={path}
					fill="none"
					stroke={color}
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					pathLength="1"
					class="glow [animation:spine_1.1s_var(--ease-settle)_both]"
					style="color: {color}"
				/>
				{#if last}
					<circle cx={x(last.i)} cy={y(last.v)} r="2.5" fill={color} class="glow" style="color: {color}" />
				{/if}
			</svg>
		</div>

		<p class="shrink-0 font-mono text-[10px] leading-tight tracking-tight text-ink-3">
			<span class="text-ink-2">{last ? nf.format(last.v) : '—'}</span> bpm<br />
			a riposo · {points.length}gg
		</p>
	</div>
{:else}
	<!-- Senza dati sufficienti torna a essere quello che sostituisce: una riga. -->
	<div class="mt-3 h-px bg-line"></div>
{/if}

<style>
	@keyframes spine {
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
