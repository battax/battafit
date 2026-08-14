<script lang="ts">
	import HudPanel from './HudPanel.svelte';
	import SectionHeader from './SectionHeader.svelte';
	import StatusBadge from './StatusBadge.svelte';
	import Icon from './Icon.svelte';
	import { PAIN_ALERT } from '$lib/rehab';

	/**
	 * Ginocchio destro: la settimana in corso, letta dal registro.
	 *
	 * È uno specchio, non una seconda fonte. Ogni valore qui dentro è già stato
	 * scritto in `/recupero/registro` o in `/recupero/carichi`, e ogni riga porta
	 * il collegamento al posto in cui si modifica. Duplicare i campi avrebbe
	 * significato due verità sullo stesso ginocchio, che è il modo più veloce per
	 * non fidarsi di nessuna delle due.
	 *
	 * Due voci che il brief chiedeva non ci sono, e non vengono finte: il ROM in
	 * gradi e la forza del quadricipite al dinamometro non li registra nessuna
	 * parte di questa app. Al posto della forza c'è lo scarto di carico fra le
	 * due gambe, che è la lettura più vicina che il registro sappia dare, ed è
	 * scritto che è quello.
	 */

	interface Props {
		knee: {
			week: number;
			logged: number;
			elapsed: number;
			pain: number | null;
			painMax: number | null;
			swellingDays: number;
			fkt: number;
			fktTarget: number;
			deficit: number | null;
		};
	}

	let { knee }: Props = $props();

	const nf0 = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 });
	const nf1 = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 });
</script>

<HudPanel channel="load" class="p-5">
	<SectionHeader
		title="Ginocchio destro"
		channel="load"
		meta="settimana {knee.week} · {knee.logged} giornate compilate su {knee.elapsed}"
		class="mb-4"
	/>

	{#if knee.logged === 0}
		<p class="text-sm text-ink-3">
			Nessuna giornata compilata questa settimana. Il registro è l'unico posto da cui questi valori possono
			arrivare.
		</p>
		<a
			href="/recupero/registro"
			class="mt-4 inline-flex items-center gap-1.5 text-sm text-ink-2 transition-colors hover:text-ink"
		>
			Apri il registro <Icon name="chevronRight" size={14} />
		</a>
	{:else}
		<dl class="divide-y divide-line">
			<div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 py-3 first:pt-0">
				<div class="min-w-0">
					<dt class="text-sm text-ink">Dolore percepito</dt>
					<dd class="mt-0.5 font-mono text-xs text-ink-3">
						media della settimana{#if knee.painMax != null}, picco {knee.painMax}{/if}
					</dd>
				</div>
				<dd class="flex shrink-0 items-center gap-3">
					<span class="font-mono text-lg {knee.pain == null ? 'text-ink-3' : 'text-ink'}">
						{knee.pain == null ? '—' : nf1.format(knee.pain)}<span class="text-xs text-ink-3">/10</span>
					</span>
					{#if knee.painMax != null && knee.painMax >= PAIN_ALERT}
						<StatusBadge label="Sopra soglia {PAIN_ALERT}" tone="attention" />
					{/if}
				</dd>
			</div>

			<div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 py-3">
				<div class="min-w-0">
					<dt class="text-sm text-ink">Gonfiore</dt>
					<dd class="mt-0.5 font-mono text-xs text-ink-3">giornate con gonfiore riferito</dd>
				</div>
				<dd class="shrink-0">
					{#if knee.swellingDays === 0}
						<StatusBadge label="Nessuna" tone="done" />
					{:else}
						<StatusBadge label="{knee.swellingDays} su {knee.logged}" tone="attention" />
					{/if}
				</dd>
			</div>

			<div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 py-3">
				<div class="min-w-0">
					<dt class="text-sm text-ink">Sedute di fisioterapia</dt>
					<dd class="mt-0.5 font-mono text-xs text-ink-3">aderenza al piano settimanale</dd>
				</div>
				<dd class="flex shrink-0 items-center gap-3">
					<span class="flex gap-1" aria-hidden="true">
						{#each Array.from({ length: Math.max(knee.fktTarget, knee.fkt) }, (_, i) => i < knee.fkt) as done, i (i)}
							<span class="size-2 rounded-full {done ? 'bg-done' : 'border border-line-strong'}"></span>
						{/each}
					</span>
					<span class="font-mono text-lg text-ink">{knee.fkt}<span class="text-ink-3">/{knee.fktTarget}</span></span>
				</dd>
			</div>

			<div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 py-3 last:pb-0">
				<div class="min-w-0">
					<dt class="text-sm text-ink">Scarto di carico fra le gambe</dt>
					<dd class="mt-0.5 font-mono text-xs text-ink-3">dal registro dei carichi, non da un dinamometro</dd>
				</div>
				<dd class="shrink-0 font-mono text-lg {knee.deficit == null ? 'text-ink-3' : 'text-ink'}">
					{knee.deficit == null ? '—' : `${nf0.format(knee.deficit)}%`}
				</dd>
			</div>
		</dl>

		<div class="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-4">
			<a href="/recupero/registro" class="flex items-center gap-1.5 text-sm text-ink-2 transition-colors hover:text-ink">
				Registro <Icon name="chevronRight" size={14} />
			</a>
			<a href="/recupero/carichi" class="flex items-center gap-1.5 text-sm text-ink-2 transition-colors hover:text-ink">
				Carichi <Icon name="chevronRight" size={14} />
			</a>
		</div>
	{/if}

	<p class="mt-4 text-xs text-ink-3">
		Il ROM in gradi e la forza al dinamometro non sono registrati in nessuna parte dell'app: quando servono,
		i numeri buoni restano quelli del controllo in ambulatorio.
	</p>
</HudPanel>
