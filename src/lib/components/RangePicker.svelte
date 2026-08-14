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

<nav aria-label="Periodo" class="flex flex-wrap items-center gap-1">
	{#each RANGES as range (range.key)}
		{@const isActive = range.key === active}
		<a
			href={hrefFor(range.key)}
			aria-current={isActive ? 'page' : undefined}
			data-sveltekit-noscroll
			class="rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors duration-150
				{isActive ? 'bg-panel-2 text-ink' : 'text-ink-3 hover:bg-panel hover:text-ink-2'}"
		>
			{range.label}
		</a>
	{/each}
</nav>
