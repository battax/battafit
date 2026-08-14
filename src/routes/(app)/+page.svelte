<script lang="ts">
	import ActivityRings from '$lib/components/ActivityRings.svelte';
	import TimeChart from '$lib/components/TimeChart.svelte';
	import Sparkline from '$lib/components/Sparkline.svelte';
	import Delta from '$lib/components/Delta.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import WorkoutRow from '$lib/components/WorkoutRow.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';

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

	/** I tre anelli, con la percentuale che è la cifra d'apertura della pagina. */
	const rings = $derived([
		{ label: 'Movimento', value: data.today.ringMove, goal: data.today.ringMoveGoal, unit: 'kcal', color: 'var(--color-move)' },
		{ label: 'Esercizio', value: data.today.ringExercise, goal: data.today.ringExerciseGoal, unit: 'min', color: 'var(--color-exercise)' },
		{ label: 'In piedi', value: data.today.ringStand, goal: data.today.ringStandGoal, unit: 'ore', color: 'var(--color-stand)' }
	]);

	function percent(value: number | null | undefined, goal: number | null | undefined): number | null {
		if (value == null || !goal) return null;
		return Math.round((value / goal) * 100);
	}

	/** Le tre tessere quiete: i numeri di oggi, senza gerarchia fra loro. */
	const tiles = $derived([
		{ label: 'Passi', value: data.today.steps, unit: '', metric: 'steps', color: 'var(--color-suit-red)', higherIsBetter: true, format: (v: number) => nf0.format(v) },
		{ label: 'Sonno', value: data.today.sleepAsleep, unit: 'h', metric: 'sleepAsleep', color: 'var(--color-suit-blue)', higherIsBetter: true, format: (v: number) => nf1.format(v) },
		{ label: 'Calorie attive', value: data.today.activeEnergy, unit: 'kcal', metric: 'activeEnergy', color: 'var(--color-street)', higherIsBetter: true, format: (v: number) => nf0.format(v) }
	]);

	/** I segni vitali: una riga sola divisa in tre, non tre schede uguali alle precedenti. */
	const vitals = $derived([
		{ label: 'Frequenza a riposo', metric: 'restingHr', unit: 'bpm', color: 'var(--color-rose)', href: '/cuore', higherIsBetter: false, format: (v: number) => nf0.format(v) },
		{ label: 'Variabilità cardiaca', metric: 'hrv', unit: 'ms', color: 'var(--color-goblin)', href: '/cuore', higherIsBetter: true, format: (v: number) => nf0.format(v) },
		{ label: 'Peso', metric: 'weight', unit: 'kg', color: 'var(--color-oscorp)', href: '/corpo', higherIsBetter: undefined, format: (v: number) => nf1.format(v) }
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
			L'apertura è una cosa sola: gli anelli, che sono l'artefatto vero
			dell'Apple Watch. I numeri della giornata sono scesi fra le tessere qui
			sotto — nell'apertura facevano quattro idee in competizione.
		-->
		<section class="panel flex flex-col items-center gap-7 p-6 sm:flex-row sm:gap-10 sm:p-7">
			<ActivityRings
				move={{ value: data.today.ringMove ?? null, goal: data.today.ringMoveGoal ?? null }}
				exercise={{ value: data.today.ringExercise ?? null, goal: data.today.ringExerciseGoal ?? null }}
				stand={{ value: data.today.ringStand ?? null, goal: data.today.ringStandGoal ?? null }}
				size={172}
				showLegend={false}
			/>

			<dl class="w-full flex-1 divide-y divide-line">
				{#each rings as ring (ring.label)}
					{@const pct = percent(ring.value, ring.goal)}
					<div class="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
						<div class="min-w-0">
							<dt class="label flex items-center gap-2">
								<span class="size-2 shrink-0 rounded-full" style="background: {ring.color}"></span>
								{ring.label}
							</dt>
							<dd class="mt-1.5 font-mono text-xs text-ink-2">
								{ring.value == null ? '—' : nf0.format(ring.value)} / {ring.goal ? nf0.format(ring.goal) : '—'}
								{ring.unit}
							</dd>
						</div>
						<!-- La cifra d'apertura. Resta inchiostro: l'identità la porta il pallino. -->
						<span class="display shrink-0 text-[2.25rem] leading-none {pct == null ? 'text-ink-3' : 'text-ink'}">
							{pct == null ? '—' : `${pct}%`}
						</span>
					</div>
				{/each}
			</dl>
		</section>

		<!-- Tre tessere quiete, di pari peso fra loro. -->
		<div class="grid gap-gutter sm:grid-cols-3">
			{#each tiles as tile (tile.metric)}
				<div class="panel p-4">
					<p class="label">{tile.label}</p>
					<p class="mt-2 flex items-baseline gap-1.5">
						<span class="font-mono text-2xl font-medium tracking-tight {tile.value == null ? 'text-ink-3' : 'text-ink'}">
							{tile.value == null ? '—' : tile.format(tile.value)}
						</span>
						{#if tile.unit && tile.value != null}
							<span class="text-xs text-ink-3">{tile.unit}</span>
						{/if}
					</p>
					<div class="mt-2.5 flex items-end justify-between gap-3">
						<Delta
							current={tile.value}
							baseline={data.baselines[tile.metric]}
							higherIsBetter={tile.higherIsBetter}
							label="rispetto alla media di 30 giorni"
						/>
						<Sparkline values={values(tile.metric)} color={tile.color} width={78} height={22} />
					</div>
				</div>
			{/each}
		</div>

		<!--
			La vignetta che rompe il gutter. Una sola per pagina: se fossero due,
			nessuna delle due comanderebbe più niente.
		-->
		<section class="panel panel-bleed py-5">
			<div class="mb-4 flex items-baseline justify-between gap-3 px-4 md:px-8">
				<h2 class="text-sm font-medium text-ink">Passi negli ultimi 30 giorni</h2>
				<a href="/attivita" class="flex items-center gap-0.5 text-xs text-ink-3 transition-colors hover:text-ink-2">
					Attività <Icon name="chevronRight" size={13} />
				</a>
			</div>
			<div class="px-4 md:px-8">
				<TimeChart
					data={data.series.steps ?? []}
					mark="bar"
					color="var(--color-suit-red)"
					height={210}
					label="Passi al giorno negli ultimi 30 giorni"
					format={(v) => nf0.format(v)}
					unit="passi"
					reference={data.baselines.steps
						? { value: data.baselines.steps, label: `media ${nf0.format(data.baselines.steps)}` }
						: null}
				/>
			</div>
		</section>

		<!-- I segni vitali: un pannello diviso in tre, non tre schede identiche alla riga di sopra. -->
		<section class="panel grid divide-line sm:grid-cols-3 sm:divide-x">
			{#each vitals as item (item.metric)}
				{@const points = data.series[item.metric] ?? []}
				{@const current = data.today[item.metric] ?? points.filter((p) => p.value != null).at(-1)?.value ?? null}
				<a href={item.href} class="group block p-4 not-last:border-b border-line transition-colors duration-200 hover:bg-panel-2/40 sm:not-last:border-b-0">
					<div class="flex items-baseline justify-between gap-2">
						<span class="label">{item.label}</span>
						<Icon name="chevronRight" size={13} class="text-ink-3 transition-colors group-hover:text-ink-2" />
					</div>
					<p class="mt-2 flex items-baseline gap-1.5">
						<span class="font-mono text-2xl font-medium tracking-tight {current == null ? 'text-ink-3' : 'text-ink'}">
							{current == null ? '—' : item.format(current)}
						</span>
						<span class="text-xs text-ink-3">{item.unit}</span>
					</p>
					<div class="mt-2.5 flex items-end justify-between gap-3">
						<Delta
							{current}
							baseline={data.baselines[item.metric]}
							higherIsBetter={item.higherIsBetter}
							label="rispetto alla media di 30 giorni"
						/>
						<Sparkline values={points.map((p) => p.value)} color={item.color} width={78} height={22} />
					</div>
				</a>
			{/each}
		</section>

		<!-- Elenco, non schede: gli allenamenti sono righe di un registro. -->
		<section class="panel overflow-hidden">
			<div class="flex items-baseline justify-between gap-3 p-5 pb-3">
				<h2 class="text-sm font-medium text-ink">Ultimi allenamenti</h2>
				<a href="/allenamenti" class="flex items-center gap-0.5 text-xs text-ink-3 transition-colors hover:text-ink-2">
					Tutti <Icon name="chevronRight" size={13} />
				</a>
			</div>

			{#if data.workouts.length}
				<ul class="divide-y divide-line border-t border-line">
					{#each data.workouts as workout (workout.id)}
						<li><WorkoutRow {workout} /></li>
					{/each}
				</ul>
			{:else}
				<p class="px-5 pb-5 text-sm text-ink-3">Nessun allenamento registrato.</p>
			{/if}
		</section>
	</div>
{/if}
