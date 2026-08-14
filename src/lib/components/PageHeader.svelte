<script lang="ts">
	import PulseSpine from './PulseSpine.svelte';
	import SyncStatus from './SyncStatus.svelte';
	import type { Snippet } from 'svelte';

	/**
	 * Testata di pagina: la targhetta incisa in cima allo strumento.
	 *
	 * Il titolo porta due tacche a sinistra — le stesse due che tagliano gli
	 * angoli dei pannelli, ruotate — e sotto, al posto del filetto divisorio,
	 * corre la frequenza a riposo degli ultimi trenta giorni. È il telaio, non
	 * il contenuto: identico su tutte le pagine, perché quello che cambia da
	 * una sezione all'altra deve stare sotto, non qui.
	 */

	interface Props {
		title: string;
		/** Data o contesto, sotto il titolo. */
		meta?: string;
		/** Controlli della pagina, es. il selettore di periodo. */
		actions?: Snippet;
		spine?: { day: string; value: number | null }[];
	}

	let { title, meta, actions, spine = [] }: Props = $props();
</script>

<header class="mb-4">
	<div class="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
		<div class="min-w-0">
			<div class="flex items-center gap-3">
				<!-- Le tacche: due segmenti sfalsati, la stessa diagonale dei pannelli. -->
				<span class="flex shrink-0 flex-col gap-1" aria-hidden="true">
					<span class="block h-[3px] w-5 bg-motion"></span>
					<span class="block h-[3px] w-3 bg-line-strong"></span>
				</span>
				<h1 class="display truncate text-[1.375rem] text-ink sm:text-[1.625rem]">{title}</h1>
			</div>

			{#if meta}
				<p class="mt-1.5 text-sm text-ink-2 first-letter:uppercase">{meta}</p>
			{/if}
		</div>

		<div class="flex flex-wrap items-center gap-x-5 gap-y-2">
			<SyncStatus />
			{#if actions}
				{@render actions()}
			{/if}
		</div>
	</div>

	<PulseSpine points={spine} />
</header>
