<script lang="ts">
	/**
	 * Un campo del registro: etichetta, valore, unità.
	 *
	 * `sensed` è il motivo per cui questo componente esiste invece di un
	 * `<input>` nudo. L'orologio conosce già peso, passi, sonno e minuti di
	 * corsa: dove il dato c'è, il campo lo mostra come suggerimento sotto e non
	 * lo richiede una seconda volta. Il foglio di calcolo chiedeva diciotto
	 * numeri al giorno; qui restano quelli che nessun sensore può sapere.
	 */

	interface Props {
		name: string;
		label: string;
		value?: number | string | null;
		unit?: string;
		type?: 'number' | 'text' | 'date';
		step?: string;
		min?: string;
		max?: string;
		placeholder?: string;
		/**
		 * Il valore che Salute ha già per quel giorno — dall'orologio o dall'app
		 * con cui si registrano i pasti, non fa differenza per chi compila.
		 */
		sensed?: string | null;
		hint?: string;
		/** Bersaglio da rispettare, mostrato accanto all'unità. */
		target?: string;
		/**
		 * Nasconde l'etichetta lasciandola agli screen reader. Serve nelle righe
		 * ripetute — i tre recapiti — dove "Nome" scritto tre volte di fila è
		 * rumore per chi vede e resta indispensabile per chi non vede.
		 */
		labelHidden?: boolean;
	}

	let {
		name,
		label,
		value = null,
		unit,
		type = 'number',
		step = 'any',
		min,
		max,
		placeholder,
		sensed = null,
		hint,
		target,
		labelHidden = false
	}: Props = $props();

	/** Lo stesso campo compare più volte per pagina (una per seduta di corsa): l'`id` non può derivare dal nome. */
	const uid = $props.id();

	/** `step` ha senso solo sui campi numerici; su un testo sarebbe attributo non valido. */
	const numeric = $derived(type === 'number');
</script>

<div class="min-w-0">
	<label for={uid} class={labelHidden ? 'sr-only' : 'label mb-2 block'}>{label}</label>

	<div class="flex items-center gap-2 rounded-[3px] border border-line bg-panel-2 px-3 focus-within:border-line-strong">
		<input
			{name}
			id={uid}
			{type}
			step={numeric ? step : undefined}
			{min}
			{max}
			{placeholder}
			value={value ?? ''}
			inputmode={numeric ? 'decimal' : undefined}
			class="min-h-10 w-full min-w-0 bg-transparent font-mono text-sm text-ink placeholder:text-ink-3 focus:outline-none"
		/>
		{#if unit}
			<span class="shrink-0 font-mono text-xs text-ink-3">{unit}</span>
		{/if}
	</div>

	{#if sensed}
		<p class="mt-1.5 text-xs text-ink-3">Da Salute: <span class="font-mono text-ink-2">{sensed}</span></p>
	{:else if target}
		<p class="mt-1.5 text-xs text-ink-3">Obiettivo <span class="font-mono text-ink-2">{target}</span></p>
	{:else if hint}
		<p class="mt-1.5 text-xs text-ink-3">{hint}</p>
	{/if}
</div>
