<script lang="ts">
	import TimeChart from '$lib/components/TimeChart.svelte';
	import RangePicker from '$lib/components/RangePicker.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';

	let { data } = $props();

	const nf0 = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 });
	const nf1 = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 });

	/** Media giornaliera, non totale: il totale di "1 anno" non si confronta con quello di "7 giorni". */
	const perDay = (total: number) => (data.daysWithData ? total / data.daysWithData : 0);

	const summary = $derived(
		data.totals
			? [
					{ label: 'Passi al giorno', value: nf0.format(perDay(data.totals.steps)), sub: `${nf0.format(data.totals.steps)} in totale` },
					{ label: 'Distanza', value: `${nf1.format(data.totals.distance)} km`, sub: `${nf1.format(perDay(data.totals.distance))} km al giorno` },
					{ label: 'Calorie attive', value: `${nf0.format(perDay(data.totals.activeEnergy))} kcal`, sub: 'al giorno' },
					{ label: 'Anelli chiusi', value: nf0.format(data.ringsClosed), sub: `su ${nf0.format(data.daysWithData)} giornate` }
				]
			: []
	);

	// Sei metriche sulla stessa pagina: ognuna prende uno slot diverso della
	// palette, così due grafici vicini non si somigliano mai.
	const charts = $derived([
		{ metric: 'steps', title: 'Passi', mark: 'bar' as const, color: 'var(--color-suit-red)', unit: 'passi', format: (v: number) => nf0.format(v) },
		{ metric: 'activeEnergy', title: 'Calorie attive', mark: 'bar' as const, color: 'var(--color-street)', unit: 'kcal', format: (v: number) => nf0.format(v) },
		{ metric: 'exerciseTime', title: 'Minuti di esercizio', mark: 'bar' as const, color: 'var(--color-suit-blue)', unit: 'min', format: (v: number) => nf0.format(v) },
		{ metric: 'distance', title: 'Distanza percorsa', mark: 'bar' as const, color: 'var(--color-electro)', unit: 'km', format: (v: number) => nf1.format(v) },
		{ metric: 'flights', title: 'Piani saliti', mark: 'bar' as const, color: 'var(--color-goblin)', unit: 'piani', format: (v: number) => nf0.format(v) },
		{ metric: 'standTime', title: 'Minuti in piedi', mark: 'bar' as const, color: 'var(--color-oscorp)', unit: 'min', format: (v: number) => nf0.format(v) }
	]);
</script>

<svelte:head><title>Attività · BattaFit</title></svelte:head>

<PageHeader title="Attività" spine={data.spine}>
	{#snippet actions()}
		<RangePicker active={data.range.key} />
	{/snippet}
</PageHeader>

{#if !data.totals || !data.daysWithData}
	<EmptyState title="Nessun dato di attività in questo periodo" description="Prova ad allargare l'intervallo, oppure importa un export più recente." />
{:else}
	<div class="space-y-gutter">
		<!-- Riepilogo come riga di valori, non come schede: sono quattro letture dello stesso periodo. -->
		<section class="panel grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x">
			{#each summary as item (item.label)}
				<div class="border-line px-5 py-4 not-last:border-b sm:border-b-0">
					<p class="label">{item.label}</p>
					<p class="mt-1.5 font-mono text-xl font-medium tracking-tight text-ink">{item.value}</p>
					<p class="mt-0.5 text-xs text-ink-3">{item.sub}</p>
				</div>
			{/each}
		</section>

		<!-- I passi sono la metrica guida: è la vignetta che rompe il gutter. -->
		<section class="panel panel-bleed py-5">
			<h2 class="mb-4 px-4 text-sm font-medium text-ink md:px-8">{charts[0].title}</h2>
			<div class="px-4 md:px-8">
				<TimeChart
					data={data.series[charts[0].metric] ?? []}
					mark={charts[0].mark}
					color={charts[0].color}
					unit={charts[0].unit}
					format={charts[0].format}
					height={220}
					label="{charts[0].title} per giorno"
				/>
			</div>
		</section>

		<div class="grid gap-gutter lg:grid-cols-2">
			{#each charts.slice(1) as chart (chart.metric)}
				<section class="panel p-5">
					<h2 class="mb-4 text-sm font-medium text-ink">{chart.title}</h2>
					<TimeChart
						data={data.series[chart.metric] ?? []}
						mark={chart.mark}
						color={chart.color}
						unit={chart.unit}
						format={chart.format}
						height={180}
						label="{chart.title} per giorno"
					/>
				</section>
			{/each}
		</div>
	</div>
{/if}
