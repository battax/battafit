<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import Field from '$lib/components/Field.svelte';
	import { MEASURE_PLAN, diffDays, formatDayShort } from '$lib/rehab';

	let { data, form } = $props();

	const nf1 = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 });

	const draft = $derived(data.draft);

	/** Quanto si è chiuso il divario fra la prima misura e l'ultima. */
	const closed = $derived(
		data.firstGap != null && data.lastGap != null ? Math.abs(data.firstGap) - Math.abs(data.lastGap) : null
	);

	function countdown(day: string): string {
		const n = diffDays(data.today, day);
		if (n === 0) return 'oggi';
		return n > 0 ? `fra ${n} giorni` : `${-n} giorni fa`;
	}
</script>

<svelte:head><title>Misure · Recupero · BattaFit</title></svelte:head>

<div class="space-y-gutter">
	<!--
		Il divario fra le cosce comanda la pagina.
		Al controllo dei tre mesi l'ipotrofia del quadricipite destro è rimasta
		l'unica cosa segnalata: fra tutte le misure del metro, questa è la sola che
		risponde alla domanda aperta. Le altre stanno in tabella.
	-->
	<section class="panel hud-load panel-bleed px-4 py-5 md:px-8">
		<div class="mb-4 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1">
			<h2 class="text-sm font-medium text-ink">Le due cosce a confronto</h2>
			<p class="text-xs text-ink-3">La destra è il lato operato; il divario è lo spazio fra le due punte</p>
		</div>

		{#if !data.pairs.length}
			<p class="text-sm text-ink-3">
				Nessuna coscia misurata. È la misura che il chirurgo ha lasciato aperta al controllo dei tre mesi: vale la pena
				prenderla per prima.
			</p>
		{:else}
			<!--
				Barre appaiate per data, non una linea della differenza.
				Con due o tre misurazioni una linea non è un andamento, e una scala
				che si adatta a mezzo centimetro farebbe sembrare risolta
				un'ipotrofia di quattro. Qui la lunghezza delle due barre è la
				misura vera, e il divario è lo spazio fra le due punte: si legge
				dalla prima misurazione, senza aspettarne quattro.
			-->
			<ul class="space-y-5">
				{#each data.pairs as pair (pair.day)}
					<li>
						<div class="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
							<p class="font-mono text-xs text-ink-2">{formatDayShort(pair.day)}</p>
							<p class="font-mono text-xs {Math.abs(pair.gap) >= 1 ? 'text-load' : 'text-ink-3'}">
								{nf1.format(Math.abs(pair.gap))} cm di divario
								<span class="text-ink-3">· più sottile la {pair.thinner}</span>
							</p>
						</div>

						<div class="space-y-1.5">
							{#each [{ side: 'Destra', value: pair.right, tone: 'bg-motion' }, { side: 'Sinistra', value: pair.left, tone: 'bg-bio' }] as bar (bar.side)}
								<div class="flex items-center gap-3">
									<span class="w-16 shrink-0 text-xs text-ink-3">{bar.side}</span>
									<div class="h-3 min-w-0 flex-1 rounded-[2px] bg-panel-2">
										<div class="h-full rounded-[2px] {bar.tone}" style="width: {(bar.value / data.maxThigh) * 100}%"></div>
									</div>
									<span class="w-20 shrink-0 text-right font-mono text-xs text-ink">{nf1.format(bar.value)} cm</span>
								</div>
							{/each}
						</div>
					</li>
				{/each}
			</ul>

			{#if closed != null && data.pairs.length >= 2}
				<p class="mt-5 border-t border-line pt-4 text-sm text-ink-2">
					{#if closed > 0.05}
						Il divario si è ridotto di <span class="font-mono text-ink">{nf1.format(closed)} cm</span> dalla prima
						misurazione.
					{:else if closed < -0.05}
						Il divario è cresciuto di <span class="font-mono text-load">{nf1.format(-closed)} cm</span> dalla prima
						misurazione.
					{:else}
						Il divario è fermo dov'era alla prima misurazione.
					{/if}
				</p>
			{:else}
				<p class="mt-5 border-t border-line pt-4 text-sm text-ink-3">
					Una misurazione sola non fa un andamento. La prossima è {countdown(data.nextPlanned)}.
				</p>
			{/if}
		{/if}
	</section>

	<section class="panel hud-load p-5">
		<div class="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1">
			<h2 class="text-sm font-medium text-ink">Calendario del metro</h2>
			<p class="text-xs text-ink-3">Una misurazione ogni quattro settimane</p>
		</div>
		<ul class="mt-3 flex flex-wrap gap-x-4 gap-y-2">
			{#each MEASURE_PLAN as planned (planned)}
				{@const done = data.measures.some((m) => m.day === planned)}
				<li class="flex items-center gap-1.5 font-mono text-xs {done ? 'text-ink-3' : 'text-ink-2'}">
					{#if done}
						<span class="text-good"><Icon name="check" size={13} title="Fatta" /></span>
					{:else}
						<span class="size-1.5 rounded-full bg-line-strong"></span>
					{/if}
					{formatDayShort(planned)}
				</li>
			{/each}
		</ul>
	</section>

	<section class="panel hud-load p-5">
		<h2 class="mb-4 text-sm font-medium text-ink">
			{draft ? `Modifica la misurazione del ${formatDayShort(draft.day)}` : 'Nuova misurazione'}
		</h2>

		{#if form?.error}
			<p class="mb-4 flex items-center gap-2 text-sm text-critical">
				<Icon name="warning" size={15} />
				{form.error}
			</p>
		{/if}

		<form method="POST" action="?/save" class="space-y-5">
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<Field name="day" label="Giorno" type="date" value={data.defaultDay} />
				<Field name="thighRightCm" label="Coscia destra" unit="cm" value={draft?.thighRightCm} hint="Il lato operato" />
				<Field name="thighLeftCm" label="Coscia sinistra" unit="cm" value={draft?.thighLeftCm} />
				<Field name="waistCm" label="Girovita" unit="cm" value={draft?.waistCm} />
				<Field name="chestCm" label="Torace" unit="cm" value={draft?.chestCm} />
				<Field name="armRightCm" label="Braccio destro" unit="cm" value={draft?.armRightCm} />
				<Field name="armLeftCm" label="Braccio sinistro" unit="cm" value={draft?.armLeftCm} />
			</div>

			<label class="flex w-fit cursor-pointer items-center gap-2.5 text-sm text-ink-2">
				<input
					type="checkbox"
					name="photo"
					checked={draft?.photo ?? false}
					class="size-4 rounded-[3px] border border-line-strong bg-panel-2 accent-motion"
				/>
				Foto scattata
			</label>

			<div>
				<label for="note" class="label mb-2 block">Note</label>
				<textarea
					id="note"
					name="note"
					rows="2"
					class="w-full rounded-[3px] border border-line bg-panel-2 px-3 py-2.5 text-sm text-ink placeholder:text-ink-3 focus:border-line-strong focus:outline-none"
				>{draft?.note ?? ''}</textarea>
			</div>

			<div class="flex items-center gap-4">
				<button
					type="submit"
					class="rounded-[3px] bg-motion px-4 py-2.5 text-sm font-medium text-ink transition-opacity duration-150 hover:opacity-90"
				>
					Salva la misurazione
				</button>
				{#if draft}
					<a href="/recupero/misure" class="text-sm text-ink-3 transition-colors hover:text-ink-2">Annulla</a>
				{/if}
			</div>
		</form>
	</section>

	{#if data.measures.length}
		<section class="panel hud-load p-5">
			<h2 class="mb-4 text-sm font-medium text-ink">Tutte le misure</h2>
			<!--
				`relative` non è decorativo: senza, l'etichetta `sr-only` dell'ultima
				colonna, che è in posizione assoluta, prende come riferimento il
				viewport invece di questo contenitore. Il ritaglio non la tocca, e sui
				telefoni trascina l'intera pagina di 200px in orizzontale.
			-->
			<div class="relative overflow-x-auto">
				<table class="w-full min-w-[560px] text-sm">
					<thead>
						<tr class="border-b border-line text-left">
							<th scope="col" class="label pb-2 font-normal">Giorno</th>
							<th scope="col" class="label pb-2 text-right font-normal">Coscia D</th>
							<th scope="col" class="label pb-2 text-right font-normal">Coscia S</th>
							<th scope="col" class="label pb-2 text-right font-normal">D − S</th>
							<th scope="col" class="label pb-2 text-right font-normal">Girovita</th>
							<th scope="col" class="label pb-2 text-right font-normal">Torace</th>
							<th scope="col" class="label pb-2 text-right font-normal"><span class="sr-only">Azioni</span></th>
						</tr>
					</thead>
					<tbody class="divide-y divide-line">
						{#each data.measures as m (m.day)}
							{@const gap =
								m.thighRightCm != null && m.thighLeftCm != null ? m.thighRightCm - m.thighLeftCm : null}
							<tr>
								<th scope="row" class="py-2.5 text-left font-normal">
									<a
										href="/recupero/misure?giorno={m.day}"
										class="font-mono text-xs text-ink-2 transition-colors hover:text-ink"
									>
										{formatDayShort(m.day)}
									</a>
								</th>
								<td class="py-2.5 text-right font-mono {m.thighRightCm == null ? 'text-ink-3' : 'text-ink'}">
									{m.thighRightCm == null ? '—' : nf1.format(m.thighRightCm)}
								</td>
								<td class="py-2.5 text-right font-mono {m.thighLeftCm == null ? 'text-ink-3' : 'text-ink'}">
									{m.thighLeftCm == null ? '—' : nf1.format(m.thighLeftCm)}
								</td>
								<td class="py-2.5 text-right font-mono {gap == null ? 'text-ink-3' : 'text-ink'}">
									{gap == null ? '—' : nf1.format(gap)}
								</td>
								<td class="py-2.5 text-right font-mono {m.waistCm == null ? 'text-ink-3' : 'text-ink'}">
									{m.waistCm == null ? '—' : nf1.format(m.waistCm)}
								</td>
								<td class="py-2.5 text-right font-mono {m.chestCm == null ? 'text-ink-3' : 'text-ink'}">
									{m.chestCm == null ? '—' : nf1.format(m.chestCm)}
								</td>
								<td class="py-2.5 text-right">
									<form method="POST" action="?/delete" class="inline-flex">
										<input type="hidden" name="day" value={m.day} />
										<button
											type="submit"
											class="flex size-8 items-center justify-center rounded-[3px] text-ink-3 transition-colors duration-150 hover:bg-panel-2 hover:text-critical"
											aria-label="Elimina la misurazione del {formatDayShort(m.day)}"
										>
											<Icon name="trash" size={15} />
										</button>
									</form>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/if}
</div>
