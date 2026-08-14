<script lang="ts">
	import { page } from '$app/state';
	import PageHeader from '$lib/components/PageHeader.svelte';

	let { children, data } = $props();

	/**
	 * Le sette viste della sezione.
	 *
	 * `Prontezza` sta per prima ed è l'unica che non si compila: legge i sensori
	 * e li confronta con la propria base. Le altre sei sono il protocollo, che si
	 * scrive a mano. Sono nella stessa sezione perché rispondono alla stessa
	 * domanda da due lati — come sta andando questo ginocchio — e tenerle in due
	 * posti diversi obbligherebbe a confrontarle a memoria.
	 *
	 * Sono schede e non voci nella navigazione principale perché condividono un
	 * unico contesto — questo blocco di tredici settimane — e si passa dall'una
	 * all'altra di continuo mentre si compila. Nella barra dell'app occuperebbero
	 * sei posti su tredici e schiaccerebbero tutto il resto.
	 *
	 * Per la stessa ragione la testata sta qui e non nelle pagine: il titolo e la
	 * posizione nel blocco non cambiano passando da una scheda all'altra, e
	 * ripeterli sei volte li farebbe sembrare sei sezioni diverse.
	 */
	const TABS = [
		{ href: '/recupero/prontezza', label: 'Prontezza' },
		{ href: '/recupero', label: 'Oggi' },
		{ href: '/recupero/registro', label: 'Registro' },
		{ href: '/recupero/corsa', label: 'Corsa' },
		{ href: '/recupero/carichi', label: 'Carichi' },
		{ href: '/recupero/misure', label: 'Misure' },
		{ href: '/recupero/protocollo', label: 'Protocollo' }
	];

	function isActive(href: string): boolean {
		return href === '/recupero' ? page.url.pathname === '/recupero' : page.url.pathname.startsWith(href);
	}

	const meta = $derived(
		data.blockDay >= 1 && data.blockDay <= data.weeks * 7
			? `Settimana ${data.week} di ${data.weeks} · giorno ${data.sinceSurgery} dall'intervento`
			: `Giorno ${data.sinceSurgery} dall'intervento`
	);
</script>

<PageHeader title="Recupero LCA" {meta} spine={data.spine} />

<!--
	La riga di schede scorre in orizzontale sui telefoni invece di andare a capo:
	sei etichette su due righe spingerebbero in basso il contenuto di ogni pagina,
	che è quello che si viene a leggere.

	Su schermo stretto l'ultima scheda cade fuori senza lasciare traccia, e una
	scheda che non si vede non esiste: la sfumatura sul bordo destro è il segnale
	che la fila continua. Su desktop entrano tutte e la sfumatura sparisce.
-->
<nav
	aria-label="Recupero"
	class="mask-fade-right mb-4 overflow-x-auto border-b border-line md:[mask-image:none]"
>
	<ul class="flex min-w-max gap-1 pb-1.5">
		{#each TABS as tab (tab.href)}
			{@const active = isActive(tab.href)}
			<li>
				<a
					href={tab.href}
					aria-current={active ? 'page' : undefined}
					class="block rounded-[3px] px-3 py-1.5 text-sm whitespace-nowrap transition-colors duration-150
						{active ? 'bg-panel-2 text-ink' : 'text-ink-3 hover:text-ink-2'}"
				>
					{tab.label}
				</a>
			</li>
		{/each}
	</ul>
</nav>

{@render children()}
