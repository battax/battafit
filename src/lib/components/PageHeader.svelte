<script lang="ts">
	import PulseSpine from './PulseSpine.svelte';
	import type { Snippet } from 'svelte';

	/**
	 * Testata di pagina: titolo nel carattere display, un dato di contorno, e la
	 * spina dorsale al posto del divisore.
	 *
	 * È l'unico punto in cui il display compare insieme alla spina, ed è
	 * condiviso da tutte le pagine perché la testata deve essere identica
	 * ovunque: è il telaio, non il contenuto.
	 */

	interface Props {
		title: string;
		/** Data o contesto, a destra del titolo. */
		meta?: string;
		/** Controlli della pagina, es. il selettore di periodo. */
		actions?: Snippet;
		spine?: { day: string; value: number | null }[];
	}

	let { title, meta, actions, spine = [] }: Props = $props();
</script>

<header class="mb-4">
	<div class="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2">
		<h1 class="display text-[1.5rem] text-ink sm:text-[1.75rem]">{title}</h1>

		{#if meta}
			<p class="text-sm text-ink-2 first-letter:uppercase">{meta}</p>
		{/if}
		{#if actions}
			{@render actions()}
		{/if}
	</div>

	<PulseSpine points={spine} />
</header>
