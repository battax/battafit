<script lang="ts">
	import Icon, { type IconName } from './Icon.svelte';

	/**
	 * Uno stato, scritto.
	 *
	 * Porta sempre un'icona oltre al colore, e sempre una parola oltre
	 * all'icona: un pallino verde da solo si può leggere come "attivo",
	 * "completato" o "in salute", e il verde di questa palette significa una
	 * cosa sola. Chi non distingue i colori legge la parola; chi non legge
	 * l'italiano riconosce la spunta; chi guarda di sfuggita vede il colore.
	 * Tre codifiche per lo stesso stato, che è il minimo per un'informazione
	 * che spesso è l'unica in un riquadro.
	 */

	type Tone = 'done' | 'attention' | 'critical' | 'info' | 'neutral';

	const TONES: Record<Tone, { class: string; icon: IconName }> = {
		done: { class: 'text-done border-done/35 bg-done/10', icon: 'check' },
		attention: { class: 'text-load border-load/35 bg-load/10', icon: 'warning' },
		critical: { class: 'text-critical border-critical/40 bg-critical/10', icon: 'warning' },
		info: { class: 'text-bio border-bio/35 bg-bio/10', icon: 'clock' },
		neutral: { class: 'text-ink-2 border-line bg-panel-2/60', icon: 'empty' }
	};

	interface Props {
		label: string;
		tone?: Tone;
		/** Sostituisce l'icona del tono quando ce n'è una più precisa. */
		icon?: IconName;
	}

	let { label, tone = 'neutral', icon }: Props = $props();

	const spec = $derived(TONES[tone]);
</script>

<span
	class="inline-flex items-center gap-1.5 rounded-[3px] border px-2 py-1 text-xs font-medium whitespace-nowrap {spec.class}"
>
	<Icon name={icon ?? spec.icon} size={12} />
	{label}
</span>
