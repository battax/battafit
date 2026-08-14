<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';

	let { form, data } = $props();
	let submitting = $state(false);

	const next = $derived(page.url.searchParams.get('next') ?? '');
</script>

<svelte:head><title>Accedi · BattaFit</title></svelte:head>

<main class="relative flex min-h-dvh items-center justify-center overflow-hidden px-6 py-12">
	<!-- Ragnatela di fondo, sotto il 5% di opacità: si riconosce solo dopo aver
	     letto quello che conta. Decorativa, quindi invisibile agli screen reader. -->
	<div class="web-backdrop pointer-events-none absolute inset-0" aria-hidden="true"></div>

	<div class="relative w-full max-w-[340px]">
		<div class="mb-8 flex flex-col items-center gap-4 text-center">
			<img
				src="/battafit-wordmark.webp"
				alt="BattaFit"
				width="900"
				height="305"
				class="w-full max-w-[300px]"
				fetchpriority="high"
			/>
			<p class="text-sm text-ink-2">I tuoi dati, solo per te.</p>
		</div>

		{#if !data.configured}
			<div class="panel flex gap-3 p-4 text-sm">
				<Icon name="warning" size={18} class="mt-0.5 shrink-0 text-warning" />
				<div>
					<p class="font-medium text-ink">Configurazione incompleta</p>
					<p class="mt-1 text-ink-2">
						Mancano <code class="font-mono text-xs text-ink">AUTH_SECRET</code> o
						<code class="font-mono text-xs text-ink">AUTH_PASSWORD_HASH</code>. Generali con
						<code class="font-mono text-xs text-ink">npm run auth:secret</code> e
						<code class="font-mono text-xs text-ink">npm run auth:hash</code>.
					</p>
				</div>
			</div>
		{:else}
			<form
				method="POST"
				use:enhance={() => {
					submitting = true;
					return async ({ update }) => {
						await update();
						submitting = false;
					};
				}}
				class="panel space-y-4 p-5"
			>
				<input type="hidden" name="next" value={next} />

				<div>
					<label for="password" class="label mb-2 block">Password</label>
					<!--
						Pagina dedicata con un solo campo: portare qui il fuoco è quello che
						l'utente si aspetta, non un salto inatteso dentro un modulo più grande.
					-->
					<!-- svelte-ignore a11y_autofocus -->
					<input
						id="password"
						name="password"
						type="password"
						autocomplete="current-password"
						required
						autofocus
						aria-invalid={form?.error ? 'true' : undefined}
						aria-describedby={form?.error ? 'login-error' : undefined}
						class="w-full rounded-lg border border-line bg-panel-2 px-3 py-2.5 text-sm text-ink
							placeholder:text-ink-3 focus:border-s1 focus:outline-none"
						placeholder="••••••••"
					/>
				</div>

				{#if form?.error}
					<p id="login-error" class="flex items-start gap-2 text-sm text-critical" role="alert">
						<Icon name="warning" size={15} class="mt-0.5 shrink-0" />
						{form.error}
					</p>
				{/if}

				<button
					type="submit"
					disabled={submitting}
					class="w-full rounded-lg bg-ink px-3 py-2.5 text-sm font-medium text-page
						transition-opacity duration-150 hover:opacity-90 disabled:opacity-50"
				>
					{submitting ? 'Verifico…' : 'Entra'}
				</button>
			</form>
		{/if}
	</div>
</main>
