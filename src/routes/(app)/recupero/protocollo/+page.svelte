<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import Field from '$lib/components/Field.svelte';
	import {
		DISCLAIMER,
		RED_FLAGS,
		SOURCES,
		SURGERY_DAY,
		SURGERY_LABEL,
		WEEKLY_TARGETS,
		diffDays,
		formatDayShort
	} from '$lib/rehab';

	let { data, form } = $props();

	function countdown(day: string | null): string {
		if (!day) return '';
		const n = diffDays(data.today, day);
		if (n === 0) return 'oggi';
		if (n === 1) return 'domani';
		return n > 0 ? `fra ${n} giorni` : `${-n} giorni fa`;
	}
</script>

<svelte:head><title>Protocollo · Recupero · BattaFit</title></svelte:head>

<div class="space-y-gutter">
	<!--
		I segnali comandano la pagina, e sono l'unica cosa qui dentro che non si
		può modificare da nessun form: arrivano dalle indicazioni cliniche e l'app
		li riporta, non li interpreta.
	-->
	<section class="panel panel-bleed border-y-warning/40 bg-warning/5 px-4 py-5 md:px-8">
		<div class="mb-4 flex items-center gap-2">
			<span class="text-warning"><Icon name="warning" size={17} /></span>
			<h2 class="text-sm font-medium text-ink">Segnali da non ignorare</h2>
		</div>

		<ul class="divide-y divide-line">
			{#each RED_FLAGS as flag (flag.sign)}
				<li class="flex flex-wrap items-baseline gap-x-6 gap-y-1 py-3 first:pt-0 last:pb-0">
					<p class="min-w-0 flex-1 text-sm text-ink">{flag.sign}</p>
					<p class="text-sm text-ink-2">{flag.action}</p>
				</li>
			{/each}
		</ul>
	</section>

	<section class="panel p-5">
		<h2 class="mb-1 text-sm font-medium text-ink">L'intervento</h2>
		<p class="text-sm text-ink-2">{SURGERY_LABEL}</p>
		<p class="mt-2 font-mono text-xs text-ink-3">
			{formatDayShort(SURGERY_DAY)} · {diffDays(SURGERY_DAY, data.today)} giorni fa
		</p>
	</section>

	<!-- La cronologia è una sequenza vera, quindi le date la ordinano e il conto alla rovescia dice quanto manca. -->
	<section class="panel p-5">
		<h2 class="mb-4 text-sm font-medium text-ink">Cronologia clinica</h2>

		<ul class="divide-y divide-line">
			{#each data.events as event (event.id)}
				<li class="flex flex-wrap items-start gap-x-4 gap-y-2 py-3 first:pt-0">
					<form method="POST" action="?/toggleEvent" class="mt-0.5 shrink-0">
						<input type="hidden" name="id" value={event.id} />
						<input type="hidden" name="done" value={event.done ? '' : 'on'} />
						<button
							type="submit"
							class="flex size-5 items-center justify-center rounded-[3px] border transition-colors duration-150
								{event.done
								? 'border-good/50 bg-good/15 text-good'
								: 'border-line-strong text-transparent hover:border-ink-3'}"
							aria-label={event.done ? `Segna «${event.title}» come da fare` : `Segna «${event.title}» come fatto`}
						>
							<Icon name="check" size={12} />
						</button>
					</form>

					<div class="min-w-0 flex-1">
						<p class="text-sm {event.done ? 'text-ink-3' : 'text-ink'}">{event.title}</p>
						{#if event.detail}
							<p class="mt-0.5 text-sm text-ink-3">{event.detail}</p>
						{/if}
					</div>

					<div class="text-right">
						{#if event.day}
							<p class="font-mono text-xs text-ink-2">{formatDayShort(event.day)}</p>
							<p class="mt-0.5 font-mono text-[11px] text-ink-3">{countdown(event.day)}</p>
						{/if}
					</div>

					<form method="POST" action="?/deleteEvent" class="shrink-0">
						<input type="hidden" name="id" value={event.id} />
						<button
							type="submit"
							class="flex size-8 items-center justify-center rounded-[3px] text-ink-3 transition-colors duration-150 hover:bg-panel-2 hover:text-critical"
							aria-label="Elimina «{event.title}»"
						>
							<Icon name="trash" size={15} />
						</button>
					</form>
				</li>
			{/each}
		</ul>

		<form method="POST" action="?/addEvent" class="mt-5 border-t border-line pt-5">
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<Field name="day" label="Giorno" type="date" />
				<Field name="title" label="Evento" type="text" placeholder="Controllo 9 mesi" />
				<Field name="detail" label="Indicazione" type="text" placeholder="Cosa portare, cosa verificare" />
				<Field name="professional" label="Professionista" type="text" />
			</div>
			<button
				type="submit"
				class="mt-4 flex items-center gap-2 rounded-[3px] border border-line px-3.5 py-2 text-sm text-ink-2 transition-colors duration-150 hover:border-line-strong hover:text-ink"
			>
				<Icon name="plus" size={15} />
				Aggiungi una scadenza
			</button>
		</form>
	</section>

	<section class="panel p-5">
		<h2 class="mb-1 text-sm font-medium text-ink">Obiettivi</h2>
		<p class="mb-4 text-xs text-ink-3">
			Questi numeri alimentano la formula d'oro e i confronti del registro. Un campo lasciato vuoto torna al valore di
			partenza.
		</p>

		{#if form?.error}
			<p class="mb-4 flex items-center gap-2 text-sm text-critical">
				<Icon name="warning" size={15} />
				{form.error}
			</p>
		{/if}

		<form method="POST" action="?/targets" class="space-y-5">
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<Field name="proteinMinG" label="Proteine minime" unit="g" value={data.config.proteinMinG} />
				<Field name="proteinTargetG" label="Proteine obiettivo" unit="g" value={data.config.proteinTargetG} />
				<Field name="proteinHighG" label="Proteine fascia alta" unit="g" value={data.config.proteinHighG} />
				<Field name="caloriesTarget" label="Calorie" unit="kcal" value={data.config.caloriesTarget} />
				<Field name="waterTargetL" label="Acqua" unit="L" value={data.config.waterTargetL} />
				<Field name="sleepMinH" label="Sonno minimo" unit="h" value={data.config.sleepMinH} />
				<Field name="startWeightKg" label="Peso iniziale" unit="kg" value={data.config.startWeightKg} />
				<Field name="targetWeightKg" label="Peso obiettivo" unit="kg" value={data.config.targetWeightKg} />
				<div class="grid grid-cols-2 gap-3">
					<Field name="weeklyLossMinKg" label="Calo min/sett" unit="kg" value={data.config.weeklyLossMinKg} />
					<Field name="weeklyLossMaxKg" label="Calo max/sett" unit="kg" value={data.config.weeklyLossMaxKg} />
				</div>
			</div>

			<button
				type="submit"
				class="rounded-[3px] bg-suit-red px-4 py-2.5 text-sm font-medium text-ink transition-opacity duration-150 hover:opacity-90"
			>
				Salva gli obiettivi
			</button>
		</form>

		<dl class="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-3">
			<div>
				<dt class="label">Fisioterapia</dt>
				<dd class="mt-1.5 font-mono text-sm text-ink">{WEEKLY_TARGETS.fkt}× a settimana</dd>
			</div>
			<div>
				<dt class="label">Parte alta</dt>
				<dd class="mt-1.5 font-mono text-sm text-ink">{WEEKLY_TARGETS.upperBody}× a settimana</dd>
			</div>
			<div>
				<dt class="label">Corsa lineare</dt>
				<dd class="mt-1.5 font-mono text-sm text-ink">{WEEKLY_TARGETS.runs}× a settimana</dd>
			</div>
		</dl>
		<p class="mt-3 text-xs text-ink-3">
			Le frequenze settimanali e le date dei controlli vengono dal protocollo e non si modificano da qui.
		</p>
	</section>

	<section class="panel p-5">
		<h2 class="mb-4 flex items-center gap-2 text-sm font-medium text-ink">
			<span class="text-ink-3"><Icon name="stethoscope" size={16} /></span>
			Recapiti
		</h2>

		<!-- Le intestazioni stanno una volta sola in cima; nelle righe l'etichetta resta agli screen reader. -->
		<div class="mb-2 hidden gap-3 sm:grid sm:grid-cols-[10rem_1fr_1fr_auto]">
			<span></span>
			<span class="label">Nome</span>
			<span class="label">Telefono o email</span>
			<span></span>
		</div>

		<ul class="space-y-3">
			{#each data.contacts as contact (contact.id)}
				<li>
					<form method="POST" action="?/contact" class="grid gap-3 sm:grid-cols-[10rem_1fr_1fr_auto] sm:items-center">
						<input type="hidden" name="id" value={contact.id} />
						<p class="text-sm text-ink-2">{contact.role}</p>
						<Field name="name" label="Nome di {contact.role}" type="text" value={contact.name} labelHidden />
						<Field
							name="contact"
							label="Telefono o email di {contact.role}"
							type="text"
							value={contact.contact}
							labelHidden
						/>
						<button
							type="submit"
							class="min-h-10 rounded-[3px] border border-line px-3.5 text-sm text-ink-2 transition-colors duration-150 hover:border-line-strong hover:text-ink"
						>
							Salva
						</button>
					</form>
				</li>
			{/each}
		</ul>
	</section>

	<section class="panel p-5">
		<h2 class="mb-4 text-sm font-medium text-ink">Da dove viene il protocollo</h2>
		<ul class="divide-y divide-line">
			{#each SOURCES as source (source.url)}
				<li class="py-3 first:pt-0 last:pb-0">
					<a
						href={source.url}
						target="_blank"
						rel="noreferrer noopener"
						class="text-sm text-ink transition-colors hover:text-suit-blue"
					>
						{source.title}
					</a>
					<p class="mt-0.5 text-xs text-ink-3">{source.note}</p>
				</li>
			{/each}
		</ul>
	</section>

	<p class="text-xs leading-relaxed text-ink-3">{DISCLAIMER}</p>
</div>
