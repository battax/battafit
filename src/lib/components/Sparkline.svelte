<script lang="ts">
	import { scaleLinear } from 'd3-scale';
	import { line as d3line, curveMonotoneX } from 'd3-shape';
	import { extent } from 'd3-array';

	/**
	 * Traccia minima da affiancare a un numero: dà la forma dell'andamento
	 * senza pretendere di essere letta con precisione. Niente assi, niente
	 * etichette — il numero grande accanto è il dato, questa è la sua storia.
	 */

	interface Props {
		values: (number | null)[];
		color?: string;
		width?: number;
		height?: number;
		/** Evidenzia l'ultimo punto: è quello a cui si riferisce il numero. */
		markLast?: boolean;
	}

	let { values, color = 'var(--color-suit-blue)', width = 96, height = 28, markLast = true }: Props = $props();

	const clean = $derived(
		values.map((v, i) => ({ i, v })).filter((d): d is { i: number; v: number } => d.v != null && Number.isFinite(d.v))
	);

	const x = $derived(scaleLinear().domain([0, Math.max(1, values.length - 1)]).range([1.5, width - 1.5]));
	const y = $derived.by(() => {
		const [lo, hi] = extent(clean, (d) => d.v) as [number, number];
		if (lo === undefined) return scaleLinear().domain([0, 1]).range([height - 2, 2]);
		return scaleLinear()
			.domain(lo === hi ? [lo - 1, hi + 1] : [lo, hi])
			.range([height - 2, 2]);
	});

	const path = $derived(
		d3line<{ i: number; v: number }>()
			.x((d) => x(d.i))
			.y((d) => y(d.v))
			.curve(curveMonotoneX)(clean)
	);

	const last = $derived(clean.at(-1));
</script>

{#if clean.length > 1}
	<svg {width} {height} aria-hidden="true" class="overflow-visible">
		<path d={path} fill="none" stroke={color} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
		{#if markLast && last}
			<circle cx={x(last.i)} cy={y(last.v)} r="2.5" fill={color} />
		{/if}
	</svg>
{:else}
	<div style="width: {width}px; height: {height}px"></div>
{/if}
