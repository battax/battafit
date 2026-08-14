<script lang="ts">
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';
	import Field from '$lib/components/Field.svelte';
	import Segmented from '$lib/components/Segmented.svelte';
	import {
		MORNING,
		RUN_OUTCOME_LABEL,
		RUN_PAIN_LIMIT,
		SURFACES,
		SWELLING,
		formatDayShort,
		type RunOutcome
	} from '$lib/rehab';

	let { data } = $props();

	const nf1 = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 });

	const PAIN_OPTIONS = Array.from({ length: 11 }, (_, i) => ({ value: String(i), label: String(i) }));
	const SWELLING_OPTIONS = SWELLING.map((s) => ({ value: s.key, label: s.label }));
	const MORNING_OPTIONS = MORNING.map((m) => ({ value: m.key, label: m.label }));
	const SURFACE_OPTIONS = SURFACES.map((s) => ({ value: s, label: s }));

	/** Dopo un salvataggio resta aperta la seduta appena scritta, non la prima da fare. */
	const openId = $derived(Number(page.url.searchParams.get('aperta')) || data.openId);

	const maxTotal = $derived(Math.max(...data.runs.map((r) => r.walkMin + r.runMin)));

	const OUTCOME_STYLE: Record<RunOutcome, string> = {
		ok: 'text-good',
		ripeti: 'text-warning',
		'da-valutare': 'text-ink-3'
	};
</script>

<svelte:head><title>Corsa · Recupero · BattaFit</title></svelte:head>

<div class="space-y-gutter">
	<!--
		La progressione, per intero.
		Il cammino cala e la corsa sale: è una scala, e disegnarla come una scala
		dice in un colpo d'occhio quello che dodici righe di tabella direbbero in
		dodici letture. L'altezza totale è quasi costante, quindi l'informazione
		sta nella proporzione, non nella dimensione.
	-->
	<section class="panel panel-bleed px-4 py-5 md:px-8">
		<div class="mb-5 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1">
			<h2 class="text-sm font-medium text-ink">La progressione</h2>
			<p class="font-mono text-xs text-ink-3">{data.done} sedute su {data.runs.length}</p>
		</div>

		<!--
			I due gap da 1px dentro l'altezza tengono in piedi il conto: le due
			altezze sommano alla percentuale della colonna, e i 2px di superficie
			fra i segmenti li restituisce il `gap`, non un bordo colorato.
		-->
		<div class="flex h-32 items-end gap-1">
			{#each data.runs as run (run.id)}
				{@const isOpen = run.id === openId}
				<a
					href="?aperta={run.id}#seduta-{run.id}"
					class="flex h-full min-w-0 flex-1 flex-col justify-end gap-[2px] rounded-[3px] outline-offset-2 {isOpen
						? 'outline outline-line-strong'
						: ''}"
					aria-label="Seduta del {formatDayShort(run.plannedOn)}: {run.protocol}"
					title="{formatDayShort(run.plannedOn)} · {run.protocol}"
				>
					<span class="block rounded-t-[2px] bg-line" style="height: calc({(run.walkMin / maxTotal) * 100}% - 1px)"
					></span>
					<span
						class="block rounded-b-[2px] {run.actualRunMin != null ? 'bg-suit-blue' : 'bg-ramp-600'}"
						style="height: calc({(run.runMin / maxTotal) * 100}% - 1px)"
					></span>
				</a>
			{/each}
		</div>

		<!-- Sotto ogni colonna i minuti di corsa previsti: è il numero che sale, ed è il senso del grafico. -->
		<div class="mt-2 flex gap-1">
			{#each data.runs as run (run.id)}
				<p class="min-w-0 flex-1 text-center font-mono text-[10px] text-ink-3">{run.runMin}</p>
			{/each}
		</div>

		<ul class="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
			<li class="flex items-center gap-1.5 text-xs text-ink-2">
				<span class="size-2 rounded-[2px] bg-suit-blue"></span> Corsa fatta
			</li>
			<li class="flex items-center gap-1.5 text-xs text-ink-2">
				<span class="size-2 rounded-[2px] bg-ramp-600"></span> Corsa da fare
			</li>
			<li class="flex items-center gap-1.5 text-xs text-ink-2">
				<span class="size-2 rounded-[2px] bg-line"></span> Cammino
			</li>
			<li class="text-xs text-ink-3">Numero sotto la colonna: minuti di corsa previsti</li>
		</ul>
	</section>

	<section class="panel p-5">
		<h2 class="mb-2 text-sm font-medium text-ink">Quando si sale di livello</h2>
		<p class="text-sm text-ink-2">
			Una seduta è tollerata se il dolore resta entro {RUN_PAIN_LIMIT} durante e il mattino dopo, la sera non c'è
			gonfiore e il ginocchio si sveglia uguale o meglio. Se manca anche una sola di queste, si ripete il livello
			invece di salire.
		</p>
		{#if data.lastOutcome}
			<p class="mt-3 text-sm">
				<span class="text-ink-3">Ultima seduta valutata:</span>
				<span class={OUTCOME_STYLE[data.lastOutcome]}>{RUN_OUTCOME_LABEL[data.lastOutcome]}</span>
			</p>
		{/if}
	</section>

	<!--
		Le dodici sedute sono un elenco, non dodici schede.
		Sono la stessa cosa ripetuta con un numero diverso: dodici riquadri
		identici uno sotto l'altro sarebbero la griglia di schede che questa
		dashboard evita ovunque. Si apre quella che tocca, le altre restano righe.
	-->
	<section class="panel divide-y divide-line">
		{#each data.runs as run (run.id)}
			{@const isOpen = run.id === openId}
			<div id="seduta-{run.id}">
				<details open={isOpen}>
					<summary
						class="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5 transition-colors duration-150 hover:bg-panel-2/60"
					>
						<span class="w-14 shrink-0 font-mono text-xs text-ink-3">{formatDayShort(run.plannedOn)}</span>
						<span class="min-w-0 flex-1 text-sm text-ink">{run.protocol}</span>
						{#if run.actualRunMin != null}
							<span class="font-mono text-xs text-ink-2">{nf1.format(run.actualRunMin)} min</span>
							<span class="w-36 shrink-0 text-right font-mono text-xs whitespace-nowrap {OUTCOME_STYLE[run.outcome]}">
								{RUN_OUTCOME_LABEL[run.outcome]}
							</span>
						{:else}
							<!-- Senza risposta non c'è esito da mostrare: ripetere "da valutare" dodici volte è rumore. -->
							<span class="w-36 shrink-0 text-right font-mono text-xs whitespace-nowrap text-ink-3">
								{run.runMin} min previsti
							</span>
						{/if}
					</summary>

					<form method="POST" class="space-y-5 border-t border-line px-5 py-5">
						<input type="hidden" name="id" value={run.id} />

						<div class="grid gap-4 sm:grid-cols-3">
							<Field
								name="doneOn"
								label="Fatta il"
								type="date"
								value={run.doneOn ?? run.plannedOn}
								hint="Prevista il {formatDayShort(run.plannedOn)}"
							/>
							<Field
								name="actualRunMin"
								label="Corsa effettiva"
								unit="min"
								value={run.actualRunMin}
								sensed={data.sensed[run.doneOn ?? run.plannedOn] != null
									? `${data.sensed[run.doneOn ?? run.plannedOn]} min`
									: null}
								hint="Previsti {run.runMin} min"
							/>
							<Field name="avgSpeedKmh" label="Velocità media" unit="km/h" value={run.avgSpeedKmh} />
						</div>

						<!-- La superficie sta su una riga sua: tre etichette lunghe schiacciate in un quarto di griglia andavano a capo una sull'altra. -->
						<Segmented
							name="surface"
							legend="Superficie"
							options={SURFACE_OPTIONS}
							value={run.surface ?? null}
							clearable
						/>

						<div class="space-y-5 border-t border-line pt-5">
							<p class="text-xs text-ink-3">
								La risposta a 24 ore è quella che decide: senza il mattino dopo, la seduta resta da valutare.
							</p>

							<Segmented
								name="painDuring"
								legend="Dolore durante"
								options={PAIN_OPTIONS}
								value={run.painDuring != null ? String(run.painDuring) : null}
								compact
							/>
							<div class="grid gap-5 sm:grid-cols-2">
								<Segmented
									name="swellingEvening"
									legend="Gonfiore la sera"
									options={SWELLING_OPTIONS}
									value={run.swellingEvening ?? null}
								/>
								<Segmented
									name="morningAfter"
									legend="Mattino successivo"
									options={MORNING_OPTIONS}
									value={run.morningAfter ?? null}
								/>
							</div>
							<Segmented
								name="painMorning"
								legend="Dolore il mattino dopo"
								options={PAIN_OPTIONS}
								value={run.painMorning != null ? String(run.painMorning) : null}
								compact
							/>
						</div>

						<div>
							<label for="note-{run.id}" class="label mb-2 block">Note</label>
							<textarea
								id="note-{run.id}"
								name="note"
								rows="2"
								class="w-full rounded-[3px] border border-line bg-panel-2 px-3 py-2.5 text-sm text-ink placeholder:text-ink-3 focus:border-line-strong focus:outline-none"
							>{run.note ?? ''}</textarea>
						</div>

						<button
							type="submit"
							class="rounded-[3px] bg-suit-red px-4 py-2.5 text-sm font-medium text-ink transition-opacity duration-150 hover:opacity-90"
						>
							Salva la seduta
						</button>
					</form>
				</details>
			</div>
		{/each}
	</section>

	<p class="flex items-start gap-2 text-xs text-ink-3">
		<span class="mt-px shrink-0"><Icon name="warning" size={13} /></span>
		Niente cambi di direzione e niente balzi: la progressione resta lineare fino a valutazione funzionale.
	</p>
</div>
