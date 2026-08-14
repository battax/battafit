<script lang="ts">
	import CircularGauge from './CircularGauge.svelte';
	import HudPanel from './HudPanel.svelte';
	import Icon from './Icon.svelte';
	import { BAND_LABEL, type Readiness } from '$lib/readiness';

	/**
	 * Lo scostamento di oggi dalla propria base, con tutto quello che lo compone.
	 *
	 * I contributi non sono un dettaglio da nascondere dietro un pulsante: sono
	 * la ragione per cui il numero al centro è credibile. Un indice che non si
	 * può smontare è un oracolo, e un oracolo su un ginocchio operato è
	 * esattamente quello che questa app ha deciso di non essere.
	 *
	 * Anche i contributi esclusi restano in elenco, con il motivo. Toglierli
	 * farebbe sembrare l'indice più solido di quanto è.
	 */

	interface Props {
		readiness: Readiness;
		/** Il giorno a cui si riferisce, già scritto per esteso. */
		dayLabel?: string;
	}

	let { readiness, dayLabel }: Props = $props();

	const nf0 = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 });
	const nf1 = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 });

	/**
	 * Sopra la base è blu, sotto è oro. Il verde non compare: qui non c'è niente
	 * di completato, e questa palette usa il verde per quello soltanto.
	 */
	const color = $derived(
		readiness.band === 'sopra'
			? 'var(--color-bio)'
			: readiness.band === 'sotto'
				? 'var(--color-load)'
				: 'var(--color-ink-2)'
	);

	const EXCLUDED_REASON = {
		'nessun-dato': 'non registrato oggi',
		'base-insufficiente': 'storia troppo corta'
	} as const;

	function fmt(value: number | null, unit: string): string {
		if (value == null) return '—';
		const n = unit === 'h' ? nf1.format(value) : nf0.format(value);
		return `${n} ${unit}`;
	}
</script>

<HudPanel channel={readiness.band === 'sotto' ? 'load' : 'bio'} class="p-5 md:p-6">
	<div class="flex flex-col items-center gap-7 lg:flex-row lg:items-start lg:gap-9">
		<CircularGauge
			value={readiness.index}
			min={-20}
			max={20}
			origin="centre"
			size={208}
			{color}
			ticks={9}
			minLabel="−20"
			maxLabel="+20"
			label="Scostamento dalla base personale: {readiness.index ?? 'non calcolabile'}"
		>
			{#if readiness.index == null}
				<p class="font-mono text-2xl text-ink-3">—</p>
				<p class="mt-2 text-xs text-balance text-ink-3">Storia troppo corta per una base</p>
			{:else}
				<p class="display text-[2.5rem] leading-none text-ink">
					{readiness.index > 0 ? '+' : readiness.index < 0 ? '−' : ''}{Math.abs(readiness.index)}
				</p>
				<p class="mt-2 text-xs text-balance" style="color: {color}">{BAND_LABEL[readiness.band!]}</p>
				<p class="mt-1.5 font-mono text-[10px] text-ink-3">{readiness.used} contributi su 4</p>
			{/if}
		</CircularGauge>

		<div class="w-full min-w-0 flex-1">
			<div class="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
				<h2 class="label">Da cosa viene</h2>
				{#if dayLabel}<p class="font-mono text-xs text-ink-3">{dayLabel}</p>{/if}
			</div>

			<!--
				Due colonne su schermo largo. In colonna unica, dentro un pannello da
				mille pixel, l'etichetta e la sua percentuale finivano ai due capi
				opposti della riga e non si leggevano più come la stessa cosa.
			-->
			<dl class="grid gap-x-9 sm:grid-cols-2">
				{#each readiness.contributions as c (c.key)}
					<div
						class="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line py-3
							first:border-t-0 first:pt-0 sm:nth-2:border-t-0 sm:nth-2:pt-0"
					>
						<div class="min-w-0 flex-1">
							<dt class="flex items-baseline gap-2 text-sm {c.excluded ? 'text-ink-3' : 'text-ink'}">
								{c.label}
								{#if !c.excluded}
									<span class="font-mono text-[10px] text-ink-3">
										peso {nf0.format(c.effectiveWeight * 100)}%
									</span>
								{/if}
							</dt>
							<dd class="mt-0.5 font-mono text-xs text-ink-3">
								{#if c.excluded}
									{EXCLUDED_REASON[c.excluded]}, escluso dal conto
								{:else}
									{fmt(c.value, c.unit)} · base {fmt(c.baseline, c.unit)}
								{/if}
							</dd>
						</div>

						{#if !c.excluded && c.deviationPct != null}
							{@const favourable = (c.signed ?? 0) > 0}
							<div class="flex shrink-0 items-center gap-2.5">
								<!-- La barra parte dal centro: è uno scarto, non un livello. -->
								<span class="relative hidden h-1 w-20 rounded-full bg-panel-2 sm:block" aria-hidden="true">
									<span class="absolute inset-y-0 left-1/2 w-px bg-line-strong"></span>
									<span
										class="absolute inset-y-0 rounded-full"
										style="background: {favourable ? 'var(--color-bio)' : 'var(--color-load)'};
											{(c.signed ?? 0) >= 0 ? 'left: 50%;' : 'right: 50%;'}
											width: {(Math.min(2, Math.abs(c.signed ?? 0)) / 2) * 50}%"
									></span>
								</span>
								<span class="w-16 shrink-0 text-right font-mono text-sm text-ink-2">
									{c.deviationPct > 0 ? '+' : '−'}{nf0.format(Math.abs(c.deviationPct))}%
								</span>
							</div>
						{/if}
					</div>
				{/each}
			</dl>
		</div>
	</div>

	<p class="mt-5 flex items-start gap-2 border-t border-line pt-4 text-xs text-ink-3">
		<Icon name="warning" size={14} class="mt-px shrink-0" />
		<span>
			Indicazioni informative: segui il piano del fisioterapista. Questo numero confronta le tue letture
			degli ultimi 60 giorni con quelle di oggi, e non dice cosa allenare.
		</span>
	</p>
</HudPanel>
