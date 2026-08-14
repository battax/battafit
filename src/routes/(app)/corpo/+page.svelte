<script lang="ts">
	import TimeChart from '$lib/components/TimeChart.svelte';
	import RangePicker from '$lib/components/RangePicker.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';

	let { data } = $props();

	const nf1 = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 });
	const nf2 = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 });

	const METRICS = [
		{ metric: 'weight', title: 'Peso', unit: 'kg', color: 'var(--color-oscorp)', format: (v: number) => nf1.format(v) },
		{ metric: 'bodyFat', title: 'Massa grassa', unit: '%', color: 'var(--color-street)', format: (v: number) => nf1.format(v) },
		{ metric: 'leanMass', title: 'Massa magra', unit: 'kg', color: 'var(--color-suit-blue)', format: (v: number) => nf1.format(v) },
		{ metric: 'bmi', title: 'Indice di massa corporea', unit: '', color: 'var(--color-goblin)', format: (v: number) => nf1.format(v) },
		{ metric: 'wristTemp', title: 'Temperatura del polso', unit: '°C', color: 'var(--color-rose)', format: (v: number) => nf2.format(v) }
	];

	const available = $derived(METRICS.filter((m) => (data.series[m.metric] ?? []).some((p) => p.value != null)));

	/** Variazione assoluta fra la prima e l'ultima misura del periodo. */
	function change(metric: string): number | null {
		const a = data.first[metric];
		const b = data.last[metric];
		if (a == null || b == null) return null;
		return b - a;
	}
</script>

<svelte:head><title>Corpo · BattaFit</title></svelte:head>

<PageHeader title="Corpo" spine={data.spine}>
	{#snippet actions()}
		<RangePicker active={data.range.key} />
	{/snippet}
</PageHeader>

{#if !available.length}
	<EmptyState
		icon="body"
		title="Nessuna misura corporea in questo periodo"
		description="Peso e composizione corporea arrivano da una bilancia connessa o inseriti a mano nell'app Salute."
	/>
{:else}
	<div class="grid gap-gutter lg:grid-cols-2">
		{#each available as item, i (item.metric)}
			{@const delta = change(item.metric)}
			{@const current = data.last[item.metric]}
			<!-- Il peso comanda la sezione e rompe il gutter. -->
			<section class="panel p-5 {i === 0 ? 'panel-bleed px-4 md:px-8 lg:col-span-2' : ''}">
				<div class="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
					<h2 class="text-sm font-medium text-ink">{item.title}</h2>
					<div class="flex items-baseline gap-2.5">
						<p class="font-mono text-lg tracking-tight {current == null ? 'text-ink-3' : 'text-ink'}">
							{current == null ? '—' : item.format(current)}
							<span class="text-xs text-ink-3">{item.unit}</span>
						</p>
						{#if delta != null && Math.abs(delta) > 0.05}
							<span class="inline-flex items-center gap-1 font-mono text-xs text-ink-2">
								<Icon name={delta > 0 ? 'arrowUp' : 'arrowDown'} size={12} />
								{item.format(Math.abs(delta))}
								{item.unit} nel periodo
							</span>
						{/if}
					</div>
				</div>

				<TimeChart
					data={data.series[item.metric] ?? []}
					color={item.color}
					unit={item.unit}
					format={item.format}
					height={i === 0 ? 240 : 180}
					label="{item.title} nel tempo"
				/>
			</section>
		{/each}
	</div>
{/if}
