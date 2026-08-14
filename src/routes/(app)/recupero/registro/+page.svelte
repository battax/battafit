<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import Field from '$lib/components/Field.svelte';
	import Segmented from '$lib/components/Segmented.svelte';
	import { SWELLING, SWELLING_BY_KEY, UPPER_BODY, addDays, formatDayLong, formatDayShort } from '$lib/rehab';
	import { formatDuration } from '$lib/metrics';

	let { data } = $props();

	const nf0 = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 });
	const nf1 = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 });

	const entry = $derived(data.entry);
	const isToday = $derived(data.day === data.today);

	const PAIN_OPTIONS = Array.from({ length: 11 }, (_, i) => ({ value: String(i), label: String(i) }));
	const SWELLING_OPTIONS = SWELLING.map((s) => ({ value: s.key, label: s.label }));
	const UPPER_OPTIONS = UPPER_BODY.map((k) => ({ value: k, label: k }));

	function href(day: string): string {
		return `/recupero/registro?giorno=${day}`;
	}
</script>

<svelte:head><title>Registro · Recupero · BattaFit</title></svelte:head>

<div class="space-y-gutter">
	<!-- Spostarsi di un giorno è l'azione più frequente: due frecce, non un calendario da aprire. -->
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div class="flex items-center gap-1">
			<a
				href={href(addDays(data.day, -1))}
				class="flex size-9 items-center justify-center rounded-[3px] border border-line text-ink-3 transition-colors hover:border-line-strong hover:text-ink"
				aria-label="Giorno precedente"
			>
				<Icon name="chevronLeft" size={16} />
			</a>
			<a
				href={href(addDays(data.day, 1))}
				class="flex size-9 items-center justify-center rounded-[3px] border border-line text-ink-3 transition-colors hover:border-line-strong hover:text-ink"
				aria-label="Giorno successivo"
			>
				<Icon name="chevronRight" size={16} />
			</a>
			<p class="ml-2 text-sm text-ink first-letter:uppercase">
				{formatDayLong(data.day)}
				{#if isToday}<span class="ml-1.5 text-ink-3">· oggi</span>{/if}
			</p>
		</div>

		<div class="flex items-center gap-3">
			{#if !isToday}
				<a href={href(data.today)} class="text-sm text-ink-3 transition-colors hover:text-ink-2">Torna a oggi</a>
			{/if}
			<p class="font-mono text-xs text-ink-3">settimana {data.week}</p>
		</div>
	</div>

	{#if data.saved}
		<p class="flex items-center gap-2 text-sm text-good">
			<Icon name="check" size={15} />
			Giornata salvata.
		</p>
	{/if}

	<form method="POST" class="space-y-gutter">
		<input type="hidden" name="day" value={data.day} />

		<!--
			Il ginocchio per primo, e da solo. È l'unica coppia di valori che può
			far cambiare il programma della settimana: metterla in fondo, dopo i
			macronutrienti, direbbe che conta meno.
		-->
		<section class="panel hud-load p-5">
			<h2 class="mb-4 text-sm font-medium text-ink">Il ginocchio</h2>
			<div class="space-y-5">
				<Segmented
					name="pain"
					legend="Dolore, da 0 a 10"
					options={PAIN_OPTIONS}
					value={entry?.pain != null ? String(entry.pain) : null}
					compact
					hint="Da 3 in su il protocollo chiede di rivedere il carico prima di salire."
				/>
				<Segmented
					name="swelling"
					legend="Gonfiore la sera"
					options={SWELLING_OPTIONS}
					value={entry?.swelling ?? null}
				/>
			</div>
		</section>

		<section class="panel hud-load p-5">
			<h2 class="mb-4 text-sm font-medium text-ink">Le sedute</h2>
			<div class="grid gap-5 sm:grid-cols-2">
				<Segmented
					name="fkt"
					legend="Fisioterapia"
					options={[
						{ value: 'si', label: 'Fatta' },
						{ value: 'no', label: 'No' }
					]}
					value={entry?.fkt ? 'si' : 'no'}
				/>
				<Segmented
					name="upperBody"
					legend="Parte alta"
					options={UPPER_OPTIONS}
					value={entry?.upperBody ?? null}
					clearable
				/>
			</div>
			<p class="mt-4 text-xs text-ink-3">
				Gli esercizi e i carichi della seduta si scrivono in
				<a href="/recupero/carichi" class="underline underline-offset-2 transition-colors hover:text-ink-2">Carichi</a>.
			</p>
		</section>

		<!--
			Quando il diario alimentare ha già sincronizzato, questi campi non si
			compilano: si leggono. Restano comunque scrivibili, perché la
			sincronizzazione arriva al prossimo import mentre il registro si compila
			la sera stessa — e perché il diario non si tiene tutti i giorni.
		-->
		<section class="panel hud-load p-5">
			<h2 class="mb-1 text-sm font-medium text-ink">Alimentazione</h2>
			<p class="mb-4 text-xs text-ink-3">
				{#if data.sensed.proteinG != null || data.sensed.calories != null}
					Il diario alimentare ha già sincronizzato questa giornata: quello che scrivi qui vale finché non arriva
					l'import successivo, poi vince il diario.
				{:else}
					Se il diario alimentare non ha ancora sincronizzato, scrivi qui i valori che ti servono per la settimana.
				{/if}
			</p>

			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<Field
					name="proteinG"
					label="Proteine"
					unit="g"
					value={entry?.proteinG}
					sensed={data.sensed.proteinG != null ? `${nf0.format(data.sensed.proteinG)} g` : null}
					target="{nf0.format(data.config.proteinMinG)}–{nf0.format(data.config.proteinHighG)} g"
				/>
				<Field
					name="calories"
					label="Calorie"
					unit="kcal"
					value={entry?.calories}
					sensed={data.sensed.calories != null ? `${nf0.format(data.sensed.calories)} kcal` : null}
					target="{nf0.format(data.config.caloriesTarget)} kcal"
				/>
				<Field
					name="waterL"
					label="Acqua"
					unit="L"
					value={entry?.waterL}
					sensed={data.sensed.waterL != null ? `${nf1.format(data.sensed.waterL)} L` : null}
					target="{nf1.format(data.config.waterTargetL)} L"
				/>
				<Field
					name="carbsG"
					label="Carboidrati"
					unit="g"
					value={entry?.carbsG}
					sensed={data.sensed.carbsG != null ? `${nf0.format(data.sensed.carbsG)} g` : null}
				/>
				<Field
					name="fatG"
					label="Grassi"
					unit="g"
					value={entry?.fatG}
					sensed={data.sensed.fatG != null ? `${nf0.format(data.sensed.fatG)} g` : null}
				/>
			</div>
		</section>

		<section class="panel hud-load p-5">
			<h2 class="mb-1 text-sm font-medium text-ink">Misure</h2>
			<p class="mb-4 text-xs text-ink-3">
				Passi, sonno e minuti di corsa non si chiedono: arrivano dall'orologio e si vedono qui sotto.
			</p>

			<div class="grid gap-4 sm:grid-cols-2">
				<Field
					name="weightKg"
					label="Peso"
					unit="kg"
					value={entry?.weightKg}
					sensed={data.sensed.weight != null ? `${nf1.format(data.sensed.weight)} kg` : null}
					hint="Salute non ha il peso di oggi: scrivilo qui."
				/>
				<Field name="waistCm" label="Girovita" unit="cm" value={entry?.waistCm} hint="Salute non registra il girovita." />
			</div>

			<dl class="mt-5 grid grid-cols-3 gap-4 border-t border-line pt-4">
				<div>
					<dt class="label">Passi</dt>
					<dd class="mt-1.5 font-mono text-sm {data.sensed.steps == null ? 'text-ink-3' : 'text-ink'}">
						{data.sensed.steps == null ? '—' : nf0.format(data.sensed.steps)}
					</dd>
				</div>
				<div>
					<dt class="label">Sonno</dt>
					<dd class="mt-1.5 font-mono text-sm {data.sensed.sleep == null ? 'text-ink-3' : 'text-ink'}">
						{data.sensed.sleep == null ? '—' : formatDuration(data.sensed.sleep * 3600)}
					</dd>
				</div>
				<div>
					<dt class="label">Corsa</dt>
					<dd class="mt-1.5 font-mono text-sm {data.sensed.runMinutes == null ? 'text-ink-3' : 'text-ink'}">
						{data.sensed.runMinutes == null ? '—' : `${nf0.format(data.sensed.runMinutes)} min`}
					</dd>
				</div>
			</dl>
		</section>

		<section class="panel hud-load p-5">
			<label for="note" class="label mb-2 block">Note</label>
			<textarea
				id="note"
				name="note"
				rows="3"
				placeholder="Come è andata, cosa ha dato fastidio, cosa ha funzionato"
				class="w-full rounded-[3px] border border-line bg-panel-2 px-3 py-2.5 text-sm text-ink placeholder:text-ink-3 focus:border-line-strong focus:outline-none"
			>{entry?.note ?? ''}</textarea>
		</section>

		<div class="flex items-center gap-4">
			<button
				type="submit"
				class="rounded-[3px] bg-motion px-4 py-2.5 text-sm font-medium text-ink transition-opacity duration-150 hover:opacity-90"
			>
				Salva la giornata
			</button>
			{#if entry}
				<p class="text-xs text-ink-3">Già registrata; salvando la sovrascrivi.</p>
			{/if}
		</div>
	</form>

	<!-- La cronologia elenca solo i giorni compilati: 91 righe vuote non sono uno storico. -->
	<section class="panel hud-load panel-bleed px-4 py-5 md:px-8">
		<h2 class="mb-4 text-sm font-medium text-ink">Giorni registrati</h2>

		{#if !data.history.length}
			<p class="text-sm text-ink-3">Ancora nessuna giornata nel registro.</p>
		{:else}
			<!-- `relative` per la stessa ragione della tabella in Misure: un `sr-only` dentro una tabella che scorre sfonda il viewport. -->
			<div class="relative overflow-x-auto">
				<table class="w-full min-w-[520px] text-sm">
					<thead>
						<tr class="border-b border-line text-left">
							<th scope="col" class="label pb-2 font-normal">Giorno</th>
							<th scope="col" class="label pb-2 text-right font-normal">Dolore</th>
							<th scope="col" class="label pb-2 text-right font-normal">Gonfiore</th>
							<th scope="col" class="label pb-2 text-right font-normal">FKT</th>
							<th scope="col" class="label pb-2 text-right font-normal">Alta</th>
							<th scope="col" class="label pb-2 text-right font-normal">Proteine</th>
							<th scope="col" class="label pb-2 text-right font-normal">Peso</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-line">
						{#each data.history as row (row.day)}
							{@const swelling = row.swelling ? SWELLING_BY_KEY.get(row.swelling) : null}
							{@const protein = row.proteinG.value}
							{@const weight = row.weightKg.value}
							<tr class="transition-colors duration-150 hover:bg-panel-2/60">
								<th scope="row" class="py-2.5 text-left font-normal">
									<a href={href(row.day)} class="font-mono text-xs text-ink-2 transition-colors hover:text-ink">
										{formatDayShort(row.day)}
									</a>
								</th>
								<td class="py-2.5 text-right font-mono {row.pain != null && row.pain >= 3 ? 'text-load' : 'text-ink'}">
									{row.pain ?? '—'}
								</td>
								<td class="py-2.5 text-right {swelling && swelling.severity > 0 ? 'text-load' : 'text-ink-3'}">
									{swelling?.label ?? '—'}
								</td>
								<td class="py-2.5 text-right">
									{#if row.fkt}
										<span class="inline-flex text-good"><Icon name="check" size={14} title="Fatta" /></span>
									{:else}
										<span class="text-ink-3">—</span>
									{/if}
								</td>
								<td class="py-2.5 text-right font-mono {row.upperBody ? 'text-ink' : 'text-ink-3'}">
									{row.upperBody ?? '—'}
								</td>
								<td
									class="py-2.5 text-right font-mono {protein != null && protein >= data.config.proteinMinG
										? 'text-ink'
										: 'text-ink-3'}"
								>
									{protein == null ? '—' : nf0.format(protein)}
								</td>
								<td class="py-2.5 text-right font-mono {weight == null ? 'text-ink-3' : 'text-ink'}">
									{weight == null ? '—' : nf1.format(weight)}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
</div>
