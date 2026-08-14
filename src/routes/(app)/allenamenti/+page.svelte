<script lang="ts">
	import { page } from '$app/state';
	import RangePicker from '$lib/components/RangePicker.svelte';
	import WorkoutRow from '$lib/components/WorkoutRow.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { workoutType } from '$lib/workout-types';
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
		<section class="panel grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x">
			<div class="border-line px-5 py-4 not-last:border-b sm:border-b-0">
				<p class="label">Sessioni</p>
				<p class="mt-1.5 font-mono text-xl font-medium tracking-tight text-ink">{nf0.format(totals.count)}</p>
			</div>
			<div class="border-line px-5 py-4 not-last:border-b sm:border-b-0">
				<p class="label">Tempo totale</p>
				<p class="mt-1.5 font-mono text-xl font-medium tracking-tight text-ink">{formatDuration(totals.seconds)}</p>
			</div>
			<div class="border-line px-5 py-4 not-last:border-b sm:border-b-0">
				<p class="label">Distanza</p>
				<p class="mt-1.5 font-mono text-xl font-medium tracking-tight text-ink">{nf1.format(totals.km)} <span class="text-sm text-ink-3">km</span></p>
			</div>
			<div class="border-line px-5 py-4 not-last:border-b sm:border-b-0">
				<p class="label">Energia</p>
				<p class="mt-1.5 font-mono text-xl font-medium tracking-tight text-ink">{nf0.format(totals.kcal)} <span class="text-sm text-ink-3">kcal</span></p>
			</div>
		</section>

		<!-- Filtro per disciplina, in una riga sopra l'elenco. -->
		<nav aria-label="Filtra per tipo" class="flex flex-wrap gap-1.5">
			<a
				href={withParams({ tipo: null })}
				aria-current={!data.type ? 'page' : undefined}
				class="rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors duration-150
					{!data.type ? 'bg-panel-2 text-ink' : 'text-ink-3 hover:bg-panel hover:text-ink-2'}"
			>
				Tutti
			</a>
			{#each data.types as t (t.type)}
				{@const def = workoutType(t.type)}
				{@const active = data.type === t.type}
				<a
					href={withParams({ tipo: t.type })}
					aria-current={active ? 'page' : undefined}
					class="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors duration-150
						{active ? 'bg-panel-2 text-ink' : 'text-ink-3 hover:bg-panel hover:text-ink-2'}"
				>
					<Icon name={def.icon} size={13} />
					{def.label}
					<span class="tabular text-ink-3">{t.n}</span>
				</a>
			{/each}
		</nav>

		{#if data.workouts.length}
			<section class="panel overflow-hidden">
				<ul class="divide-y divide-line">
					{#each data.workouts as workout (workout.id)}
						<li><WorkoutRow {workout} /></li>
					{/each}
				</ul>
			</section>

			{#if lastPage > 1}
				<nav aria-label="Pagine" class="flex items-center justify-between gap-3">
					<a
						href={withParams({ pagina: String(data.pageNumber - 1) })}
						aria-disabled={data.pageNumber <= 1}
						class="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-ink-2 transition-colors hover:bg-panel
							{data.pageNumber <= 1 ? 'pointer-events-none opacity-40' : ''}"
					>
						<Icon name="chevronLeft" size={13} /> Precedenti
					</a>
					<p class="tabular text-xs text-ink-3">Pagina {data.pageNumber} di {lastPage}</p>
					<a
						href={withParams({ pagina: String(data.pageNumber + 1) })}
						aria-disabled={data.pageNumber >= lastPage}
						class="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-ink-2 transition-colors hover:bg-panel
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
