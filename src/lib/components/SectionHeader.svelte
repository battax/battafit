<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon, { type IconName } from './Icon.svelte';
	import type { Channel } from './HudPanel.svelte';

	/**
	 * L'intestazione dentro un pannello.
	 *
	 * Il pallino a sinistra del titolo porta il colore del canale ed è l'unico
	 * punto in cui il canale si ripete dentro il pannello: serve perché su
	 * schermo stretto la diagonale tagliata finisce fuori dal campo visivo
	 * mentre si legge il titolo.
	 *
	 * `meta` è il contesto della lettura — il periodo, l'unità, quante notti —
	 * e sta a destra perché è la seconda cosa che si legge, non la prima.
	 */

	const DOT: Record<Channel, string> = {
		motion: 'bg-motion',
		bio: 'bg-bio',
		load: 'bg-load',
		done: 'bg-done',
		neutral: 'bg-ink-3'
	};

	interface Props {
		title: string;
		channel?: Channel;
		meta?: string;
		icon?: IconName;
		/** Livello del titolo: dentro una pagina è quasi sempre un h2. */
		level?: 2 | 3;
		actions?: Snippet;
		class?: string;
	}

	let { title, channel = 'neutral', meta, icon, level = 2, actions, class: className = '' }: Props = $props();
</script>

<div class="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1 {className}">
	<svelte:element this={level === 2 ? 'h2' : 'h3'} class="flex items-center gap-2.5 text-sm font-medium text-ink">
		{#if icon}
			<span class="text-ink-3"><Icon name={icon} size={15} /></span>
		{:else}
			<span class="size-1.5 shrink-0 rounded-full {DOT[channel]}"></span>
		{/if}
		{title}
	</svelte:element>

	{#if meta}
		<p class="font-mono text-xs text-ink-3">{meta}</p>
	{/if}
	{#if actions}
		{@render actions()}
	{/if}
</div>
