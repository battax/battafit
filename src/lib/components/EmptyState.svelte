<script lang="ts">
	import Icon, { type IconName } from './Icon.svelte';
	import HudPanel from './HudPanel.svelte';

	/**
	 * Uno schermo vuoto è un invito ad agire, non un dispiacere.
	 *
	 * Il titolo dice cosa manca, la descrizione dice come rimediare, e le
	 * parentesi angolari attorno all'icona sono lo stesso segno del pannello:
	 * un posto apparecchiato e ancora libero, non un errore.
	 */

	interface Props {
		icon?: IconName;
		title: string;
		description?: string;
		children?: import('svelte').Snippet;
	}

	let { icon = 'empty', title, description, children }: Props = $props();
</script>

<HudPanel class="flex flex-col items-center gap-4 px-6 py-12 text-center">
	<span class="relative flex size-14 items-center justify-center text-ink-3">
		<!-- Le due squadre: stesso segno del taglio d'angolo, in piccolo. -->
		<span class="absolute inset-0 border-t border-l border-line-strong" style="clip-path: polygon(0 0, 40% 0, 0 40%)"
		></span>
		<span
			class="absolute inset-0 border-r border-b border-line-strong"
			style="clip-path: polygon(100% 60%, 100% 100%, 60% 100%)"
		></span>
		<Icon name={icon} size={22} />
	</span>

	<div>
		<p class="font-medium text-ink">{title}</p>
		{#if description}
			<p class="mx-auto mt-1.5 max-w-md text-sm text-balance text-ink-2">{description}</p>
		{/if}
	</div>

	{@render children?.()}
</HudPanel>
