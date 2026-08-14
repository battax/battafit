<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import Field from '$lib/components/Field.svelte';
	import Segmented from '$lib/components/Segmented.svelte';
	import { SESSION_KINDS, SIDES, SWELLING, SWELLING_BY_KEY, formatDayShort } from '$lib/rehab';

	let { data, form } = $props();

	const nf0 = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 });
	const nf1 = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 });

	const KIND_OPTIONS = SESSION_KINDS.map((k) => ({ value: k.key, label: k.label }));
	const SIDE_OPTIONS = SIDES.map((s) => ({ value: s.key, label: s.label }));
	const SWELLING_OPTIONS = SWELLING.map((s) => ({ value: s.key, label: s.label }));
	const PAIN_OPTIONS = Array.from({ length: 11 }, (_, i) => ({ value: String(i), label: String(i) }));

	// Le chiavi arrivano dal database come stringhe qualsiasi: le mappe si
	// dichiarano su `string`, altrimenti il tipo letterale rifiuterebbe la
	// lettura di una riga scritta prima di un rinomino.
	const KIND_LABEL = new Map<string, string>(SESSION_KINDS.map((k) => [k.key, k.label]));
	const SIDE_LABEL = new Map<string, string>(SIDES.map((s) => [s.key, s.label]));
</script>

<svelte:head><title>Carichi · Recupero · BattaFit</title></svelte:head>

<div class="space-y-gutter">
	<!--
		Lo scarto fra le due gambe comanda la pagina.
		Al controllo dei tre mesi l'ipotrofia del quadricipite destro è rimasta il
		problema aperto: il carico che regge un lato rispetto all'altro è l'unica
		misura che, a ogni seduta, dice se il divario si sta chiudendo.
	-->
	<section class="panel panel-bleed px-4 py-5 md:px-8">
		<div class="mb-4 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1">
			<h2 class="text-sm font-medium text-ink">Destro contro sinistro</h2>
			<p class="text-xs text-ink-3">Carico migliore per lato, il destro è quello operato</p>
		</div>

		{#if !data.asymmetry.length}
			<p class="text-sm text-ink-3">
				Serve almeno un esercizio registrato su tutti e due i lati perché il confronto abbia senso.
			</p>
		{:else}
			<ul class="space-y-4">
				{#each data.asymmetry as row (row.exercise)}
					{@const max = Math.max(row.right, row.left)}
					<li>
						<div class="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
							<p class="text-sm text-ink">{row.exercise}</p>
							<p class="font-mono text-xs {row.deficit >= 10 ? 'text-street' : 'text-ink-3'}">
								{row.deficit < 0.5 ? 'in pari' : `${nf0.format(row.deficit)}% di scarto`}
								{#if row.weaker}<span class="text-ink-3"> · più debole il {row.weaker}</span>{/if}
							</p>
						</div>

						<div class="space-y-1.5">
							{#each [{ side: 'Destro', value: row.right, tone: 'bg-suit-red' }, { side: 'Sinistro', value: row.left, tone: 'bg-suit-blue' }] as bar (bar.side)}
								<div class="flex items-center gap-3">
									<span class="w-16 shrink-0 text-xs text-ink-3">{bar.side}</span>
									<div class="h-3 min-w-0 flex-1 rounded-[2px] bg-panel-2">
										<div class="h-full rounded-[2px] {bar.tone}" style="width: {(bar.value / max) * 100}%"></div>
									</div>
									<span class="w-16 shrink-0 text-right font-mono text-xs text-ink">{nf1.format(bar.value)} kg</span>
								</div>
							{/each}
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	{#if data.best.length}
		<section class="panel p-5">
			<h2 class="mb-4 text-sm font-medium text-ink">Carichi migliori</h2>
			<!-- `relative` per la stessa ragione della tabella in Misure: un `sr-only` dentro una tabella che scorre sfonda il viewport. -->
			<div class="relative overflow-x-auto">
				<table class="w-full min-w-[420px] text-sm">
					<thead>
						<tr class="border-b border-line text-left">
							<th scope="col" class="label pb-2 font-normal">Esercizio</th>
							<th scope="col" class="label pb-2 font-normal">Lato</th>
							<th scope="col" class="label pb-2 text-right font-normal">Carico</th>
							<th scope="col" class="label pb-2 text-right font-normal">Rip.</th>
							<th scope="col" class="label pb-2 text-right font-normal">Quando</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-line">
						{#each data.best as row (`${row.exercise}-${row.side}`)}
							<tr>
								<th scope="row" class="py-2.5 text-left font-normal text-ink">{row.exercise}</th>
								<td class="py-2.5 text-ink-2">{row.side ? SIDE_LABEL.get(row.side) : '—'}</td>
								<td class="py-2.5 text-right font-mono text-ink">{nf1.format(row.loadKg)} kg</td>
								<td class="py-2.5 text-right font-mono text-ink-2">{row.reps ?? '—'}</td>
								<td class="py-2.5 text-right font-mono text-xs text-ink-3">{formatDayShort(row.day)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/if}

	<section class="panel p-5">
		<h2 class="mb-4 text-sm font-medium text-ink">Aggiungi una serie</h2>

		{#if form?.error}
			<p class="mb-4 flex items-center gap-2 text-sm text-critical">
				<Icon name="warning" size={15} />
				{form.error}
			</p>
		{/if}

		<form method="POST" action="?/add" class="space-y-5">
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<Field name="day" label="Giorno" type="date" value={data.today} />

				<div class="min-w-0">
					<label for="exercise" class="label mb-2 block">Esercizio</label>
					<div class="flex items-center rounded-[3px] border border-line bg-panel-2 px-3 focus-within:border-line-strong">
						<input
							id="exercise"
							name="exercise"
							list="esercizi"
							required
							placeholder="Leg extension"
							class="min-h-10 w-full min-w-0 bg-transparent text-sm text-ink placeholder:text-ink-3 focus:outline-none"
						/>
					</div>
					<datalist id="esercizi">
						{#each data.exercises as name (name)}<option value={name}></option>{/each}
					</datalist>
				</div>

				<Field name="loadKg" label="Carico" unit="kg" />
				<Field name="reps" label="Ripetizioni" step="1" min="1" />
				<Field name="sets" label="Serie" step="1" min="1" />
				<Field name="rir" label="Ripetizioni di riserva" step="1" min="0" max="10" />
			</div>

			<div class="grid gap-5 sm:grid-cols-2">
				<Segmented name="kind" legend="Tipo di seduta" options={KIND_OPTIONS} value="fkt" />
				<Segmented name="side" legend="Lato" options={SIDE_OPTIONS} value="entrambi" clearable />
			</div>

			<div class="space-y-5 border-t border-line pt-5">
				<Segmented name="painBefore" legend="Dolore prima" options={PAIN_OPTIONS} compact />
				<Segmented name="painAfter" legend="Dolore dopo" options={PAIN_OPTIONS} compact />
				<Segmented name="swellingNextDay" legend="Gonfiore il giorno dopo" options={SWELLING_OPTIONS} clearable />
			</div>

			<div>
				<label for="note" class="label mb-2 block">Note</label>
				<textarea
					id="note"
					name="note"
					rows="2"
					class="w-full rounded-[3px] border border-line bg-panel-2 px-3 py-2.5 text-sm text-ink placeholder:text-ink-3 focus:border-line-strong focus:outline-none"
				></textarea>
			</div>

			<button
				type="submit"
				class="flex items-center gap-2 rounded-[3px] bg-suit-red px-4 py-2.5 text-sm font-medium text-ink transition-opacity duration-150 hover:opacity-90"
			>
				<Icon name="plus" size={15} />
				Aggiungi
			</button>
		</form>
	</section>

	<section class="panel p-5">
		<h2 class="mb-4 text-sm font-medium text-ink">Registro</h2>

		{#if !data.rows.length}
			<p class="text-sm text-ink-3">Nessuna serie registrata.</p>
		{:else}
			<ul class="divide-y divide-line">
				{#each data.rows as row (row.id)}
					{@const swelling = row.swellingNextDay ? SWELLING_BY_KEY.get(row.swellingNextDay) : null}
					<li class="flex flex-wrap items-center gap-x-4 gap-y-1.5 py-3 first:pt-0">
						<span class="w-16 shrink-0 font-mono text-xs text-ink-3">{formatDayShort(row.day)}</span>

						<div class="min-w-0 flex-1">
							<p class="truncate text-sm text-ink">
								{row.exercise}
								{#if row.side && row.side !== 'entrambi'}
									<span class="text-ink-3">· {SIDE_LABEL.get(row.side)}</span>
								{/if}
							</p>
							<p class="mt-0.5 font-mono text-xs text-ink-3">
								{KIND_LABEL.get(row.kind) ?? row.kind}
								{#if row.sets && row.reps}· {row.sets}×{row.reps}{/if}
								{#if row.rir != null}· RIR {row.rir}{/if}
								{#if row.painAfter != null}· dolore dopo {row.painAfter}{/if}
								{#if swelling && swelling.severity > 0}· gonfiore {swelling.label.toLowerCase()}{/if}
							</p>
						</div>

						<span class="shrink-0 font-mono text-sm {row.loadKg == null ? 'text-ink-3' : 'text-ink'}">
							{row.loadKg == null ? '—' : `${nf1.format(row.loadKg)} kg`}
						</span>

						<form method="POST" action="?/delete" class="shrink-0">
							<input type="hidden" name="id" value={row.id} />
							<button
								type="submit"
								class="flex size-8 items-center justify-center rounded-[3px] text-ink-3 transition-colors duration-150 hover:bg-panel-2 hover:text-critical"
								aria-label="Elimina la serie del {formatDayShort(row.day)}, {row.exercise}"
							>
								<Icon name="trash" size={15} />
							</button>
						</form>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>
