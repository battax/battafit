<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import ProtocolBar from '$lib/components/ProtocolBar.svelte';
	import ResponseChart from '$lib/components/ResponseChart.svelte';
	import { SWELLING_BY_KEY, diffDays, formatDayShort, formatDayLong } from '$lib/rehab';
	import { formatDuration } from '$lib/metrics';

	let { data } = $props();

	const nf0 = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 });
	const nf1 = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 });

	const today = $derived(data.todayLog);
	/** `logged` è la riga scritta a mano, non la presenza di dati: le calorie sincronizzate non chiudono la giornata. */
	const logged = $derived(today?.logged ? today : null);
	const swellingToday = $derived(logged?.swelling ? (SWELLING_BY_KEY.get(logged.swelling)?.label ?? null) : null);

	/** "fra 38 giorni", "oggi", "3 giorni fa": il conto alla rovescia è l'unica cosa che serve leggere di una scadenza. */
	function countdown(day: string): string {
		const n = diffDays(data.today, day);
		if (n === 0) return 'oggi';
		if (n === 1) return 'domani';
		if (n === -1) return 'ieri';
		return n > 0 ? `fra ${n} giorni` : `${-n} giorni fa`;
	}

	/** Le regole a conteggio si mostrano come tacche: sono numeri piccoli, e vederli è più veloce che leggerli. */
	function pips(done: number, target: number): boolean[] {
		return Array.from({ length: Math.max(target, done) }, (_, i) => i < done);
	}
</script>

<svelte:head><title>Recupero · BattaFit</title></svelte:head>

<div class="space-y-gutter">
	{#if data.alerts.length}
		<!--
			I segnali vengono prima di tutto il resto, anche di una settimana andata
			bene: sono l'unica parte della sezione in cui il protocollo dice di
			fermarsi, e sotto a un grafico non li leggerebbe nessuno.
		-->
		<section class="panel border-warning/40 bg-warning/5 p-4" aria-label="Segnali da valutare">
			<ul class="space-y-2.5">
				{#each data.alerts as alert (alert.sign)}
					<li class="flex gap-2.5">
						<span class="mt-0.5 shrink-0 text-warning"><Icon name="warning" size={16} /></span>
						<div class="min-w-0">
							<p class="text-sm font-medium text-ink">{alert.sign}</p>
							<p class="mt-0.5 text-sm text-ink-2">{alert.action}</p>
						</div>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<!-- La riga di oggi: o manca, e allora è l'unica cosa da fare, o c'è, e si rilegge in un colpo d'occhio. -->
	<section class="panel p-4">
		{#if !logged}
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div class="min-w-0">
					<p class="text-sm text-ink">Oggi non è ancora registrato</p>
					<p class="mt-0.5 text-sm text-ink-3 first-letter:uppercase">{formatDayLong(data.today)}</p>
				</div>
				<a
					href="/recupero/registro"
					class="flex items-center gap-2 rounded-[3px] bg-suit-red px-3.5 py-2 text-sm font-medium text-ink transition-opacity duration-150 hover:opacity-90"
				>
					<Icon name="plus" size={15} />
					Compila
				</a>
			</div>
		{:else}
			<div class="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
				<dl class="flex flex-wrap items-baseline gap-x-6 gap-y-2">
					<div>
						<dt class="label">Dolore</dt>
						<dd class="mt-1 font-mono text-lg {logged.pain == null ? 'text-ink-3' : 'text-ink'}">
							{logged.pain ?? '—'}{#if logged.pain != null}<span class="text-xs text-ink-3">/10</span>{/if}
						</dd>
					</div>
					<div>
						<dt class="label">Gonfiore</dt>
						<dd class="mt-1 text-lg {swellingToday && swellingToday !== 'No' ? 'text-street' : 'text-ink'}">
							{swellingToday ?? '—'}
						</dd>
					</div>
					<div>
						<dt class="label">FKT</dt>
						<dd class="mt-1 text-lg text-ink">{logged.fkt ? 'Fatta' : 'No'}</dd>
					</div>
					<div>
						<dt class="label">Parte alta</dt>
						<dd class="mt-1 text-lg {logged.upperBody ? 'text-ink' : 'text-ink-3'}">{logged.upperBody ?? '—'}</dd>
					</div>
					<div>
						<dt class="label">Proteine</dt>
						<dd class="mt-1 font-mono text-lg {logged.proteinG.value == null ? 'text-ink-3' : 'text-ink'}">
							{logged.proteinG.value == null ? '—' : nf0.format(logged.proteinG.value)}
							<span class="text-xs text-ink-3">g</span>
						</dd>
					</div>
				</dl>
				<a href="/recupero/registro" class="text-sm text-ink-3 transition-colors hover:text-ink-2">Modifica</a>
			</div>
		{/if}
	</section>

	<!-- Il blocco intero, che è il contesto di ogni altra cosa in questa pagina. -->
	<section class="panel panel-bleed px-4 py-5 md:px-8">
		<div class="mb-4 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1">
			<h2 class="text-sm font-medium text-ink">Le tredici settimane</h2>
			<p class="text-xs text-ink-3">Regole della formula d'oro rispettate, settimana per settimana</p>
		</div>

		<ProtocolBar weeks={data.cells} today={data.today} milestones={data.milestones} />

		<ul class="mt-5 divide-y divide-line border-t border-line">
			{#each data.milestones as m (m.id)}
				{@const past = m.day < data.today}
				<li class="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2.5">
					<span class="font-mono text-xs {past ? 'text-ink-3' : 'text-street'}">{formatDayShort(m.day)}</span>
					<span class="text-sm {past ? 'text-ink-3' : 'text-ink'}">{m.title}</span>
					<span class="ml-auto font-mono text-xs text-ink-3">{countdown(m.day)}</span>
				</li>
			{/each}
		</ul>
	</section>

	<!--
		La formula d'oro è un contratto settimanale: ogni riga vale quanto le altre
		e si legge da sola. Ridurla a una percentuale unica nasconderebbe proprio la
		riga saltata, che è l'unica informazione utile.
	-->
	<section class="panel p-5">
		<div class="mb-4 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1">
			<h2 class="text-sm font-medium text-ink">La formula d'oro</h2>
			<p class="font-mono text-xs text-ink-3">
				settimana {data.summary.week} · giorno {data.summary.elapsed} di 7
			</p>
		</div>

		<ul class="divide-y divide-line">
			{#each data.ledger as rule (rule.label)}
				<li class="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0">
					<div class="min-w-0 flex-1">
						<p class="flex items-center gap-2 text-sm text-ink">
							{rule.label}
							{#if rule.met}
								<span class="text-good" title="Rispettata"><Icon name="check" size={14} title="Rispettata" /></span>
							{:else if !rule.pending}
								<span class="text-warning" title="Non più raggiungibile questa settimana">
									<Icon name="warning" size={13} title="Non più raggiungibile questa settimana" />
								</span>
							{/if}
						</p>
						<p class="mt-0.5 text-xs text-ink-3">{rule.detail}</p>
					</div>

					{#if rule.target === 0}
						<p class="font-mono text-sm {rule.met ? 'text-ink' : 'text-street'}">
							{rule.done}
							<span class="text-xs text-ink-3">{rule.unit}</span>
						</p>
					{:else}
						<div class="flex items-center gap-3">
							<span class="flex gap-1" aria-hidden="true">
								{#each pips(rule.done, rule.target) as filled, i (i)}
									<span
										class="size-2 rounded-full {filled ? 'bg-suit-blue' : 'border border-line-strong'}"
									></span>
								{/each}
							</span>
							<p class="font-mono text-sm text-ink">
								{rule.done}<span class="text-ink-3">/{rule.target}</span>
								{#if rule.unit}<span class="text-xs text-ink-3">{rule.unit}</span>{/if}
							</p>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	</section>

	<section class="panel p-5">
		<div class="mb-4 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1">
			<h2 class="text-sm font-medium text-ink">Risposta al carico</h2>
			<p class="text-xs text-ink-3">Ultimi 30 giorni</p>
		</div>
		<ResponseChart points={data.response} />
	</section>

	<div class="grid gap-gutter sm:grid-cols-2">
		<section class="panel p-5">
			<h2 class="label mb-3">Prossima corsa</h2>
			{#if data.nextRun}
				<p class="text-sm text-ink">{data.nextRun.protocol}</p>
				<p class="mt-1.5 font-mono text-xs text-ink-3">
					{formatDayShort(data.nextRun.plannedOn)} · {countdown(data.nextRun.plannedOn)} · settimana {data.nextRun
						.protocolWeek} del protocollo corsa
				</p>
				<a
					href="/recupero/corsa"
					class="mt-4 inline-flex items-center gap-1.5 text-sm text-ink-2 transition-colors hover:text-ink"
				>
					Apri la progressione <Icon name="chevronRight" size={14} />
				</a>
			{:else}
				<p class="text-sm text-ink-3">Progressione completata: le dodici sedute sono tutte registrate.</p>
			{/if}
		</section>

		<section class="panel p-5">
			<h2 class="label mb-3">Oggi da Salute</h2>
			<dl class="space-y-2">
				<div class="flex items-baseline justify-between gap-4">
					<dt class="text-sm text-ink-2">Passi</dt>
					<dd class="font-mono text-sm {data.steps == null ? 'text-ink-3' : 'text-ink'}">
						{data.steps == null ? '—' : nf0.format(data.steps)}
					</dd>
				</div>
				<div class="flex items-baseline justify-between gap-4">
					<dt class="text-sm text-ink-2">Sonno</dt>
					<dd class="font-mono text-sm {data.sleep == null ? 'text-ink-3' : 'text-ink'}">
						{data.sleep == null ? '—' : formatDuration(data.sleep * 3600)}
					</dd>
				</div>
				<div class="flex items-baseline justify-between gap-4">
					<dt class="text-sm text-ink-2">Corsa</dt>
					<dd class="font-mono text-sm {data.runMinutes == null ? 'text-ink-3' : 'text-ink'}">
						{data.runMinutes == null ? '—' : `${nf0.format(data.runMinutes)} min`}
					</dd>
				</div>
				<div class="flex items-baseline justify-between gap-4">
					<dt class="text-sm text-ink-2">Peso</dt>
					<dd class="font-mono text-sm {data.weight == null ? 'text-ink-3' : 'text-ink'}">
						{data.weight == null ? '—' : `${nf1.format(data.weight)} kg`}
					</dd>
				</div>
			</dl>
			<p class="mt-4 text-xs text-ink-3">
				{#if data.weight != null && !data.weightFromWatch}
					Il peso arriva dal registro: Salute non ne ha ancora.
				{:else}
					Questi quattro non si compilano a mano: il registro chiede solo quello che nessuna app sa già.
				{/if}
			</p>
		</section>
	</div>

	{#if data.nextDeadline}
		<p class="text-xs text-ink-3">
			Prossima scadenza clinica: <span class="text-ink-2">{data.nextDeadline.title}</span>,
			{countdown(data.nextDeadline.day as string)}.
			<a href="/recupero/protocollo" class="underline underline-offset-2 transition-colors hover:text-ink-2">
				Vedi il protocollo
			</a>
		</p>
	{/if}
</div>
