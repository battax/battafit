<script lang="ts">
	import RouteTrace from '$lib/components/RouteTrace.svelte';
	import EffortChart from '$lib/components/EffortChart.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { workoutType } from '$lib/workout-types';
	import { formatDuration, formatPace } from '$lib/metrics';

	let { data } = $props();

	const w = $derived(data.workout);
	const def = $derived(workoutType(w.type));

	const nf0 = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 });
	const nf2 = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 });

	const when = $derived(
		new Intl.DateTimeFormat('it-IT', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(new Date(w.startedAt))
	);

	/** Solo le voci che hanno davvero un valore: una griglia di trattini non informa. */
	const stats = $derived(
		[
			{ label: 'Durata', value: formatDuration(w.durationSec) },
			w.distanceKm ? { label: 'Distanza', value: `${nf2.format(w.distanceKm)} km` } : null,
			w.distanceKm ? { label: 'Passo medio', value: `${formatPace(w.distanceKm, w.durationSec)} /km` } : null,
			w.energyKcal ? { label: 'Energia', value: `${nf0.format(w.energyKcal)} kcal` } : null,
			w.avgHr ? { label: 'Frequenza media', value: `${nf0.format(w.avgHr)} bpm` } : null,
			w.maxHr ? { label: 'Frequenza massima', value: `${nf0.format(w.maxHr)} bpm` } : null,
			w.elevationM ? { label: 'Dislivello', value: `${nf0.format(w.elevationM)} m` } : null
		].filter((s): s is { label: string; value: string } => s !== null)
	);
</script>

<svelte:head><title>{def.label} · BattaFit</title></svelte:head>

<nav class="mb-5 flex items-center justify-between gap-3">
	<a
		href="/allenamenti"
		class="flex items-center gap-1 text-xs text-ink-3 transition-colors hover:text-ink-2"
	>
		<Icon name="chevronLeft" size={13} /> Allenamenti
	</a>

	<div class="flex items-center gap-1">
		<a
			href={data.neighbours.prev ? `/allenamenti/${data.neighbours.prev}` : '#'}
			aria-disabled={!data.neighbours.prev}
			aria-label="Allenamento precedente"
			class="rounded-md p-1.5 text-ink-3 transition-colors hover:bg-panel hover:text-ink-2
				{data.neighbours.prev ? '' : 'pointer-events-none opacity-30'}"
		>
			<Icon name="chevronLeft" size={16} />
		</a>
		<a
			href={data.neighbours.next ? `/allenamenti/${data.neighbours.next}` : '#'}
			aria-disabled={!data.neighbours.next}
			aria-label="Allenamento successivo"
			class="rounded-md p-1.5 text-ink-3 transition-colors hover:bg-panel hover:text-ink-2
				{data.neighbours.next ? '' : 'pointer-events-none opacity-30'}"
		>
			<Icon name="chevronRight" size={16} />
		</a>
	</div>
</nav>

<header class="mb-5 flex items-start gap-3.5">
	<span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-panel text-ink-2">
		<Icon name={def.icon} size={22} />
	</span>
	<div class="min-w-0">
		<h1 class="display text-[1.5rem] text-ink sm:text-[1.75rem]">{def.label}</h1>
		<p class="mt-1 text-sm text-ink-2 first-letter:uppercase">
			{when}
			{#if w.indoor}<span class="text-ink-3"> · al chiuso</span>{/if}
		</p>
	</div>
</header>

<div class="space-y-gutter">
	<section class="panel grid grid-cols-2 divide-line sm:grid-cols-3 lg:grid-cols-4">
		{#each stats as stat (stat.label)}
			<div class="border-line px-5 py-4 not-last:border-b sm:border-b-0 sm:not-last:border-r">
				<p class="label">{stat.label}</p>
				<p class="mt-1.5 font-mono text-lg font-medium tracking-tight text-ink">{stat.value}</p>
			</div>
		{/each}
	</section>

	{#if w.route?.length}
		<!-- Il percorso comanda la pagina: è la vignetta che rompe il gutter. -->
		<section class="panel panel-bleed py-5">
			<div class="mb-4 flex items-baseline justify-between gap-3 px-4 md:px-8">
				<h2 class="text-sm font-medium text-ink">Percorso</h2>
				<p class="font-mono text-xs text-ink-3">{w.route.length} punti</p>
			</div>
			<div class="px-4 md:px-8">
				<RouteTrace route={w.route} height={340} color="var(--color-electro)" />
			</div>
		</section>
	{/if}

	{#if data.samples.length > 1}
		<section class="panel p-5">
			<div class="mb-4 flex items-baseline justify-between gap-3">
				<h2 class="text-sm font-medium text-ink">Frequenza cardiaca</h2>
				{#if w.maxHr}
					<p class="font-mono text-xs text-ink-3">picco {nf0.format(w.maxHr)} bpm</p>
				{/if}
			</div>
			<EffortChart samples={data.samples} average={w.avgHr} height={220} />
		</section>
	{/if}
</div>
