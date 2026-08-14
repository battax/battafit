<script lang="ts">
	import ActivityRings from '$lib/components/ActivityRings.svelte';
	import TimeChart from '$lib/components/TimeChart.svelte';
	import HudPanel from '$lib/components/HudPanel.svelte';
	import SectionHeader from '$lib/components/SectionHeader.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import WorkoutRow from '$lib/components/WorkoutRow.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { daySummary } from '$lib/insight';
	import { todayRome } from '$lib/rehab';

	let { data } = $props();

	const nf0 = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 });
	const nf1 = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 });

	const dayLabel = $derived(
		data.day
			? new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
					new Date(data.day + 'T00:00:00Z')
				)
			: ''
	);

	const values = (metric: string) => (data.series[metric] ?? []).map((p) => p.value);

	/**
	 * L'ultimo giorno importato è quasi sempre ieri o l'altroieri: la ghiera
	 * oraria del quadrante si accende solo quando è davvero quello in corso,
	 * altrimenti mostrerebbe il tempo rimasto per chiudere obiettivi già scaduti.
	 */
	const isToday = $derived(data.day === todayRome());
	const hoursElapsed = $derived(
		isToday
			? Number(
					new Intl.DateTimeFormat('it-IT', { hour: 'numeric', hour12: false, timeZone: 'Europe/Rome' }).format(new Date())
				)
			: null
	);

	/** I tre anelli, con la percentuale che è la cifra d'apertura della pagina. */
	const rings = $derived([
		{ label: 'Movimento', value: data.today.ringMove, goal: data.today.ringMoveGoal, unit: 'kcal', dot: 'bg-move', bar: 'bg-move' },
		{ label: 'Esercizio', value: data.today.ringExercise, goal: data.today.ringExerciseGoal, unit: 'min', dot: 'bg-exercise', bar: 'bg-exercise' },
		{ label: 'In piedi', value: data.today.ringStand, goal: data.today.ringStandGoal, unit: 'ore', dot: 'bg-stand', bar: 'bg-stand' }
	]);

	function percent(value: number | null | undefined, goal: number | null | undefined): number | null {
		if (value == null || !goal) return null;
		return Math.round((value / goal) * 100);
	}

	/** Allenamenti del giorno mostrato, non gli ultimi in assoluto: la sintesi parla di quella giornata. */
	const workoutsToday = $derived(
		data.day
			? data.workouts.filter((w) => new Date(w.startedAt).toISOString().slice(0, 10) === data.day).length
			: 0
	);

	const summary = $derived(
		daySummary({
			rings: rings.map((r) => ({ value: r.value, goal: r.goal })),
			steps: data.today.steps,
			stepsBaseline: data.baselines.steps,
			sleepHours: data.today.sleepAsleep,
			workouts: workoutsToday,
			isToday
		})
	);

	const TONE: Record<string, string> = {
		good: 'text-done',
		attention: 'text-load',
		neutral: 'text-ink-3'
	};

	/** Le tre letture rapide della giornata, di pari peso fra loro. */
	const tiles = $derived([
		{ label: 'Passi', value: data.today.steps, unit: '', metric: 'steps', channel: 'motion' as const, icon: 'activity' as const, higherIsBetter: true, format: (v: number) => nf0.format(v) },
		{ label: 'Sonno', value: data.today.sleepAsleep, unit: 'h', metric: 'sleepAsleep', channel: 'bio' as const, icon: 'sleep' as const, higherIsBetter: true, format: (v: number) => nf1.format(v) },
		{ label: 'Calorie attive', value: data.today.activeEnergy, unit: 'kcal', metric: 'activeEnergy', channel: 'load' as const, icon: 'flame' as const, higherIsBetter: true, format: (v: number) => nf0.format(v) }
	]);

	/** I segni vitali: tutti sul canale biometrico, perché è il corpo che li riporta. */
	const vitals = $derived([
		{ label: 'Frequenza a riposo', metric: 'restingHr', unit: 'bpm', icon: 'heart' as const, href: '/cuore', higherIsBetter: false, format: (v: number) => nf0.format(v) },
		{ label: 'Variabilità cardiaca', metric: 'hrv', unit: 'ms', icon: 'activity' as const, href: '/cuore', higherIsBetter: true, format: (v: number) => nf0.format(v) },
		{ label: 'Peso', metric: 'weight', unit: 'kg', icon: 'body' as const, href: '/corpo', higherIsBetter: undefined, format: (v: number) => nf1.format(v) }
	]);
</script>

<svelte:head><title>Panoramica · BattaFit</title></svelte:head>

{#if data.empty}
	<PageHeader title="Panoramica" />
	<EmptyState
		icon="calendar"
		title="Non c'è ancora nessun dato"
		description="Esporta i dati da Salute sull'iPhone, poi lanciali qui dentro con la riga di comando."
	>
		<ol class="mt-2 max-w-md space-y-2 text-left text-sm text-ink-2">
			<li class="flex gap-3">
				<span class="font-mono text-ink-3">1</span>
				<span>Sull'iPhone: <strong class="text-ink">Salute → foto profilo → Esporta tutti i dati sanitari</strong>. Ci mette qualche minuto.</span>
			</li>
			<li class="flex gap-3">
				<span class="font-mono text-ink-3">2</span>
				<span>Manda a te stesso <code class="font-mono text-xs text-ink">export.zip</code> e salvalo sul computer.</span>
			</li>
			<li class="flex gap-3">
				<span class="font-mono text-ink-3">3</span>
				<span>Nella cartella del progetto: <code class="font-mono text-xs text-ink">npm run ingest -- percorso/export.zip</code></span>
			</li>
		</ol>
	</EmptyState>
{:else}
	<PageHeader title="Panoramica" meta={dayLabel} spine={data.spine} />

	<div class="space-y-gutter">
		<!--
			Il modulo di apertura, e l'unico che comanda la pagina: il quadrante a
			sinistra, le tre righe che lo spiegano a destra, la sintesi in parole
			sotto. Sono la stessa informazione letta in tre modi — forma, numero,
			frase — e stanno insieme perché servono momenti di attenzione diversi.
		-->
		<HudPanel channel="motion" class="p-5 md:p-6">
			<SectionHeader
				title="Stato di oggi"
				channel="motion"
				meta={isToday ? 'giornata in corso' : 'ultima giornata importata'}
				class="mb-5"
			/>

			<div class="flex flex-col gap-7 xl:flex-row xl:gap-8">
				<div class="flex flex-1 flex-col items-center gap-7 sm:flex-row sm:items-start sm:gap-8">
				<ActivityRings
					move={{ value: data.today.ringMove ?? null, goal: data.today.ringMoveGoal ?? null }}
					exercise={{ value: data.today.ringExercise ?? null, goal: data.today.ringExerciseGoal ?? null }}
					stand={{ value: data.today.ringStand ?? null, goal: data.today.ringStandGoal ?? null }}
					size={196}
					{hoursElapsed}
				/>

				<div class="w-full min-w-0 flex-1">
					<dl class="divide-y divide-line">
						{#each rings as ring (ring.label)}
							{@const pct = percent(ring.value, ring.goal)}
							<div class="py-3 first:pt-0 last:pb-0">
								<div class="flex items-baseline justify-between gap-4">
									<dt class="label flex items-center gap-2">
										<span class="size-2 shrink-0 rounded-full {ring.dot}"></span>
										{ring.label}
									</dt>
									<!-- La cifra d'apertura. Resta inchiostro: l'identità la porta il pallino. -->
									<dd class="display shrink-0 text-[1.75rem] leading-none {pct == null ? 'text-ink-3' : 'text-ink'}">
										{pct == null ? '—' : `${pct}%`}
									</dd>
								</div>
								<p class="mt-1.5 font-mono text-xs text-ink-3">
									{ring.value == null ? '—' : nf0.format(ring.value)} / {ring.goal ? nf0.format(ring.goal) : '—'}
									{ring.unit}
								</p>
								<!--
									La barra ripete la percentuale in forma lunga. Non è un doppione
									della cifra: la cifra si legge, la barra si confronta con le altre
									due senza fare aritmetica, ed è il motivo per cui le tre stanno
									incolonnate.
								-->
								<div class="mt-2.5 h-1 rounded-full bg-panel-2">
									<div
										class="h-full rounded-full {ring.bar} [animation:fill_.9s_var(--ease-settle)_both]"
										style="width: {Math.min(100, pct ?? 0)}%; transform-origin: left"
									></div>
								</div>
							</div>
						{/each}
					</dl>
				</div>
				</div>

				<!--
					La lettura in parole. Su schermo largo prende la colonna che gli
					anelli lascerebbero vuota; sotto i 1280px torna in fondo, perché una
					colonna da centottanta pixel spezzerebbe ogni frase su tre righe.
				-->
				{#if summary.length}
					<div class="border-line pt-4 xl:w-72 xl:shrink-0 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-8 border-t">
						<p class="label mb-3">Come sta andando</p>
						<ul class="space-y-2.5">
							{#each summary as clause (clause.text)}
								<li class="flex items-baseline gap-2.5 text-sm text-ink-2">
									<span class="mt-1.5 size-1.5 shrink-0 rounded-full bg-current {TONE[clause.tone]}"></span>
									<span class="min-w-0">{clause.text}</span>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>
		</HudPanel>

		<!-- Tre letture rapide, di pari peso fra loro. -->
		<div class="grid gap-gutter sm:grid-cols-3">
			{#each tiles as tile (tile.metric)}
				<MetricCard
					label={tile.label}
					value={tile.value}
					unit={tile.unit}
					icon={tile.icon}
					channel={tile.channel}
					format={tile.format}
					series={values(tile.metric)}
					baseline={data.baselines[tile.metric]}
					higherIsBetter={tile.higherIsBetter}
				/>
			{/each}
		</div>

		<!--
			Il pannello che rompe il gutter. Uno solo per pagina: se fossero due,
			nessuno dei due comanderebbe più niente.
		-->
		<HudPanel channel="motion" bleed class="py-5">
			<SectionHeader title="Passi negli ultimi 30 giorni" channel="motion" class="mb-4 px-4 md:px-8">
				{#snippet actions()}
					<a href="/attivita" class="flex items-center gap-0.5 text-xs text-ink-3 transition-colors hover:text-ink-2">
						Attività <Icon name="chevronRight" size={13} />
					</a>
				{/snippet}
			</SectionHeader>
			<div class="px-4 md:px-8">
				<TimeChart
					data={data.series.steps ?? []}
					mark="bar"
					color="var(--color-motion)"
					height={210}
					label="Passi al giorno negli ultimi 30 giorni"
					format={(v) => nf0.format(v)}
					unit="passi"
					reference={data.baselines.steps
						? { value: data.baselines.steps, label: `media ${nf0.format(data.baselines.steps)}` }
						: null}
				/>
			</div>
		</HudPanel>

		<!-- I segni vitali. Tre schede uguali fra loro, tutte sul canale biometrico. -->
		<div class="grid gap-gutter sm:grid-cols-3">
			{#each vitals as item (item.metric)}
				{@const points = data.series[item.metric] ?? []}
				{@const current = data.today[item.metric] ?? points.filter((p) => p.value != null).at(-1)?.value ?? null}
				<MetricCard
					label={item.label}
					value={current}
					unit={item.unit}
					icon={item.icon}
					channel="bio"
					href={item.href}
					format={item.format}
					series={points.map((p) => p.value)}
					baseline={data.baselines[item.metric]}
					higherIsBetter={item.higherIsBetter}
				/>
			{/each}
		</div>

		<!-- Elenco, non schede: gli allenamenti sono righe di un registro. -->
		<HudPanel channel="motion" class="overflow-hidden">
			<SectionHeader title="Ultimi allenamenti" channel="motion" class="p-5 pb-3">
				{#snippet actions()}
					<a href="/allenamenti" class="flex items-center gap-0.5 text-xs text-ink-3 transition-colors hover:text-ink-2">
						Tutti <Icon name="chevronRight" size={13} />
					</a>
				{/snippet}
			</SectionHeader>

			{#if data.workouts.length}
				<ul class="divide-y divide-line border-t border-line">
					{#each data.workouts as workout (workout.id)}
						<li><WorkoutRow {workout} /></li>
					{/each}
				</ul>
			{:else}
				<p class="px-5 pb-5 text-sm text-ink-3">Nessun allenamento registrato.</p>
			{/if}
		</HudPanel>
	</div>
{/if}
