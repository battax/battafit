<script lang="ts">
	import RouteTrace from '$lib/components/RouteTrace.svelte';
	import EffortChart from '$lib/components/EffortChart.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import HudPanel from '$lib/components/HudPanel.svelte';
	import SectionHeader from '$lib/components/SectionHeader.svelte';
	import { workoutType, workoutTone } from '$lib/workout-types';
	import { formatDuration, formatPace } from '$lib/metrics';

	let { data } = $props();

	const w = $derived(data.workout);
	const def = $derived(workoutType(w.type));
	const tone = $derived(workoutTone(def));

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

	/**
	 * Lo scarto dal solito di questa disciplina, in percentuale.
	 *
	 * Non porta un giudizio: una corsa più lunga della media non è né buona né
	 * cattiva, e a tre mesi da un'operazione può essere l'una o l'altra cosa a
	 * seconda di quello che ha detto il fisioterapista. Qui si dice soltanto di
	 * quanto si discosta, e resta in grigio.
	 */
	function versusUsual(
		value: number | null | undefined,
		usual: { value: number; n: number } | null
	): { text: string; n: number } | null {
		if (value == null || usual == null || usual.value === 0) return null;
		const pct = ((value - usual.value) / usual.value) * 100;
		if (Math.abs(pct) < 3) return { text: 'come al solito', n: usual.n };
		return { text: `${pct > 0 ? '+' : '−'}${nf0.format(Math.abs(pct))}% sul solito`, n: usual.n };
	}

	/** Solo le voci che hanno davvero un valore: una griglia di trattini non informa. */
	const stats = $derived(
		[
			{ label: 'Durata', value: formatDuration(w.durationSec), vs: versusUsual(w.durationSec, data.usual.durationSec) },
			w.distanceKm
				? { label: 'Distanza', value: `${nf2.format(w.distanceKm)} km`, vs: versusUsual(w.distanceKm, data.usual.distanceKm) }
				: null,
			w.distanceKm
				? { label: 'Passo medio', value: `${formatPace(w.distanceKm, w.durationSec)} /km`, vs: null }
				: null,
			w.energyKcal
				? { label: 'Energia', value: `${nf0.format(w.energyKcal)} kcal`, vs: versusUsual(w.energyKcal, data.usual.energyKcal) }
				: null,
			w.avgHr
				? { label: 'Frequenza media', value: `${nf0.format(w.avgHr)} bpm`, vs: versusUsual(w.avgHr, data.usual.avgHr) }
				: null,
			w.maxHr ? { label: 'Frequenza massima', value: `${nf0.format(w.maxHr)} bpm`, vs: null } : null,
			w.elevationM ? { label: 'Dislivello', value: `${nf0.format(w.elevationM)} m`, vs: null } : null
		].filter((s) => s !== null)
	);

	/** Quante sessioni precedenti sostengono il confronto: senza, "il solito" non si sa di cosa parli. */
	const comparedOn = $derived(
		Math.max(
			data.usual.durationSec?.n ?? 0,
			data.usual.distanceKm?.n ?? 0,
			data.usual.energyKcal?.n ?? 0,
			data.usual.avgHr?.n ?? 0
		)
	);
</script>

<svelte:head><title>{def.label} · BattaFit</title></svelte:head>

<nav class="mb-5 flex items-center justify-between gap-3">
	<a href="/allenamenti" class="flex items-center gap-1 text-xs text-ink-3 transition-colors hover:text-ink-2">
		<Icon name="chevronLeft" size={13} /> Allenamenti
	</a>

	<div class="flex items-center gap-1">
		<a
			href={data.neighbours.prev ? `/allenamenti/${data.neighbours.prev}` : '#'}
			aria-disabled={!data.neighbours.prev}
			aria-label="Allenamento precedente"
			class="rounded-[3px] p-1.5 text-ink-3 transition-colors hover:bg-panel-2/60 hover:text-ink-2
				{data.neighbours.prev ? '' : 'pointer-events-none opacity-30'}"
		>
			<Icon name="chevronLeft" size={16} />
		</a>
		<a
			href={data.neighbours.next ? `/allenamenti/${data.neighbours.next}` : '#'}
			aria-disabled={!data.neighbours.next}
			aria-label="Allenamento successivo"
			class="rounded-[3px] p-1.5 text-ink-3 transition-colors hover:bg-panel-2/60 hover:text-ink-2
				{data.neighbours.next ? '' : 'pointer-events-none opacity-30'}"
		>
			<Icon name="chevronRight" size={16} />
		</a>
	</div>
</nav>

<header class="mb-5 flex items-start gap-3.5">
	<span class="flex size-11 shrink-0 items-center justify-center rounded-[3px] bg-panel-2" style="color: {tone}">
		<Icon name={def.icon} size={22} />
	</span>
	<div class="min-w-0">
		<h1 class="display text-[1.375rem] text-ink sm:text-[1.625rem]">{def.label}</h1>
		<p class="mt-1.5 text-sm text-ink-2 first-letter:uppercase">
			{when}
			{#if w.indoor}<span class="text-ink-3"> · al chiuso</span>{/if}
		</p>
	</div>
</header>

<div class="space-y-gutter">
	<!--
		Le misure della sessione, ognuna con lo scarto dal solito di questa
		disciplina. Il paragone sta sotto il numero e non in una tabella a parte,
		perché la domanda "è andata meglio del solito?" si fa su una misura alla
		volta, non su tutte insieme.
	-->
	<HudPanel channel="motion" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
		{#each stats as stat (stat.label)}
			<div class="border-line px-5 py-4 not-last:border-b sm:border-b-0 sm:not-last:border-r">
				<p class="label">{stat.label}</p>
				<p class="mt-1.5 font-mono text-lg font-medium tracking-tight text-ink">{stat.value}</p>
				{#if stat.vs}
					<p class="mt-1 font-mono text-[11px] text-ink-3">{stat.vs.text}</p>
				{/if}
			</div>
		{/each}
	</HudPanel>

	{#if comparedOn >= 2}
		<p class="text-xs text-ink-3">
			«Il solito» è la media delle ultime {comparedOn}
			{comparedOn === 1 ? 'sessione' : 'sessioni'} di {def.label.toLowerCase()}, non di tutte quelle registrate.
		</p>
	{/if}

	{#if w.route?.length}
		<!-- Il percorso comanda la pagina: è il pannello che rompe il gutter. -->
		<HudPanel channel="motion" bleed class="py-5">
			<SectionHeader
				title="Percorso"
				channel="motion"
				meta="{w.route.length} punti"
				class="mb-4 px-4 md:px-8"
			/>
			<div class="px-4 md:px-8">
				<RouteTrace route={w.route} height={340} color="var(--color-s7)" />
			</div>
		</HudPanel>
	{/if}

	{#if data.samples.length > 1}
		<HudPanel channel="bio" class="p-5">
			<SectionHeader
				title="Frequenza cardiaca"
				channel="bio"
				meta={w.maxHr ? `picco ${nf0.format(w.maxHr)} bpm` : undefined}
				class="mb-4"
			/>
			<EffortChart samples={data.samples} average={w.avgHr} height={220} />
		</HudPanel>
	{/if}
</div>
