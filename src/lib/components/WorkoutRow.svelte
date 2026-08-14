<script lang="ts">
	import Icon from './Icon.svelte';
	import { workoutType, workoutTone } from '$lib/workout-types';
	import { formatDuration, formatPace } from '$lib/metrics';

	/**
	 * Una riga del registro allenamenti.
	 *
	 * La disciplina si riconosce da tre cose insieme — la barretta colorata a
	 * sinistra, l'icona e il nome — perché scorrendo cinquanta righe si legge
	 * quella che si intercetta per prima, e non è sempre la stessa.
	 *
	 * Le colonne di destra compaiono man mano che c'è spazio: su telefono
	 * restano tipo, data e durata, che è quello che serve per riconoscere la
	 * sessione; il resto è dettaglio e sta nella pagina dell'allenamento.
	 */

	interface Props {
		workout: {
			id: string;
			type: string;
			startedAt: Date | string;
			durationSec: number;
			distanceKm?: number | null;
			energyKcal?: number | null;
			avgHr?: number | null;
			hasRoute?: boolean;
			indoor?: boolean;
		};
		/** La sessione aperta: prende il bordo tecnico e non è più un collegamento. */
		selected?: boolean;
	}

	let { workout, selected = false }: Props = $props();

	const def = $derived(workoutType(workout.type));
	const tone = $derived(workoutTone(def));
	const started = $derived(new Date(workout.startedAt));

	const when = $derived(
		new Intl.DateTimeFormat('it-IT', {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		}).format(started)
	);

	const nf0 = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 });
	const nf2 = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 });
</script>

<a
	href="/allenamenti/{workout.id}"
	aria-current={selected ? 'page' : undefined}
	class="group relative flex items-center gap-3 py-3 pr-5 pl-6 transition-colors duration-150
		{selected ? 'bg-panel-2/70' : 'hover:bg-panel-2/45'}"
>
	<!-- La barretta della disciplina. Sulla riga aperta è piena, sulle altre è un accenno. -->
	<span
		class="absolute inset-y-0 left-0 w-[3px] transition-opacity duration-150 {selected
			? 'opacity-100'
			: 'opacity-45 group-hover:opacity-80'}"
		style="background: {tone}"
	></span>

	<span
		class="flex size-9 shrink-0 items-center justify-center rounded-[3px] bg-panel-2"
		style="color: {tone}"
	>
		<Icon name={def.icon} size={18} />
	</span>

	<div class="min-w-0 flex-1">
		<p class="truncate text-sm font-medium text-ink">{def.label}</p>
		<p class="mt-0.5 flex items-center gap-1.5 font-mono text-xs text-ink-3">
			{when}
			{#if workout.hasRoute}
				<Icon name="route" size={12} title="Con traccia GPS" />
			{/if}
		</p>
	</div>

	<!--
		La gerarchia delle colonne è fissa: la durata è la sola misura che ogni
		allenamento ha, quindi è la sola sempre in inchiostro pieno. Le altre
		portano l'unità in grigio, che è quello che le fa leggere come dettaglio.
	-->
	<dl class="flex shrink-0 items-center gap-4 text-right font-mono sm:gap-6">
		<div>
			<dt class="sr-only">Durata</dt>
			<dd class="text-sm font-medium text-ink">{formatDuration(workout.durationSec)}</dd>
		</div>

		{#if workout.distanceKm}
			<div class="hidden sm:block">
				<dt class="sr-only">Distanza</dt>
				<dd class="text-sm text-ink-2">{nf2.format(workout.distanceKm)} <span class="text-xs text-ink-3">km</span></dd>
				<dd class="mt-0.5 text-[11px] text-ink-3">{formatPace(workout.distanceKm, workout.durationSec)} /km</dd>
			</div>
		{/if}

		{#if workout.energyKcal}
			<div class="hidden md:block">
				<dt class="sr-only">Calorie</dt>
				<dd class="text-sm text-ink-2">{nf0.format(workout.energyKcal)} <span class="text-xs text-ink-3">kcal</span></dd>
			</div>
		{/if}

		{#if workout.avgHr}
			<div class="hidden lg:block">
				<dt class="sr-only">Frequenza media</dt>
				<dd class="text-sm text-ink-2">{nf0.format(workout.avgHr)} <span class="text-xs text-ink-3">bpm</span></dd>
			</div>
		{/if}
	</dl>

	<Icon name="chevronRight" size={15} class="shrink-0 text-ink-3 transition-colors duration-150 group-hover:text-ink-2" />
</a>
