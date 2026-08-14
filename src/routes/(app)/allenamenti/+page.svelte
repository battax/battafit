<script lang="ts">
	import { page } from '$app/state';
	import RangePicker from '$lib/components/RangePicker.svelte';
	import WorkoutRow from '$lib/components/WorkoutRow.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import HudPanel from '$lib/components/HudPanel.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import { workoutType, workoutTone } from '$lib/workout-types';
	import { formatDuration } from '$lib/metrics';

	let { data } = $props();

	const nf0 = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 });
	const nf1 = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 });

	function withParams(changes: Record<string, string | null>): string {
		const url = new URL(page.url);
		for (const [key, value] of Object.entries(changes)) {
			if (value === null) url.searchParams.delete(key);
			else url.searchParams.set(key, value);
		}
		// Cambiare filtro deve riportare alla prima pagina, non lasciare un vuoto.
		if (!('pagina' in changes)) url.searchParams.delete('pagina');
		return url.pathname + url.search;
	}

	const totals = $derived.by(() => {
		const shown = data.type ? data.types.filter((t) => t.type === data.type) : data.types;
		return {
			count: shown.reduce((a, t) => a + t.n, 0),
			seconds: shown.reduce((a, t) => a + Number(t.totalSec ?? 0), 0),
			km: shown.reduce((a, t) => a + Number(t.totalKm ?? 0), 0),
			kcal: shown.reduce((a, t) => a + Number(t.totalKcal ?? 0), 0)
		};
	});

	const lastPage = $derived(Math.max(1, Math.ceil(data.total / data.pageSize)));
</script>

<svelte:head><title>Allenamenti · BattaFit</title></svelte:head>

<PageHeader title="Allenamenti" spine={data.spine}>
	{#snippet actions()}
		<RangePicker active={data.range.key} />
	{/snippet}
</PageHeader>

{#if !data.types.length}
	<EmptyState
		icon="workouts"
		title="Nessun allenamento in questo periodo"
		description="Gli allenamenti avviati dall'app Fitness sull'Apple Watch compaiono qui dopo l'importazione."
	/>
{:else}
	<div class="space-y-gutter">
		<div class="grid grid-cols-2 gap-gutter lg:grid-cols-4">
			<MetricCard label="Sessioni" value={totals.count} channel="motion" icon="workouts" format={(v) => nf0.format(v)} size="lg" />
			<MetricCard
				label="Tempo totale"
				value={totals.seconds}
				channel="motion"
				icon="clock"
				format={(v) => formatDuration(v)}
				size="lg"
			/>
			<MetricCard label="Distanza" value={totals.km} unit="km" channel="motion" icon="route" format={(v) => nf1.format(v)} size="lg" />
			<MetricCard label="Energia" value={totals.kcal} unit="kcal" channel="load" icon="flame" format={(v) => nf0.format(v)} size="lg" />
		</div>

		<!--
			Filtro per disciplina. Ogni voce porta il pallino del proprio colore,
			che è lo stesso della barretta nell'elenco qui sotto: si sceglie il
			filtro e si ritrova la stessa tinta sulle righe che restano.
		-->
		<nav aria-label="Filtra per tipo" class="flex flex-wrap gap-1.5">
			<a
				href={withParams({ tipo: null })}
				aria-current={!data.type ? 'page' : undefined}
				class="rounded-[3px] border px-2.5 py-1.5 text-xs font-medium transition-colors duration-150
					{!data.type ? 'border-line-strong bg-panel-2 text-ink' : 'border-transparent text-ink-3 hover:bg-panel-2/50 hover:text-ink-2'}"
			>
				Tutti
			</a>
			{#each data.types as t (t.type)}
				{@const def = workoutType(t.type)}
				{@const active = data.type === t.type}
				<a
					href={withParams({ tipo: t.type })}
					aria-current={active ? 'page' : undefined}
					class="flex items-center gap-1.5 rounded-[3px] border px-2.5 py-1.5 text-xs font-medium transition-colors duration-150
						{active ? 'border-line-strong bg-panel-2 text-ink' : 'border-transparent text-ink-3 hover:bg-panel-2/50 hover:text-ink-2'}"
				>
					<span class="size-1.5 shrink-0 rounded-full" style="background: {workoutTone(def)}"></span>
					<Icon name={def.icon} size={13} />
					{def.label}
					<span class="tabular text-ink-3">{t.n}</span>
				</a>
			{/each}
		</nav>

		{#if data.workouts.length}
			<HudPanel channel="motion" class="overflow-hidden">
				<ul class="divide-y divide-line">
					{#each data.workouts as workout (workout.id)}
						<li><WorkoutRow {workout} /></li>
					{/each}
				</ul>
			</HudPanel>

			{#if lastPage > 1}
				<nav aria-label="Pagine" class="flex items-center justify-between gap-3">
					<a
						href={withParams({ pagina: String(data.pageNumber - 1) })}
						aria-disabled={data.pageNumber <= 1}
						class="flex items-center gap-1 rounded-[3px] px-2.5 py-1.5 text-xs text-ink-2 transition-colors hover:bg-panel-2/60
							{data.pageNumber <= 1 ? 'pointer-events-none opacity-40' : ''}"
					>
						<Icon name="chevronLeft" size={13} /> Precedenti
					</a>
					<p class="tabular text-xs text-ink-3">Pagina {data.pageNumber} di {lastPage}</p>
					<a
						href={withParams({ pagina: String(data.pageNumber + 1) })}
						aria-disabled={data.pageNumber >= lastPage}
						class="flex items-center gap-1 rounded-[3px] px-2.5 py-1.5 text-xs text-ink-2 transition-colors hover:bg-panel-2/60
							{data.pageNumber >= lastPage ? 'pointer-events-none opacity-40' : ''}"
					>
						Successivi <Icon name="chevronRight" size={13} />
					</a>
				</nav>
			{/if}
		{:else}
			<EmptyState title="Nessun allenamento con questo filtro" description="Prova a togliere il filtro o ad allargare il periodo." />
		{/if}
	</div>
{/if}
