<script lang="ts">
	import HudPanel, { type Channel } from './HudPanel.svelte';
	import Icon, { type IconName } from './Icon.svelte';
	import Delta from './Delta.svelte';
	import Sparkline from './Sparkline.svelte';

	/**
	 * Una lettura singola: etichetta, cifra, come sta andando.
	 *
	 * Era ripetuta a mano in quattro pagine, ogni volta con una spaziatura
	 * leggermente diversa. Qui la gerarchia è fissa e sempre la stessa —
	 * etichetta piccola, cifra grande in monospazio, variazione e traccia sulla
	 * riga di sotto — perché è quella che si impara una volta e poi si legge
	 * dovunque senza rileggerla.
	 *
	 * Il colore del canale sta sulla diagonale del pannello e sulla traccia. Non
	 * tocca mai la cifra: un numero colorato smette di essere un numero e diventa
	 * un giudizio, e il giudizio in questa scheda lo dà la variazione.
	 */

	const CHANNEL_VAR: Record<Channel, string> = {
		motion: 'var(--color-motion)',
		bio: 'var(--color-bio)',
		load: 'var(--color-load)',
		done: 'var(--color-done)',
		neutral: 'var(--color-ink-2)'
	};

	interface Props {
		label: string;
		value: number | null | undefined;
		format?: (v: number) => string;
		unit?: string;
		channel?: Channel;
		icon?: IconName;
		/** Traccia dei giorni precedenti, accanto alla variazione. */
		series?: (number | null)[];
		/** Termine di paragone della variazione: di solito la media del periodo. */
		baseline?: number | null;
		higherIsBetter?: boolean;
		/** Riga di contesto sotto la cifra, es. "3,6 km al giorno". */
		sub?: string;
		href?: string;
		/** Cifra più grande, per le letture che comandano una pagina. */
		size?: 'md' | 'lg';
		class?: string;
	}

	let {
		label,
		value,
		format = (v: number) => new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 }).format(v),
		unit = '',
		channel = 'neutral',
		icon,
		series = [],
		baseline = null,
		higherIsBetter,
		sub,
		href,
		size = 'md',
		class: className = ''
	}: Props = $props();

	const color = $derived(CHANNEL_VAR[channel]);
	const hasSeries = $derived(series.filter((v) => v != null).length > 1);
</script>

<HudPanel {channel} {href} class="p-4 {className}">
	<div class="flex items-baseline justify-between gap-2">
		<p class="label flex min-w-0 items-center gap-2">
			{#if icon}
				<span class="shrink-0" style="color: {color}"><Icon name={icon} size={14} /></span>
			{/if}
			<span class="truncate">{label}</span>
		</p>
		{#if href}
			<Icon name="chevronRight" size={13} class="shrink-0 text-ink-3 transition-colors group-hover:text-ink-2" />
		{/if}
	</div>

	<p class="mt-2.5 flex items-baseline gap-1.5">
		<span
			class="font-mono font-medium tracking-tight {size === 'lg' ? 'text-[1.75rem]' : 'text-2xl'}
				{value == null ? 'text-ink-3' : 'text-ink'}"
		>
			{value == null ? '—' : format(value)}
		</span>
		{#if unit && value != null}
			<span class="text-xs text-ink-3">{unit}</span>
		{/if}
	</p>

	{#if sub}
		<p class="mt-1 truncate text-xs text-ink-3">{sub}</p>
	{/if}

	{#if baseline != null || hasSeries}
		<div class="mt-2.5 flex items-end justify-between gap-3">
			<Delta current={value} {baseline} {higherIsBetter} label="rispetto alla media del periodo" />
			{#if hasSeries}
				<Sparkline values={series} {color} width={78} height={22} />
			{/if}
		</div>
	{/if}
</HudPanel>
