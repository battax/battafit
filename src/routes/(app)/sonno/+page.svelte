<script lang="ts">
	import SleepChart from '$lib/components/SleepChart.svelte';
	import TimeChart from '$lib/components/TimeChart.svelte';
	import RangePicker from '$lib/components/RangePicker.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { formatDuration } from '$lib/metrics';

	let { data } = $props();

	const nf0 = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 });
	const nf1 = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 });

	/** Minuti su asse continuo → "23:34". I valori negativi sono le ore prima di mezzanotte. */
	function clockTime(minutes: number | null): string {
		if (minutes == null) return '—';
		const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
		return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
	}

	const summary = $derived(
		data.stats
			? [
					{ label: 'Sonno medio', value: formatDuration(data.stats.avgAsleepSec), sub: `su ${data.stats.nights} notti` },
					{
						label: 'A letto verso',
						value: clockTime(data.stats.avgBedtime),
						sub: data.stats.bedtimeSpread != null ? `oscilla di ${nf0.format(data.stats.bedtimeSpread)} min` : ''
					},
					{ label: 'Sveglio verso', value: clockTime(data.stats.avgWake), sub: '' },
					{
						label: 'Profondo + REM',
						value:
							data.stats.deepShare != null && data.stats.remShare != null
								? `${nf0.format((data.stats.deepShare + data.stats.remShare) * 100)}%`
								: '—',
						sub: 'del tempo dormito'
					}
				]
			: []
	);

	/** Il commento sulla regolarità è la lettura che i numeri da soli non danno. */
	const regularity = $derived.by(() => {
		const spread = data.stats?.bedtimeSpread;
		if (spread == null) return null;
		if (spread < 30) return 'Vai a dormire a un orario molto regolare.';
		if (spread < 60) return 'L’orario in cui vai a dormire è abbastanza costante.';
		return 'L’orario in cui vai a dormire cambia parecchio da una notte all’altra.';
	});
</script>

<svelte:head><title>Sonno · BattaFit</title></svelte:head>

<PageHeader title="Sonno" spine={data.spine}>
	{#snippet actions()}
		<RangePicker active={data.range.key} />
	{/snippet}
</PageHeader>

{#if !data.stats}
	<EmptyState
		icon="sleep"
		title="Nessuna notte registrata in questo periodo"
		description="Il monitoraggio del sonno richiede di indossare l'Apple Watch a letto, con la Modalità sonno attiva."
	/>
{:else}
	<div class="space-y-gutter">
		<section class="panel grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x">
			{#each summary as item (item.label)}
				<div class="border-line px-5 py-4 not-last:border-b sm:border-b-0">
					<p class="label">{item.label}</p>
					<p class="mt-1.5 font-mono text-xl font-medium tracking-tight text-ink">{item.value}</p>
					{#if item.sub}<p class="mt-0.5 text-xs text-ink-3">{item.sub}</p>{/if}
				</div>
			{/each}
		</section>

		<!-- Le notti impilate sono la metrica guida: è la vignetta che rompe il gutter. -->
		<section class="panel panel-bleed py-5">
			<div class="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 md:px-8">
				<h2 class="text-sm font-medium text-ink">Le notti, fase per fase</h2>
				{#if regularity}<p class="text-xs text-ink-3">{regularity}</p>{/if}
			</div>
			<div class="px-4 md:px-8">
				<SleepChart nights={data.nights} height={280} />
			</div>
		</section>

		<div class="grid gap-gutter lg:grid-cols-2">
			<section class="panel p-5">
				<h2 class="mb-4 text-sm font-medium text-ink">Sonno profondo</h2>
				<TimeChart
					data={data.series.sleepDeep ?? []}
					color="var(--color-ramp-600)"
					unit="h"
					format={(v) => nf1.format(v)}
					height={180}
					label="Ore di sonno profondo per notte"
				/>
			</section>

			<section class="panel p-5">
				<h2 class="mb-4 text-sm font-medium text-ink">Sonno REM</h2>
				<TimeChart
					data={data.series.sleepRem ?? []}
					color="var(--color-ramp-250)"
					unit="h"
					format={(v) => nf1.format(v)}
					height={180}
					label="Ore di sonno REM per notte"
				/>
			</section>
		</div>
	</div>
{/if}
