<script lang="ts">
	import TimeChart from '$lib/components/TimeChart.svelte';
	import RangePicker from '$lib/components/RangePicker.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import HudPanel from '$lib/components/HudPanel.svelte';
	import SectionHeader from '$lib/components/SectionHeader.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import InsightPanel from '$lib/components/InsightPanel.svelte';
	import { periodInsight } from '$lib/insight';

	let { data } = $props();

	const nf0 = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 });
	const nf1 = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 });

	/** Media giornaliera, non totale: il totale di "1 anno" non si confronta con quello di "7 giorni". */
	const perDay = (total: number) => (data.daysWithData ? total / data.daysWithData : 0);

	const stepsPerDay = $derived(data.totals ? perDay(data.totals.steps) : null);

	/** Le quattro letture d'apertura. Gli anelli chiusi prendono il verde: è l'unico "completato" della pagina. */
	const kpis = $derived(
		data.totals
			? [
					{ label: 'Passi al giorno', value: perDay(data.totals.steps), unit: '', channel: 'motion' as const, icon: 'activity' as const, format: (v: number) => nf0.format(v), sub: `${nf0.format(data.totals.steps)} in totale` },
					{ label: 'Distanza', value: data.totals.distance, unit: 'km', channel: 'motion' as const, icon: 'route' as const, format: (v: number) => nf1.format(v), sub: `${nf1.format(perDay(data.totals.distance))} km al giorno` },
					{ label: 'Calorie attive', value: perDay(data.totals.activeEnergy), unit: 'kcal', channel: 'load' as const, icon: 'flame' as const, format: (v: number) => nf0.format(v), sub: 'al giorno' },
					{ label: 'Anelli chiusi', value: data.ringsClosed, unit: '', channel: 'done' as const, icon: 'check' as const, format: (v: number) => nf0.format(v), sub: `su ${nf0.format(data.daysWithData)} giornate` }
				]
			: []
	);

	/** Giornate del periodo, buchi compresi: serve a dire quante ne mancano. */
	const daysInPeriod = $derived.by(() => {
		const from = new Date(data.range.from + 'T00:00:00Z').getTime();
		const to = new Date(data.range.to + 'T00:00:00Z').getTime();
		return Math.max(1, Math.round((to - from) / 86_400_000) + 1);
	});

	const insight = $derived(
		periodInsight({
			daysWithData: data.daysWithData,
			// Su "Tutto" l'intervallo parte dal 1970: le giornate "mancanti" sarebbero
			// vent'anni prima del primo orologio, e non è un buco, è preistoria.
			daysInPeriod: data.range.key === 'tutto' ? data.daysWithData : daysInPeriod,
			stepsPerDay,
			previousStepsPerDay: data.previous?.stepsPerDay ?? null,
			best: data.best,
			ringsClosed: data.ringsClosed
		})
	);

	// Sei metriche sulla stessa pagina: ognuna prende uno slot diverso della
	// palette, così due grafici vicini non si somigliano mai. I primi tre
	// coincidono con i canali — passi rosso, energia oro, esercizio blu.
	const charts = $derived([
		{ metric: 'steps', title: 'Passi', color: 'var(--color-motion)', channel: 'motion' as const, unit: 'passi', format: (v: number) => nf0.format(v) },
		{ metric: 'activeEnergy', title: 'Calorie attive', color: 'var(--color-load)', channel: 'load' as const, unit: 'kcal', format: (v: number) => nf0.format(v) },
		{ metric: 'exerciseTime', title: 'Minuti di esercizio', color: 'var(--color-bio)', channel: 'bio' as const, unit: 'min', format: (v: number) => nf0.format(v) },
		{ metric: 'distance', title: 'Distanza percorsa', color: 'var(--color-s7)', channel: 'motion' as const, unit: 'km', format: (v: number) => nf1.format(v) },
		{ metric: 'flights', title: 'Piani saliti', color: 'var(--color-s4)', channel: 'motion' as const, unit: 'piani', format: (v: number) => nf0.format(v) },
		{ metric: 'standTime', title: 'Minuti in piedi', color: 'var(--color-s5)', channel: 'motion' as const, unit: 'min', format: (v: number) => nf0.format(v) }
	]);
</script>

<svelte:head><title>Attività · BattaFit</title></svelte:head>

<PageHeader title="Attività" spine={data.spine}>
	{#snippet actions()}
		<RangePicker active={data.range.key} />
	{/snippet}
</PageHeader>

{#if !data.totals || !data.daysWithData}
	<EmptyState
		icon="activity"
		title="Nessun dato di attività in questo periodo"
		description="Prova ad allargare l'intervallo, oppure importa un export più recente."
	/>
{:else}
	<div class="space-y-gutter">
		<!-- Quattro letture dello stesso periodo, di pari peso fra loro. -->
		<div class="grid grid-cols-2 gap-gutter lg:grid-cols-4">
			{#each kpis as kpi (kpi.label)}
				<MetricCard
					label={kpi.label}
					value={kpi.value}
					unit={kpi.unit}
					icon={kpi.icon}
					channel={kpi.channel}
					format={kpi.format}
					sub={kpi.sub}
					size="lg"
				/>
			{/each}
		</div>

		<!-- I passi sono la metrica guida: è il pannello che rompe il gutter. -->
		<HudPanel channel="motion" bleed class="py-5">
			<SectionHeader
				title={charts[0].title}
				channel="motion"
				meta={data.range.label.toLowerCase()}
				class="mb-4 px-4 md:px-8"
			/>
			<div class="px-4 md:px-8">
				<TimeChart
					data={data.series[charts[0].metric] ?? []}
					mark="bar"
					color={charts[0].color}
					unit={charts[0].unit}
					format={charts[0].format}
					height={230}
					label="{charts[0].title} per giorno"
					reference={stepsPerDay ? { value: stepsPerDay, label: `media ${nf0.format(stepsPerDay)}` } : null}
				/>
			</div>
		</HudPanel>

		<!--
			La sintesi sta subito sotto il grafico che riassume, non in fondo alla
			pagina: le sue frasi parlano di quelle barre, e a due schermate di
			distanza si leggerebbero come un riepilogo generico.
		-->
		<InsightPanel clauses={insight} meta={data.range.label.toLowerCase()} />

		<div class="grid gap-gutter lg:grid-cols-2">
			{#each charts.slice(1) as chart (chart.metric)}
				<HudPanel channel={chart.channel} class="p-5">
					<SectionHeader title={chart.title} channel={chart.channel} class="mb-4" />
					<TimeChart
						data={data.series[chart.metric] ?? []}
						mark="bar"
						color={chart.color}
						unit={chart.unit}
						format={chart.format}
						height={180}
						label="{chart.title} per giorno"
					/>
				</HudPanel>
			{/each}
		</div>
	</div>
{/if}
