<script lang="ts">
	import Icon from './Icon.svelte';
	import { workoutType } from '$lib/workout-types';
	import { formatDuration, formatPace } from '$lib/metrics';

	/**
	 * Una riga del registro allenamenti.
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
	}

	let { workout }: Props = $props();

	const def = $derived(workoutType(workout.type));
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
	class="group flex items-center gap-3 px-5 py-3 transition-colors duration-150 hover:bg-panel-2/60"
>
	<span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-panel-2 text-ink-2 transition-colors duration-150 group-hover:text-ink">
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

	<dl class="flex shrink-0 items-center gap-4 text-right font-mono text-xs sm:gap-6">
		<div>
			<dt class="sr-only">Durata</dt>
			<dd class="text-sm text-ink">{formatDuration(workout.durationSec)}</dd>
		</div>

		{#if workout.distanceKm}
			<div class="hidden sm:block">
				<dt class="sr-only">Distanza</dt>
				<dd class="text-sm text-ink">{nf2.format(workout.distanceKm)} <span class="text-ink-3">km</span></dd>
				<dd class="mt-0.5 text-[11px] text-ink-3">{formatPace(workout.distanceKm, workout.durationSec)} /km</dd>
			</div>
		{/if}

		{#if workout.energyKcal}
			<div class="hidden md:block">
				<dt class="sr-only">Calorie</dt>
				<dd class="text-sm text-ink">{nf0.format(workout.energyKcal)} <span class="text-ink-3">kcal</span></dd>
			</div>
		{/if}

		{#if workout.avgHr}
			<div class="hidden lg:block">
				<dt class="sr-only">Frequenza media</dt>
				<dd class="text-sm text-ink">{nf0.format(workout.avgHr)} <span class="text-ink-3">bpm</span></dd>
			</div>
		{/if}
	</dl>

	<Icon name="chevronRight" size={15} class="shrink-0 text-ink-3 transition-colors duration-150 group-hover:text-ink-2" />
</a>
