<script lang="ts">
	import { page } from '$app/state';
	import Logo from '$lib/components/Logo.svelte';
	import Icon, { type IconName } from '$lib/components/Icon.svelte';

	let { children } = $props();

	/**
	 * Le sei sezioni dei sensori, più il recupero.
	 *
	 * Ogni voce porta il canale del proprio dato, e il canale è la sola cosa
	 * colorata della navigazione: rosso dove si legge quello che hai fatto, blu
	 * dove si legge quello che il corpo riporta, oro sul protocollo. Chi conosce
	 * il codice sa dove sta andando prima di leggere l'etichetta.
	 *
	 * `Recupero` sta staccato in fondo perché è l'unica sezione che non arriva
	 * dall'orologio: è quello che va scritto a mano ogni sera, e mescolarlo alle
	 * altre lo farebbe sembrare un'altra lettura automatica.
	 */
	interface NavItem {
		href: string;
		label: string;
		icon: IconName;
		/** Classi del canale: barra dell'indicatore e tinta dell'icona attiva. */
		bar: string;
		tint: string;
	}

	const MOTION = { bar: 'bg-motion', tint: 'text-motion' };
	const BIO = { bar: 'bg-bio', tint: 'text-bio' };
	const LOAD = { bar: 'bg-load', tint: 'text-load' };

	const NAV: NavItem[] = [
		{ href: '/', label: 'Panoramica', icon: 'overview', ...MOTION },
		{ href: '/attivita', label: 'Attività', icon: 'activity', ...MOTION },
		{ href: '/allenamenti', label: 'Allenamenti', icon: 'workouts', ...MOTION },
		{ href: '/cuore', label: 'Cuore', icon: 'heart', ...BIO },
		{ href: '/sonno', label: 'Sonno', icon: 'sleep', ...BIO },
		{ href: '/corpo', label: 'Corpo', icon: 'body', ...BIO }
	];

	const REHAB: NavItem = { href: '/recupero', label: 'Recupero', icon: 'knee', ...LOAD };
	const TABS = [...NAV, REHAB];

	function isActive(href: string): boolean {
		return href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
	}

	const rehabActive = $derived(isActive(REHAB.href));
</script>

<div class="min-h-dvh md:flex">
	<!-- Barra superiore, solo su schermi stretti. -->
	<header
		class="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-page/90 px-4 py-3 backdrop-blur-md md:hidden"
	>
		<a href="/" aria-label="battafit, vai alla panoramica"><Logo /></a>
		<form method="POST" action="/logout">
			<button type="submit" class="p-2 text-ink-3 transition-colors hover:text-ink-2" aria-label="Esci">
				<Icon name="logout" size={18} />
			</button>
		</form>
	</header>

	<!-- Colonna di navigazione su desktop. -->
	<aside class="sticky top-0 hidden h-dvh w-[216px] shrink-0 flex-col border-r border-line px-3 py-5 md:flex">
		<a href="/" class="mb-7 px-2" aria-label="battafit, vai alla panoramica"><Logo /></a>

		<nav aria-label="Sezioni" class="flex-1 space-y-0.5">
			{#each NAV as item (item.href)}
				{@const active = isActive(item.href)}
				<a
					href={item.href}
					aria-current={active ? 'page' : undefined}
					class="relative flex items-center gap-2.5 rounded-[3px] py-2 pr-2.5 pl-3.5 text-sm transition-colors duration-150
						{active ? 'bg-panel-2/70 text-ink' : 'text-ink-3 hover:bg-panel-2/35 hover:text-ink-2'}"
				>
					{#if active}
						<span class="absolute inset-y-0 left-0 w-[2px] rounded-full {item.bar}"></span>
					{/if}
					<span class={active ? item.tint : ''}><Icon name={item.icon} size={17} /></span>
					{item.label}
				</a>
			{/each}

			<!-- Il filetto dice che sotto cambia la natura del dato: da letto a scritto. -->
			<div class="!mt-3 border-t border-line pt-3">
				<a
					href={REHAB.href}
					aria-current={rehabActive ? 'page' : undefined}
					class="relative flex items-center gap-2.5 rounded-[3px] py-2 pr-2.5 pl-3.5 text-sm transition-colors duration-150
						{rehabActive ? 'bg-panel-2/70 text-ink' : 'text-ink-3 hover:bg-panel-2/35 hover:text-ink-2'}"
				>
					{#if rehabActive}
						<span class="absolute inset-y-0 left-0 w-[2px] rounded-full {REHAB.bar}"></span>
					{/if}
					<span class={rehabActive ? REHAB.tint : ''}><Icon name={REHAB.icon} size={17} /></span>
					{REHAB.label}
				</a>
			</div>
		</nav>

		<div class="border-t border-line pt-3">
			<form method="POST" action="/logout">
				<button
					type="submit"
					class="flex w-full items-center gap-2.5 rounded-[3px] px-3.5 py-2 text-sm text-ink-3 transition-colors duration-150 hover:bg-panel-2/35 hover:text-ink-2"
				>
					<Icon name="logout" size={17} />
					Esci
				</button>
			</form>
		</div>
	</aside>

	<main class="min-w-0 flex-1 px-4 pt-5 pb-24 md:px-8 md:py-8">
		{@render children()}
	</main>

	<!--
		Barra a schede su mobile: le sette sezioni restano raggiungibili col pollice.

		A sette colonne su un telefono stretto ogni scheda scende sotto i 52px, e
		"Panoramica" a 10px non ci starebbe: l'etichetta scala a 9px e comunque
		tronca, perché una parola che sfonda la colonna trascina l'intera pagina
		in orizzontale.
	-->
	<nav
		aria-label="Sezioni"
		class="fixed inset-x-0 bottom-0 z-20 grid grid-cols-7 border-t border-line bg-page/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
	>
		{#each TABS as item (item.href)}
			{@const active = isActive(item.href)}
			<a
				href={item.href}
				aria-current={active ? 'page' : undefined}
				class="relative flex min-w-0 flex-col items-center gap-1 px-0.5 py-2.5 transition-colors duration-150
					{active ? 'text-ink' : 'text-ink-3'}"
			>
				{#if active}
					<span class="absolute inset-x-2 top-0 h-[2px] rounded-full {item.bar}"></span>
				{/if}
				<span class={active ? item.tint : ''}><Icon name={item.icon} size={19} /></span>
				<span class="w-full truncate text-center text-[9px] leading-none">{item.label}</span>
			</a>
		{/each}
	</nav>
</div>
