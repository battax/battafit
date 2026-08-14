<script lang="ts">
	import { page } from '$app/state';
	import { RANGES } from '$lib/range';

	/**
	 * Selettore di periodo. L'intervallo vive nell'URL, non in uno stato del
	 * componente: così una vista interessante si può salvare fra i preferiti o
	 * mandare per link, e il tasto indietro del browser fa quello che ci si
	 * aspetta.
	 */

	interface Props {
		active: string;
	}

	let { active }: Props = $props();

	function hrefFor(key: string): string {
		const url = new URL(page.url);
		url.searchParams.set('periodo', key);
		return url.pathname + url.search;
	}
</script>

<!--
	Un solo blocco con i separatori interni, non cinque pastiglie staccate: le
	scelte sono una scala ordinata dal più stretto al più largo, e tenerle
	attaccate è quello che la fa leggere come una scala.
-->
<nav
	aria-label="Periodo"
	class="flex items-center divide-x divide-line overflow-hidden rounded-[3px] border border-line"
>
	{#each RANGES as range (range.key)}
		{@const isActive = range.key === active}
		<a
			href={hrefFor(range.key)}
			aria-current={isActive ? 'page' : undefined}
			data-sveltekit-noscroll
			class="relative px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors duration-150
				{isActive ? 'bg-motion/12 text-ink' : 'text-ink-3 hover:bg-panel-2/50 hover:text-ink-2'}"
		>
			{#if isActive}
				<span class="absolute inset-x-0 bottom-0 h-[2px] bg-motion"></span>
			{/if}
			{range.label}
		</a>
	{/each}
</nav>
