<script lang="ts">
	import { page } from '$app/state';
	import Logo from '$lib/components/Logo.svelte';

	/** L'errore dice cosa è successo e offre una via d'uscita, non solo un codice. */
	const message = $derived(
		page.status === 404
			? 'Questa pagina non esiste.'
			: (page.error?.message ?? 'Qualcosa è andato storto.')
	);
</script>

<svelte:head><title>Errore {page.status} · battafit</title></svelte:head>

<main class="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
	<Logo size={26} />
	<div>
		<p class="tabular text-figure text-ink-3">{page.status}</p>
		<p class="mt-2 text-sm text-ink-2">{message}</p>
	</div>
	<a
		href="/"
		class="rounded-lg bg-panel px-3.5 py-2 text-sm text-ink transition-colors duration-150 hover:bg-panel-2"
	>
		Torna alla panoramica
	</a>
</main>
