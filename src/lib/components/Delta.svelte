<script lang="ts">
	import Icon from './Icon.svelte';

	/**
	 * Variazione rispetto a un termine di paragone.
	 *
	 * Il segno è portato dalla freccia e dal numero, non dal colore: chi non
	 * distingue verde e rosso legge comunque se il valore è salito o sceso. Il
	 * colore aggiunge il giudizio — e il giudizio dipende dalla metrica, perché
	 * una frequenza a riposo che cala è una buona notizia, un passo in meno no.
	 */

	interface Props {
		current: number | null | undefined;
		baseline: number | null | undefined;
		/** Assente per le metriche neutre (peso, frequenza respiratoria): resta grigia. */
		higherIsBetter?: boolean;
		/** Cosa rappresenta il paragone, es. "sulla media di 30 giorni". */
		label?: string;
	}

	let { current, baseline, higherIsBetter, label = '' }: Props = $props();

	const change = $derived.by(() => {
		if (current == null || baseline == null || !Number.isFinite(current) || !Number.isFinite(baseline)) return null;
		if (baseline === 0) return null;
		return ((current - baseline) / Math.abs(baseline)) * 100;
	});

	// Sotto l'1% è rumore: mostrarlo come "variazione" sarebbe fuorviante.
	const direction = $derived(change == null ? null : change > 1 ? 'up' : change < -1 ? 'down' : 'flat');

	const tone = $derived.by(() => {
		if (direction == null || direction === 'flat' || higherIsBetter === undefined) return 'var(--color-ink-3)';
		const good = direction === 'up' ? higherIsBetter : !higherIsBetter;
		return good ? 'var(--color-good)' : 'var(--color-warning)';
	});

	const nf = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 });
</script>

{#if direction}
	<span class="inline-flex items-center gap-1 text-xs" style="color: {tone}" title={label}>
		{#if direction !== 'flat'}
			<Icon name={direction === 'up' ? 'arrowUp' : 'arrowDown'} size={12} />
		{/if}
		<span class="tabular">
			{direction === 'flat' ? 'stabile' : `${nf.format(Math.abs(change ?? 0))}%`}
		</span>
	</span>
{/if}
