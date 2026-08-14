<script lang="ts">
	/**
	 * Il quadrante della giornata.
	 *
	 * Tre archi concentrici — Movimento, Esercizio, In piedi — dentro una
	 * ghiera di ventiquattro tacche. La ghiera non è un ornamento: ogni tacca è
	 * un'ora del giorno, e sono accese quelle già passate. È il pezzo che
	 * risponde alla domanda che gli anelli da soli non toccano mai — «quanto
	 * tempo mi resta per chiuderli» — e per questo si spegne del tutto quando la
	 * giornata mostrata non è quella in corso: una ghiera piena su un giorno
	 * chiuso direbbe una cosa falsa.
	 *
	 * Al centro non c'è luce: c'è il conto degli obiettivi chiusi. È il posto più
	 * prezioso del quadrante ed è l'unico numero che riassume tutti e tre gli
	 * archi senza sceglierne uno.
	 *
	 * I colori non sono quelli di Apple: la sua coppia rosso/verde per Movimento
	 * ed Esercizio è indistinguibile per chi ha un deficit di visione dei rossi e
	 * dei verdi. Qui gli archi sono rosso, blu e oro, e l'identità è comunque
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
		/** Ore già trascorse della giornata mostrata. `null` se non è oggi. */
		hoursElapsed?: number | null;
		/** Con le etichette accanto; senza, il quadrante è un riepilogo compatto. */
		showLegend?: boolean;
	}

	let { move, exercise, stand, size = 200, hoursElapsed = null, showLegend = false }: Props = $props();

	const rings = $derived<Ring[]>([
		{ label: 'Movimento', value: move.value, goal: move.goal, unit: 'kcal', color: 'var(--color-move)' },
		{ label: 'Esercizio', value: exercise.value, goal: exercise.goal, unit: 'min', color: 'var(--color-exercise)' },
		{ label: 'In piedi', value: stand.value, goal: stand.goal, unit: 'ore', color: 'var(--color-stand)' }
	]);

	const C = $derived(size / 2);

	/* La ghiera si prende un anello esterno di 15px; gli archi cominciano dentro. */
	const BEZEL = 15;
	const STROKE = $derived(Math.max(6, size * 0.065));
	const GAP = $derived(STROKE * 0.5);

	function radius(index: number): number {
		return C - BEZEL - STROKE / 2 - index * (STROKE + GAP);
	}

	const holeR = $derived(radius(2) - STROKE / 2);

	function fraction(r: Ring): number {
		if (r.value == null || !r.goal) return 0;
		return Math.max(0, Math.min(1, r.value / r.goal));
	}

	function percent(r: Ring): number | null {
		if (r.value == null || !r.goal) return null;
		return Math.round((r.value / r.goal) * 100);
	}

	const closed = $derived(rings.filter((r) => fraction(r) >= 1).length);
	/** Un quadrante senza nessun dato non deve dire "0 su 3": non è zero, è vuoto. */
	const anyData = $derived(rings.some((r) => r.value != null && r.goal));

	/** Le ventiquattro tacche orarie, in coordinate già ruotate a partire dall'alto. */
	const ticks = $derived(
		Array.from({ length: 24 }, (_, h) => {
			const a = ((h * 15 - 90) * Math.PI) / 180;
			const long = h % 6 === 0;
			const outer = C - 2;
			const inner = outer - (long ? 8 : 4.5);
			return {
				h,
				long,
				x1: C + Math.cos(a) * inner,
				y1: C + Math.sin(a) * inner,
				x2: C + Math.cos(a) * outer,
				y2: C + Math.sin(a) * outer
			};
		})
	);

	const nf = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 });
</script>

<div class="flex items-center gap-6">
	<svg
		width={size}
		height={size}
		viewBox="0 0 {size} {size}"
		role="img"
		aria-label={rings
			.map(
				(r) =>
					`${r.label}: ${r.value == null ? 'nessun dato' : `${nf.format(r.value)} di ${nf.format(r.goal ?? 0)} ${r.unit}`}`
			)
			.join('. ')}
		class="shrink-0"
	>
		<!-- La ghiera oraria. -->
		{#each ticks as tick (tick.h)}
			{@const passed = hoursElapsed != null && tick.h < hoursElapsed}
			<line
				x1={tick.x1}
				y1={tick.y1}
				x2={tick.x2}
				y2={tick.y2}
				stroke={passed ? 'var(--color-ink-3)' : 'var(--color-line)'}
				stroke-width={tick.long ? 1.5 : 1}
				stroke-linecap="round"
			/>
		{/each}

		<g transform="rotate(-90 {C} {C})">
			{#each rings as ring, i (ring.label)}
				{@const r = radius(i)}
				{@const c = 2 * Math.PI * r}
				{@const f = fraction(ring)}
				<!-- Traccia dell'arco: il colore stesso al 15%, così il solco appartiene alla sua metrica. -->
				<circle cx={C} cy={C} {r} fill="none" stroke={ring.color} stroke-width={STROKE} opacity="0.15" />
				{#if f > 0}
					<circle
						cx={C}
						cy={C}
						{r}
						fill="none"
						stroke={ring.color}
						stroke-width={STROKE}
						stroke-linecap="round"
						stroke-dasharray={c}
						stroke-dashoffset={c * (1 - f)}
						style="color: {ring.color}; --to: {c * (1 - f)}; --from: {c}; animation: sweep .9s var(--ease-settle) both; animation-delay: {i *
							90}ms"
						class="glow-soft"
					/>
				{/if}
			{/each}
		</g>

		<!-- Il conto al centro. Il cerchio pieno lo stacca dagli archi che gli girano attorno. -->
		<circle cx={C} cy={C} r={holeR} fill="var(--color-page)" opacity="0.55" />
		{#if anyData}
			<text
				x={C}
				y={C - 1}
				text-anchor="middle"
				dominant-baseline="middle"
				class="fill-ink font-mono font-medium"
				style="font-size: {Math.round(size * 0.115)}px"
			>
				{closed}<tspan class="fill-ink-3">/3</tspan>
			</text>
			<text
				x={C}
				y={C + Math.round(size * 0.1)}
				text-anchor="middle"
				class="fill-ink-3 font-mono"
				style="font-size: {Math.max(8, Math.round(size * 0.045))}px; letter-spacing: 0.1em"
			>
				CHIUSI
			</text>
		{:else}
			<text x={C} y={C} text-anchor="middle" dominant-baseline="middle" class="fill-ink-3 font-mono text-sm">—</text>
		{/if}
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
