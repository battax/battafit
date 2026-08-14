<script lang="ts">
	import { scaleUtc, scaleLinear } from 'd3-scale';
	import { line as d3line } from 'd3-shape';
	import Icon from '$lib/components/Icon.svelte';
	import { PAIN_ALERT, SWELLING_BY_KEY, dayToUtc, formatDayLong } from '$lib/rehab';

	/**
	 * La risposta del ginocchio al carico: dolore e gonfiore, sugli stessi giorni.
	 *
	 * Stanno insieme perché è la coppia a voler dire qualcosa — un dolore che sale
	 * senza gonfiore e uno che sale con il gonfiore portano a due decisioni
	 * diverse. Non sono però due assi verticali nello stesso grafico: il dolore
	 * occupa il piano cartesiano, il gonfiore una fascia sotto l'asse con la sua
	 * scala, e non condividono nessuna misura.
	 *
	 * Il gonfiore è una grandezza ordinata a quattro livelli, quindi usa un'unica
	 * tinta che sale di intensità e di altezza. Due codifiche per lo stesso dato:
	 * la fascia resta leggibile anche stampata in bianco e nero.
	 */

	export interface ResponsePoint {
		day: string;
		pain: number | null;
		swelling: string | null;
	}

	interface Props {
		points: ResponsePoint[];
		height?: number;
	}

	let { points, height = 200 }: Props = $props();

	let width = $state(720);
	let hovered = $state<number | null>(null);

	const RAIL = 26;
	/** Il margine destro tiene dentro l'etichetta dell'ultimo giorno, che è centrata sull'ultimo punto. */
	const PAD = { top: 12, right: 24, bottom: 22 + RAIL, left: 30 };
	const innerW = $derived(Math.max(10, width - PAD.left - PAD.right));
	const innerH = $derived(Math.max(10, height - PAD.top - PAD.bottom));

	const rows = $derived(points.map((p) => ({ ...p, date: dayToUtc(p.day) })));

	const x = $derived(
		scaleUtc()
			.domain(rows.length ? [rows[0].date, rows[rows.length - 1].date] : [new Date(), new Date()])
			.range([0, innerW])
	);

	/** La scala del dolore è fissa 0–10: se si adattasse ai dati, un mese buono sembrerebbe un mese pessimo. */
	const y = $derived(scaleLinear().domain([0, 10]).range([innerH, 0]));

	const painPoints = $derived(rows.filter((r) => r.pain != null));

	/**
	 * Un buco nei dati resta un buco. La linea si spezza dove manca un giorno,
	 * invece di ricucire sopra e raccontare una continuità che non c'è.
	 */
	const segments = $derived.by(() => {
		const out: (typeof rows)[] = [];
		let run: typeof rows = [];
		for (const r of rows) {
			if (r.pain == null) {
				if (run.length > 1) out.push(run);
				run = [];
			} else {
				run.push(r);
			}
		}
		if (run.length > 1) out.push(run);
		return out;
	});

	const linePath = $derived(
		d3line<(typeof rows)[number]>()
			.x((r) => x(r.date))
			.y((r) => y(r.pain as number))
	);

	const barW = $derived(Math.max(2, Math.min(14, innerW / Math.max(1, rows.length) - 2)));

	/** Altezza e opacità crescono insieme con la gravità: la fascia si legge anche senza colore. */
	function swellingMark(key: string) {
		const severity = SWELLING_BY_KEY.get(key)?.severity ?? 0;
		return { h: 5 + severity * 6, opacity: 0.4 + severity * 0.2 };
	}

	const tickFormat = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', timeZone: 'UTC' });

	/**
	 * Le tacche sono giorni veri, prese dai dati, non generate dalla scala.
	 *
	 * Su una finestra di tre giorni d3 divide l'intervallo in ore e le etichette
	 * escono formattate come date: nove tacche che dicono tutte "12 ago". Qui si
	 * parte dai giorni che esistono e si tiene solo uno ogni tanti.
	 */
	const ticks = $derived.by(() => {
		if (!rows.length) return [];
		const room = Math.max(2, Math.floor(innerW / 90));
		const step = Math.max(1, Math.ceil(rows.length / room));
		const out = rows.filter((_, i) => i % step === 0);
		// L'ultimo giorno c'è sempre, purché non finisca addosso al precedente.
		const last = rows[rows.length - 1];
		if (out[out.length - 1] !== last) {
			if (rows.length - 1 - rows.indexOf(out[out.length - 1]) < step / 2) out.pop();
			out.push(last);
		}
		return out;
	});

	const active = $derived(hovered != null ? rows[hovered] : null);

	function onMove(event: PointerEvent) {
		if (!rows.length) return;
		const rect = (event.currentTarget as SVGElement).getBoundingClientRect();
		const t = x.invert(Math.max(0, Math.min(innerW, event.clientX - rect.left - PAD.left))).getTime();
		let best = 0;
		let bestDist = Infinity;
		for (let i = 0; i < rows.length; i++) {
			const d = Math.abs(rows[i].date.getTime() - t);
			if (d < bestDist) {
				bestDist = d;
				best = i;
			}
		}
		hovered = best;
	}

	const tooltipX = $derived(active ? PAD.left + x(active.date) : 0);
	const tooltipFlip = $derived(tooltipX > width - 170);
	const anyData = $derived(rows.some((r) => r.pain != null || r.swelling));
</script>

<div class="relative w-full" bind:clientWidth={width}>
	{#if !anyData}
		<div class="flex flex-col items-center justify-center gap-2 text-ink-3" style="height: {height}px">
			<Icon name="knee" size={22} />
			<p class="text-sm">Nessun dolore né gonfiore registrato in questo periodo</p>
		</div>
	{:else}
		<!-- SVG in assoluto: vedi la nota in TimeChart, stessa ragione. -->
		<div class="relative" style="height: {height}px">
			<svg
				{width}
				{height}
				role="img"
				aria-label="Dolore al ginocchio e gonfiore, giorno per giorno"
				onpointermove={onMove}
				onpointerleave={() => (hovered = null)}
				class="absolute inset-0 touch-pan-y select-none"
			>
				<g transform="translate({PAD.left},{PAD.top})">
					{#each [0, 2, 4, 6, 8, 10] as tick (tick)}
						<line x1="0" x2={innerW} y1={y(tick)} y2={y(tick)} stroke="var(--color-grid)" stroke-width="1" />
						<text x="-7" y={y(tick)} text-anchor="end" dominant-baseline="middle" class="fill-ink-3 font-mono text-[10px]">
							{tick}
						</text>
					{/each}

					<!-- Sopra 3 il dolore smette di essere rumore: la soglia è disegnata, non lasciata alla memoria. -->
					<rect x="0" y="0" width={innerW} height={y(PAIN_ALERT)} fill="var(--color-motion)" opacity="0.05" />
					<line
						x1="0"
						x2={innerW}
						y1={y(PAIN_ALERT)}
						y2={y(PAIN_ALERT)}
						stroke="var(--color-motion)"
						stroke-width="1"
						stroke-dasharray="3 4"
						opacity="0.6"
					/>

					{#each segments as seg, i (i)}
						<path
							d={linePath(seg)}
							fill="none"
							stroke="var(--color-motion)"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					{/each}

					{#each painPoints as p (p.day)}
						<circle cx={x(p.date)} cy={y(p.pain as number)} r="3" fill="var(--color-motion)" />
					{/each}

					<!-- La fascia del gonfiore, sotto l'asse: scala propria, nessuna misura in comune col dolore. -->
					<line x1="0" x2={innerW} y1={innerH + 8} y2={innerH + 8} stroke="var(--color-line)" stroke-width="1" />
					{#each rows as r (r.day)}
						{#if r.swelling && r.swelling !== 'no'}
							{@const mark = swellingMark(r.swelling)}
							<rect
								x={x(r.date) - barW / 2}
								y={innerH + 9}
								width={barW}
								height={mark.h}
								rx="1"
								fill="var(--color-load)"
								opacity={mark.opacity}
							/>
						{/if}
					{/each}

					{#each ticks as tick (tick.day)}
						<text
							x={x(tick.date)}
							y={innerH + RAIL + 16}
							text-anchor="middle"
							class="fill-ink-3 font-mono text-[10px]"
						>
							{tickFormat.format(tick.date)}
						</text>
					{/each}

					{#if active}
						<line
							x1={x(active.date)}
							x2={x(active.date)}
							y1="0"
							y2={innerH + RAIL}
							stroke="var(--color-line-strong)"
							stroke-width="1"
						/>
						{#if active.pain != null}
							<circle cx={x(active.date)} cy={y(active.pain)} r="6" fill="var(--color-panel-solid)" />
							<circle cx={x(active.date)} cy={y(active.pain)} r="4" fill="var(--color-motion)" />
						{/if}
					{/if}
				</g>
			</svg>
		</div>

		{#if active}
			<div
				class="pointer-events-none absolute top-1 z-10 rounded-lg border border-line-strong bg-panel-2/95 px-2.5 py-2 shadow-lg shadow-black/40"
				style="left: {tooltipX}px; transform: translateX({tooltipFlip ? '-100%' : '0'})"
			>
				<p class="text-[10px] whitespace-nowrap text-ink-3 first-letter:uppercase">{formatDayLong(active.day)}</p>
				<dl class="mt-1 space-y-0.5 text-[11px] whitespace-nowrap">
					<div class="flex items-center gap-2">
						<span class="size-1.5 rounded-full bg-motion"></span>
						<dt class="text-ink-3">Dolore</dt>
						<dd class="ml-auto font-mono text-ink">{active.pain ?? '—'}{active.pain != null ? '/10' : ''}</dd>
					</div>
					<div class="flex items-center gap-2">
						<span class="size-1.5 rounded-full bg-load"></span>
						<dt class="text-ink-3">Gonfiore</dt>
						<dd class="ml-auto font-mono text-ink">
							{active.swelling ? (SWELLING_BY_KEY.get(active.swelling)?.label ?? '—') : '—'}
						</dd>
					</div>
				</dl>
			</div>
		{/if}

		<ul class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
			<li class="flex items-center gap-1.5 text-xs text-ink-2">
				<span class="h-0.5 w-3 rounded-full bg-motion"></span> Dolore 0–10
			</li>
			<li class="flex items-center gap-1.5 text-xs text-ink-2">
				<span class="h-2.5 w-2 rounded-[2px] bg-load"></span> Gonfiore, più alto = più forte
			</li>
			<li class="flex items-center gap-1.5 text-xs text-ink-3">
				<span class="h-px w-3 border-t border-dashed border-motion"></span> Soglia {PAIN_ALERT}
			</li>
		</ul>
	{/if}
</div>
