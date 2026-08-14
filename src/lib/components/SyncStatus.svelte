<script lang="ts">
	import { page } from '$app/state';

	/**
	 * Quanto sono vecchi i dati che stai guardando.
	 *
	 * Nei mockup qui c'era un indicatore "LIVE". Questa app non è mai live:
	 * legge un export di Salute che arriva a mano, ogni tanto, dalla riga di
	 * comando. Fingere un flusso continuo sarebbe l'unica bugia dell'interfaccia
	 * — e sarebbe anche la più costosa, perché nasconderebbe proprio il caso in
	 * cui i numeri non vogliono dire più niente: quello in cui l'ultimo import
	 * risale a tre settimane fa.
	 *
	 * Il pallino sta sul canale biometrico finché il dato è fresco, e passa
	 * all'oro dell'attenzione dopo una settimana.
	 */

	const finishedAt = $derived(page.data.lastIngest?.finishedAt ?? null);

	const when = $derived(finishedAt ? new Date(finishedAt) : null);

	const days = $derived(when ? (Date.now() - when.getTime()) / 86_400_000 : null);
	const stale = $derived(days != null && days > 7);

	const label = $derived(
		when
			? new Intl.DateTimeFormat('it-IT', {
					day: 'numeric',
					month: 'short',
					hour: '2-digit',
					minute: '2-digit'
				}).format(when)
			: null
	);
</script>

{#if label}
	<p class="flex items-center gap-2 font-mono text-xs whitespace-nowrap text-ink-3">
		<span
			class="size-1.5 shrink-0 rounded-full {stale ? 'bg-load' : 'bg-bio-bright'}"
			aria-hidden="true"
		></span>
		<span class="sr-only">{stale ? 'Dati non aggiornati.' : 'Dati aggiornati.'}</span>
		Importato {label}
	</p>
{/if}
