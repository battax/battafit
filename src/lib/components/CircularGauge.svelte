<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * Un quadrante ad arco.
	 *
	 * `origin` decide da dove parte il riempimento. Con `start` è il quadrante
	 * classico, che si riempie da sinistra; con `centre` parte dalle ore dodici
	 * e cresce nei due versi, ed è la forma giusta per una grandezza che ha un
	 * segno — uno scostamento che si legge come «di quanto e da che parte»
	 * invece che come «quanto pieno».
	 *
	 * Le tacche non sono decorazione: dividono l'arco nelle stesse unità in cui
	 * è espresso il numero al centro, così lo si può stimare senza leggerlo.
	 */

	interface Props {
		value: number | null;
		min: number;
		max: number;
		/** Da dove cresce il riempimento. */
		origin?: 'start' | 'centre';
		size?: number;
		/** Ampiezza dell'arco in gradi. 360 chiude il cerchio. */
		sweep?: number;
		color?: string;
		/** Numero di tacche sull'arco, estremi compresi. */
		ticks?: number;
		/** Estremi della scala, scritti alle punte dell'arco. Senza, il numero al centro non ha un metro. */
		minLabel?: string;
		maxLabel?: string;
		label?: string;
		children?: Snippet;
	}

	let {
		value,
		min,
		max,
		origin = 'start',
		size = 200,
		sweep = 260,
		color = 'var(--color-bio)',
		ticks = 9,
		minLabel,
		maxLabel,
		label = '',
		children
	}: Props = $props();

	const C = $derived(size / 2);
	const STROKE = $derived(Math.max(8, size * 0.07));
	/* Il raggio lascia fuori una corona: ci stanno le tacche e, più all'esterno,
	   gli estremi della scala. Senza quel margine le due cifre finivano addosso
	   al testo del centro. */
	const R = $derived(C - STROKE / 2 - 18);

	/** Da valore ad angolo, in gradi orari a partire dalle ore dodici. */
	const angleOf = $derived((v: number) => {
		const t = (v - min) / (max - min || 1);
		return -sweep / 2 + Math.max(0, Math.min(1, t)) * sweep;
	});

	function point(angle: number, radius: number): [number, number] {
		const a = ((angle - 90) * Math.PI) / 180;
		return [C + radius * Math.cos(a), C + radius * Math.sin(a)];
	}

	function arc(from: number, to: number, radius: number): string {
		const [x1, y1] = point(from, radius);
		const [x2, y2] = point(to, radius);
		const large = Math.abs(to - from) > 180 ? 1 : 0;
		const dir = to >= from ? 1 : 0;
		return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} ${dir} ${x2} ${y2}`;
	}

	const originAngle = $derived(origin === 'centre' ? angleOf((min + max) / 2) : angleOf(min));
	const valueAngle = $derived(value == null ? originAngle : angleOf(value));

	const tickMarks = $derived(
		Array.from({ length: ticks }, (_, i) => {
			const v = min + ((max - min) * i) / (ticks - 1);
			const a = angleOf(v);
			const outer = R + STROKE / 2 + 5;
			const inner = outer - (i === 0 || i === ticks - 1 || v === (min + max) / 2 ? 7 : 4);
			const [x1, y1] = point(a, inner);
			const [x2, y2] = point(a, outer);
			return { i, x1, y1, x2, y2, major: v === (min + max) / 2 };
		})
	);
</script>

<div class="relative shrink-0" style="width: {size}px; height: {size}px">
	<svg width={size} height={size} viewBox="0 0 {size} {size}" role="img" aria-label={label}>
		{#each tickMarks as tick (tick.i)}
			<line
				x1={tick.x1}
				y1={tick.y1}
				x2={tick.x2}
				y2={tick.y2}
				stroke={tick.major ? 'var(--color-ink-3)' : 'var(--color-line)'}
				stroke-width={tick.major ? 1.5 : 1}
				stroke-linecap="round"
			/>
		{/each}

		<!-- La traccia: dice quanto spazio c'era, non solo quanto è stato riempito. -->
		<path
			d={arc(-sweep / 2, sweep / 2, R)}
			fill="none"
			stroke="var(--color-line)"
			stroke-width={STROKE}
			stroke-linecap="round"
		/>

		{#if value != null && Math.abs(valueAngle - originAngle) > 0.5}
			<path
				d={arc(originAngle, valueAngle, R)}
				fill="none"
				stroke={color}
				stroke-width={STROKE}
				stroke-linecap="round"
				pathLength="1"
				class="glow-soft [animation:draw_.9s_var(--ease-settle)_both]"
				style="color: {color}"
			/>
		{/if}

		<!-- Gli estremi della scala, alle punte dell'arco: senza, «+5» non si sa su cosa. -->
		{#if minLabel}
			{@const [x, y] = point(-sweep / 2, R + STROKE / 2 + 10)}
			<text {x} {y} text-anchor="middle" dominant-baseline="middle" class="fill-ink-3 font-mono text-[10px]">
				{minLabel}
			</text>
		{/if}
		{#if maxLabel}
			{@const [x, y] = point(sweep / 2, R + STROKE / 2 + 10)}
			<text {x} {y} text-anchor="middle" dominant-baseline="middle" class="fill-ink-3 font-mono text-[10px]">
				{maxLabel}
			</text>
		{/if}
	</svg>

	{#if children}
		<div class="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
			{@render children()}
		</div>
	{/if}
</div>

<style>
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
</style>
