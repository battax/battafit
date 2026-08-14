<script lang="ts">
	import HudPanel, { type Channel } from './HudPanel.svelte';
	import type { Clause } from '$lib/insight';

	/**
	 * Il pannello che dice a parole quello che i grafici accanto dicono in forma.
	 *
	 * Non si chiama "Insight AI" come nei mockup, e la differenza non è di
	 * etichetta: dietro non c'è nessun modello, ci sono delle divisioni. Un nome
	 * che promette un'intelligenza farebbe leggere queste frasi con una fiducia
	 * che non si sono guadagnate — e su una dashboard sanitaria è esattamente il
	 * genere di fiducia che non va chiesto in prestito.
	 */

	const TONE: Record<Clause['tone'], string> = {
		good: 'text-done',
		attention: 'text-load',
		neutral: 'text-ink-3'
	};

	interface Props {
		clauses: Clause[];
		title?: string;
		channel?: Channel;
		/** Contesto della lettura, es. "ultimi 30 giorni". */
		meta?: string;
		class?: string;
	}

	let { clauses, title = 'Insight', channel = 'bio', meta, class: className = '' }: Props = $props();
</script>

<HudPanel {channel} class="p-5 {className}">
	<div class="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
		<h2 class="label">{title}</h2>
		{#if meta}<p class="font-mono text-xs text-ink-3">{meta}</p>{/if}
	</div>

	{#if clauses.length}
		<ul class="space-y-3">
			{#each clauses as clause (clause.text)}
				<li class="flex items-baseline gap-2.5 text-sm text-ink-2">
					<span class="mt-1.5 size-1.5 shrink-0 rounded-full bg-current {TONE[clause.tone]}"></span>
					<span class="min-w-0">{clause.text}</span>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="text-sm text-ink-3">Serve almeno una giornata con dei dati perché ci sia qualcosa da dire.</p>
	{/if}
</HudPanel>
