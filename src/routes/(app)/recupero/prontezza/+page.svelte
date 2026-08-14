<script lang="ts">
	import RecoveryScore from '$lib/components/RecoveryScore.svelte';
	import RehabilitationCard from '$lib/components/RehabilitationCard.svelte';
	import TimeChart from '$lib/components/TimeChart.svelte';
	import HudPanel from '$lib/components/HudPanel.svelte';
	import SectionHeader from '$lib/components/SectionHeader.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { BASELINE_DAYS } from '$lib/readiness';

	let { data } = $props();

	const dayLabel = $derived(
		data.sensorDay
			? new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
					new Date(data.sensorDay + 'T00:00:00Z')
				)
			: undefined
	);

	const trendHasData = $derived(data.trend.filter((p) => p.value != null).length > 1);
</script>

<svelte:head><title>Prontezza · Recupero · BattaFit</title></svelte:head>

{#if !data.readiness}
	<EmptyState
		icon="heart"
		title="Nessun dato dai sensori"
		description="La prontezza si costruisce su variabilità cardiaca, frequenza a riposo, sonno e calorie attive. Importa un export di Salute e ricompare."
	/>
{:else}
	<div class="space-y-gutter">
		<RecoveryScore readiness={data.readiness} {dayLabel} />

		<!--
			L'andamento è l'unica cosa che rende leggibile un indice relativo: un
			+8 isolato non dice se stai risalendo o rientrando da un +15.
		-->
		<HudPanel channel="bio" bleed class="py-5">
			<SectionHeader
				title="Andamento dello scostamento"
				channel="bio"
				meta="ultimi 30 giorni"
				class="mb-4 px-4 md:px-8"
			/>
			<div class="px-4 md:px-8">
				{#if trendHasData}
					<TimeChart
						data={data.trend}
						mark="line"
						color="var(--color-bio)"
						height={200}
						zeroBased={false}
						format={(v) => (v > 0 ? `+${Math.round(v)}` : String(Math.round(v)))}
						unit="punti"
						label="Scostamento dalla base personale, ultimi 30 giorni"
						areaBase={0}
						reference={{ value: 0, label: "la tua base" }}
					/>
				{:else}
					<p class="text-sm text-ink-3">
						Servono almeno {BASELINE_DAYS} giornate di storia prima che l'indice cominci a esistere, e poi qualche
						giorno perché abbia una forma.
					</p>
				{/if}
			</div>
		</HudPanel>

		{#if data.knee}
			<RehabilitationCard knee={data.knee} />
		{/if}
	</div>
{/if}
