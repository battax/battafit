<script lang="ts">
	/**
	 * Scelta fra poche opzioni, resa come una fila di segmenti.
	 *
	 * Sono radio veri dentro un fieldset, non bottoni: si raggiungono con le
	 * frecce, si annunciano come un gruppo unico e funzionano anche se il
	 * JavaScript non parte, cosa che per un registro compilato ogni sera dal
	 * telefono conta più dell'effetto.
	 *
	 * Il registro si compila con una mano sola, in piedi, spesso di sera: le
	 * opzioni sono grandi abbastanza da centrarle col pollice invece di essere
	 * un campo numerico da digitare.
	 */

	interface Option {
		value: string;
		label: string;
	}

	interface Props {
		name: string;
		legend: string;
		options: Option[];
		value?: string | null;
		/** Aggiunge un segmento "—" per togliere il valore. */
		clearable?: boolean;
		/** Colonne fisse; per default i segmenti si dispongono da soli. */
		compact?: boolean;
		hint?: string;
	}

	let { name, legend, options, value = null, clearable = false, compact = false, hint }: Props = $props();

	/**
	 * Il prefisso degli `id` è unico per istanza.
	 *
	 * Nella pagina della corsa lo stesso gruppo compare dodici volte, una per
	 * seduta: con l'`id` costruito sul nome del campo, ogni etichetta puntava al
	 * primo radio della pagina e toccare "3" nella nona seduta avrebbe scritto
	 * sulla prima.
	 */
	const uid = $props.id();

	const all = $derived(clearable ? [{ value: '', label: '—' }, ...options] : options);
	const current = $derived(value ?? '');

	/**
	 * Undici opzioni su un telefono non stanno in fila: la scala del dolore va a
	 * griglia, tutto il resto si dispone da solo. Le due modalità sono
	 * alternative, non sovrapposte, perché `flex` e `grid` sono la stessa
	 * proprietà e insieme dipenderebbero dall'ordine del foglio di stile.
	 */
	const layout = $derived(compact ? 'grid grid-cols-6 gap-1 sm:grid-cols-11' : 'flex flex-wrap gap-1');
</script>

<fieldset class="min-w-0">
	<legend class="label mb-2">{legend}</legend>

	<div class={layout}>
		{#each all as option (option.value)}
			{@const id = `${uid}-${option.value || 'vuoto'}`}
			<div class="min-w-0 flex-1">
				<input
					type="radio"
					{id}
					{name}
					value={option.value}
					checked={current === option.value}
					class="peer sr-only"
				/>
				<!--
					Il segmento "vuoto" selezionato resta grigio.
					Con l'accento anche lui, un form appena aperto mostrerebbe tre o
					quattro caselle rosse accese senza che sia stato scelto niente: il
					colore direbbe "guarda qui" proprio dove non c'è nulla da guardare.
				-->
				<label
					for={id}
					class="flex min-h-9 cursor-pointer items-center justify-center rounded-[3px] border border-line bg-panel-2 px-2.5 text-sm text-ink-2
						transition-colors duration-150 select-none hover:border-line-strong hover:text-ink
						peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-bio-bright
						{option.value === ''
						? 'peer-checked:border-line-strong peer-checked:bg-panel-2 peer-checked:text-ink-2'
						: 'peer-checked:border-motion peer-checked:bg-motion/15 peer-checked:text-ink'}"
				>
					{option.label}
				</label>
			</div>
		{/each}
	</div>

	{#if hint}
		<p class="mt-1.5 text-xs text-ink-3">{hint}</p>
	{/if}
</fieldset>
