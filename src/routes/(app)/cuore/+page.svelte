<script lang="ts">
	import TimeChart from '$lib/components/TimeChart.svelte';
	import RangePicker from '$lib/components/RangePicker.svelte';
	import Delta from '$lib/components/Delta.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';

	let { data } = $props();

	const nf0 = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 });
	const nf1 = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 });

	const METRICS = [
		{
			metric: 'restingHr',
			title: 'Frequenza a riposo',
			unit: 'bpm',
			color: 'var(--color-suit-red)',
			higherIsBetter: false,
			format: (v: number) => nf0.format(v),
			note: 'Quanto batte il cuore quando non stai facendo niente. Se scende nel tempo, di solito è allenamento che si vede.'
		},
		{
			metric: 'hrv',
			title: 'Variabilità cardiaca',
			unit: 'ms',
			color: 'var(--color-goblin)',
			higherIsBetter: true,
			format: (v: number) => nf0.format(v),
			note: 'La distanza fra un battito e l’altro non è mai identica. Più varia, più il sistema nervoso è riposato.'
		},
		{
			metric: 'vo2max',
			title: 'VO₂ max',
			unit: 'ml/kg·min',
			color: 'var(--color-oscorp)',
			higherIsBetter: true,
			format: (v: number) => nf1.format(v),
			note: 'La stima di quanto ossigeno riesci a usare sotto sforzo. Si muove lentamente: guardala sui mesi, non sui giorni.'
		},
		{
			metric: 'walkingHr',
			title: 'Frequenza in camminata',
			unit: 'bpm',
			color: 'var(--color-rose)',
			higherIsBetter: false,
			format: (v: number) => nf0.format(v),
			note: null
		},
		{
			metric: 'spo2',
			title: 'Ossigenazione del sangue',
			unit: '%',
			color: 'var(--color-electro)',
			higherIsBetter: true,
			format: (v: number) => nf1.format(v),
			note: null
		},
		{
			metric: 'respiratoryRate',
			title: 'Frequenza respiratoria',
			unit: 'resp/min',
			color: 'var(--color-street)',
			higherIsBetter: undefined,
			format: (v: number) => nf1.format(v),
			note: null
		}
	];

	const available = $derived(METRICS.filter((m) => (data.series[m.metric] ?? []).some((p) => p.value != null)));
</script>

<svelte:head><title>Cuore · BattaFit</title></svelte:head>

<PageHeader title="Cuore e recupero" spine={data.spine}>
	{#snippet actions()}
		<RangePicker active={data.range.key} />
	{/snippet}
</PageHeader>

{#if !available.length}
	<EmptyState
		icon="heart"
		title="Nessuna misura del cuore in questo periodo"
		description="Le misure di frequenza a riposo e variabilità arrivano dall'Apple Watch indossato con continuità, anche di notte."
	/>
{:else}
	<div class="grid gap-gutter lg:grid-cols-2">
		{#each available as item, i (item.metric)}
			{@const points = data.series[item.metric] ?? []}
			{@const avg = data.current[item.metric]}
			<!-- La prima metrica comanda la sezione e rompe il gutter. -->
			<section class="panel p-5 {i === 0 ? 'panel-bleed px-4 md:px-8 lg:col-span-2' : ''}">
				<div class="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
					<h2 class="text-sm font-medium text-ink">{item.title}</h2>
					<div class="flex items-baseline gap-2.5">
						<p class="font-mono text-lg tracking-tight {avg == null ? 'text-ink-3' : 'text-ink'}">
							{avg == null ? '—' : item.format(avg)}
							<span class="text-xs text-ink-3">{item.unit}</span>
						</p>
						<Delta
							current={avg}
							baseline={data.previous[item.metric]}
							higherIsBetter={item.higherIsBetter}
							label="rispetto al periodo precedente"
						/>
					</div>
				</div>

				<TimeChart
					data={points}
					color={item.color}
					unit={item.unit}
					format={item.format}
					height={i === 0 ? 240 : 180}
					label="{item.title} nel tempo"
					reference={avg != null ? { value: avg, label: `media ${item.format(avg)}` } : null}
				/>

				{#if item.note}
					<p class="mt-3 max-w-prose text-xs leading-relaxed text-ink-3">{item.note}</p>
				{/if}
			</section>
		{/each}
	</div>
{/if}
