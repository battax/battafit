<script lang="ts">
	/**
	 * I tre anelli della giornata.
	 *
	 * I colori non sono quelli di Apple: la sua coppia rosso/verde per Movimento
	 * ed Esercizio è indistinguibile per chi ha un deficit di visione dei rossi
	 * e dei verdi (separazione misurata 4.3, ben sotto la soglia di 8). Qui gli
	 * anelli usano tre tinte della palette validata, e l'identità è comunque
	 * portata dal raggio e dall'etichetta, mai dal solo colore.
	 */

	interface Ring {
		label: string;
		value: number | null;
		goal: number | null;
		unit: string;
		color: string;
	}

	interface Props {
		move: { value: number | null; goal: number | null };
		exercise: { value: number | null; goal: number | null };
		stand: { value: number | null; goal: number | null };
		size?: number;
		/** Con le etichette accanto; senza, l'anello è un riepilogo compatto. */
		showLegend?: boolean;
	}

	let { move, exercise, stand, size = 132, showLegend = true }: Props = $props();

	const rings = $derived<Ring[]>([
		{ label: 'Movimento', value: move.value, goal: move.goal, unit: 'kcal', color: 'var(--color-move)' },
		{
			label: 'Esercizio',
			value: exercise.value,
			goal: exercise.goal,
			unit: 'min',
			color: 'var(--color-exercise)'
		},
		{ label: 'In piedi', value: stand.value, goal: stand.goal, unit: 'ore', color: 'var(--color-stand)' }
	]);

	const STROKE = $derived(Math.max(7, size * 0.085));
	const GAP = $derived(STROKE * 0.45);

	function radius(index: number): number {
		return size / 2 - STROKE / 2 - index * (STROKE + GAP);
	}

	function fraction(r: Ring): number {
		if (r.value == null || !r.goal) return 0;
		return Math.max(0, Math.min(1, r.value / r.goal));
	}

	function percent(r: Ring): number | null {
		if (r.value == null || !r.goal) return null;
		return Math.round((r.value / r.goal) * 100);
	}

	const nf = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 });
	const complete = $derived(rings.every((r) => fraction(r) >= 1));
</script>

<div class="flex items-center gap-5">
	<svg
		width={size}
		height={size}
		viewBox="0 0 {size} {size}"
		role="img"
		aria-label={rings
			.map((r) => `${r.label}: ${r.value == null ? 'nessun dato' : `${nf.format(r.value)} di ${nf.format(r.goal ?? 0)} ${r.unit}`}`)
			.join('. ')}
		class="shrink-0"
	>
		<g transform="rotate(-90 {size / 2} {size / 2})">
			{#each rings as ring, i (ring.label)}
				{@const r = radius(i)}
				{@const c = 2 * Math.PI * r}
				{@const f = fraction(ring)}
				<!-- Traccia dell'anello: il colore stesso al 15%, così il solco appartiene alla sua metrica. -->
				<circle
					cx={size / 2}
					cy={size / 2}
					{r}
					fill="none"
					stroke={ring.color}
					stroke-width={STROKE}
					opacity="0.15"
				/>
				{#if f > 0}
					<circle
						cx={size / 2}
						cy={size / 2}
						{r}
						fill="none"
						stroke={ring.color}
						stroke-width={STROKE}
						stroke-linecap="round"
						stroke-dasharray={c}
						stroke-dashoffset={c * (1 - f)}
						style="color: {ring.color}; --to: {c * (1 - f)}; --from: {c}; animation: sweep .9s var(--ease-settle) both; animation-delay: {i * 90}ms"
						class="glow"
					/>
				{/if}
			{/each}
		</g>
	</svg>

	{#if showLegend}
		<dl class="min-w-0 space-y-2.5">
			{#each rings as ring (ring.label)}
				{@const pct = percent(ring)}
				<div class="flex items-baseline gap-2.5">
					<span class="size-2 shrink-0 rounded-full" style="background: {ring.color}"></span>
					<div class="min-w-0">
						<dt class="label">{ring.label}</dt>
						<dd class="tabular mt-1 text-sm text-ink">
							{ring.value == null ? '—' : nf.format(ring.value)}
							<span class="text-ink-3">
								/ {ring.goal ? nf.format(ring.goal) : '—'}
								{ring.unit}
							</span>
							{#if pct != null}
								<span class="ml-1 text-xs" style="color: {ring.color}">{pct}%</span>
							{/if}
						</dd>
					</div>
				</div>
			{/each}
		</dl>
	{/if}
</div>

{#if complete && showLegend}
	<p class="mt-3 text-xs text-ink-2">Tutti e tre gli obiettivi raggiunti.</p>
{/if}

<style>
	@keyframes sweep {
		from {
			stroke-dashoffset: var(--from);
		}
		to {
			stroke-dashoffset: var(--to);
		}
	}
</style>
