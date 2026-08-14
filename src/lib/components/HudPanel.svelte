<script lang="ts" module>
	/**
	 * Il canale di un pannello: che tipo di dato contiene.
	 *
	 * Non è una scelta estetica. Il canale decide il colore della diagonale
	 * tagliata, che è l'unico accento del pannello, e per questo va assegnato
	 * guardando il dato e non la pagina: due pannelli vicini possono benissimo
	 * avere canali diversi, ed è proprio quello che li rende leggibili di
	 * sfuggita.
	 */
	export type Channel = 'motion' | 'bio' | 'load' | 'done' | 'neutral';

	const CHANNEL_CLASS: Record<Channel, string> = {
		motion: 'hud-motion',
		bio: 'hud-bio',
		load: 'hud-load',
		done: 'hud-done',
		neutral: ''
	};
</script>

<script lang="ts">
	import { twMerge } from 'tailwind-merge';
	import type { Snippet } from 'svelte';

	/**
	 * Il contenitore di tutta l'interfaccia.
	 *
	 * Fondo, bordo, taglio d'angolo e trama stanno in `.hud` dentro `app.css`:
	 * qui c'è solo la scelta del canale e la forma dell'elemento. Un pannello
	 * con `href` diventa un collegamento intero — un riquadro cliccabile con
	 * dentro un link separato dà due bersagli per la stessa azione.
	 */

	interface Props {
		channel?: Channel;
		/** Esce dai margini della colonna e arriva ai bordi. Uno solo per pagina. */
		bleed?: boolean;
		href?: string;
		/** Etichetta accessibile, quando il contenuto da solo non basta. */
		label?: string;
		class?: string;
		children: Snippet;
	}

	let { channel = 'neutral', bleed = false, href, label, class: className = '', children }: Props = $props();

	const classes = $derived(
		twMerge(
			'panel',
			CHANNEL_CLASS[channel],
			bleed && 'panel-bleed',
			href && 'group block transition-colors duration-200 hover:bg-panel-2/40',
			className
		)
	);
</script>

{#if href}
	<a {href} class={classes} aria-label={label}>{@render children()}</a>
{:else}
	<section class={classes} aria-label={label}>{@render children()}</section>
{/if}
