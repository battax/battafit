<script lang="ts">
	import { scaleLinear } from 'd3-scale';
	import { barPath } from '$lib/chart-shapes';
	import { diffDays, formatDayShort, PROTOCOL_WEEKS, TRACKER_START, weekEnd, weekStart } from '$lib/rehab';

	/**
	 * Il blocco di tredici settimane, per intero.
	 *
	 * Non è una barra di avanzamento: ogni colonna è quante regole della formula
	 * d'oro sono state rispettate in quella settimana, quindi la forma dice come
	 * sta andando e non solo a che punto siamo. Le settimane future restano
	 * tracce vuote, quelle passate senza dati non mostrano una colonna a zero —
	 * "non compilata" e "andata male" sono due cose diverse e devono sembrarlo.
	 *
	 * Le scadenze cliniche sono segnate sull'asse alla loro data esatta, non
	 * all'inizio della settimana che le contiene: sono le uniche date del blocco
	 * che non si possono spostare.
	 */

	export interface WeekCell {
		week: number;
		/** Regole della formula d'oro rispettate. */
		score: number;
		/** Regole in tutto: il fondo scala della colonna. */
		total: number;
		/** Giorni compilati: a zero la settimana resta muta invece di valere zero. */
		logged: number;
	}

	interface Props {
		weeks: WeekCell[];
		today: string;
		/** L'`id` e non la data: due scadenze possono cadere lo stesso giorno. */
		milestones: { id: number; day: string; title: string }[];
		height?: number;
	}

	let { weeks, today, milestones, height = 132 }: Props = $props();

	let width = $state(720);
	let hovered = $state<number | null>(null);

	const PAD = { top: 10, right: 12, bottom: 26, left: 12 };
	const innerW = $derived(Math.max(10, width - PAD.left - PAD.right));
	const innerH = $derived(Math.max(10, height - PAD.top - PAD.bottom));

	/** L'asse è continuo sui 91 giorni: solo così una scadenza cade dove cade davvero. */
	const TOTAL_DAYS = PROTOCOL_WEEKS * 7;
	const x = $derived(scaleLinear().domain([0, TOTAL_DAYS]).range([0, innerW]));

	const colW = $derived(Math.max(2, innerW / PROTOCOL_WEEKS - 3));
	const maxScore = $derived(Math.max(1, ...weeks.map((w) => w.total)));
	const y = $derived(scaleLinear().domain([0, maxScore]).range([innerH, 0]));

	const todayOffset = $derived(diffDays(TRACKER_START, today));
	const todayInside = $derived(todayOffset >= 0 && todayOffset <= TOTAL_DAYS);

	/** Centro della colonna di una settimana, in pixel. */
	function centre(week: number): number {
		return x((week - 1) * 7 + 3.5);
	}

	const pins = $derived(
		milestones
			.map((m) => ({ ...m, offset: diffDays(TRACKER_START, m.day) }))
			.filter((m) => m.offset >= 0 && m.offset <= TOTAL_DAYS)
	);

	const active = $derived(hovered != null ? weeks.find((w) => w.week === hovered) : null);

	function onMove(event: PointerEvent) {
		const rect = (event.currentTarget as SVGElement).getBoundingClientRect();
		const px = event.clientX - rect.left - PAD.left;
		const day = x.invert(Math.max(0, Math.min(innerW, px)));
		hovered = Math.max(1, Math.min(PROTOCOL_WEEKS, Math.floor(day / 7) + 1));
	}

	const tooltipX = $derived(active ? PAD.left + centre(active.week) : 0);
	const tooltipFlip = $derived(tooltipX > width - 150);
</script>

<div class="relative w-full" bind:clientWidth={width}>
	<!-- SVG in assoluto: senza, l'elemento si dimensiona sulla larghezza misurata
	     un istante prima e su schermi stretti sfonda il viewport. -->
	<div class="relative" style="height: {height}px">
		<svg
			{width}
			{height}
			role="img"
			aria-label="Regole della formula d'oro rispettate, settimana per settimana"
			onpointermove={onMove}
			onpointerleave={() => (hovered = null)}
			class="absolute inset-0 touch-pan-y select-none"
		>
			<g transform="translate({PAD.left},{PAD.top})">
				{#each weeks as w (w.week)}
					{@const cx = centre(w.week)}
					{@const isNow = todayInside && w.week === Math.floor(todayOffset / 7) + 1}
					<g opacity={hovered == null || hovered === w.week ? 1 : 0.5}>
						<!-- La traccia: dice quanto spazio c'era, non solo quanto è stato riempito. -->
						<rect
							x={cx - colW / 2}
							y="0"
							width={colW}
							height={innerH}
							rx="2"
							fill="var(--color-panel-2)"
							stroke={isNow ? 'var(--color-line-strong)' : 'transparent'}
						/>

						{#if w.logged > 0 && w.score > 0}
							<path
								d={barPath(cx - colW / 2, y(w.score), colW, innerH - y(w.score), 2)}
								fill={isNow ? 'var(--color-motion)' : 'var(--color-ramp-400)'}
								class="[animation:grow_.5s_var(--ease-settle)_both]"
								style="animation-delay: {w.week * 22}ms; transform-box: fill-box; transform-origin: bottom;"
							/>
						{:else if w.logged > 0}
							<!-- Compilata ma nessuna regola centrata: un moncone, non il vuoto. -->
							<rect x={cx - colW / 2} y={innerH - 2} width={colW} height="2" fill="var(--color-ink-3)" />
						{/if}

						<!--
							Le tacche dividono la colonna in tante celle quante sono le regole.
							Sono disegnate sopra la barra, non sotto: così il riempimento si conta
							a occhio invece di doverlo stimare, e una traccia vuota smette di
							essere un rettangolo muto per diventare una scala da riempire.
						-->
						{#each Array.from({ length: Math.max(0, w.total - 1) }, (_, k) => k + 1) as level (level)}
							<line
								x1={cx - colW / 2}
								x2={cx + colW / 2}
								y1={y(level)}
								y2={y(level)}
								stroke="var(--color-panel-solid)"
								stroke-width="1"
							/>
						{/each}
					</g>
				{/each}

				{#if todayInside}
					<line
						x1={x(todayOffset)}
						x2={x(todayOffset)}
						y1="-6"
						y2={innerH + 6}
						stroke="var(--color-motion)"
						stroke-width="1.5"
					/>
					<circle cx={x(todayOffset)} cy="-6" r="2.5" fill="var(--color-motion)" />
				{/if}

				{#each pins as pin (pin.id)}
					<line
						x1={x(pin.offset)}
						x2={x(pin.offset)}
						y1={innerH + 2}
						y2={innerH + 9}
						stroke="var(--color-load)"
						stroke-width="1.5"
					/>
				{/each}

				{#each weeks as w (w.week)}
					<text
						x={centre(w.week)}
						y={innerH + 20}
						text-anchor="middle"
						class="font-mono text-[9px] {todayInside && w.week === Math.floor(todayOffset / 7) + 1
							? 'fill-ink-2'
							: 'fill-ink-3'}"
					>
						{w.week}
					</text>
				{/each}
			</g>
		</svg>
	</div>

	{#if active}
		<div
			class="pointer-events-none absolute top-0 z-10 rounded-lg border border-line-strong bg-panel-2/95 px-2.5 py-2 shadow-lg shadow-black/40"
			style="left: {tooltipX}px; transform: translateX({tooltipFlip ? '-100%' : '0'})"
		>
			<p class="font-mono text-[10px] whitespace-nowrap text-ink-3">
				Settimana {active.week} · {formatDayShort(weekStart(active.week))} – {formatDayShort(weekEnd(active.week))}
			</p>
			<p class="mt-0.5 text-sm whitespace-nowrap text-ink">
				{#if active.logged === 0}
					Non compilata
				{:else}
					<span class="font-mono">{active.score}</span> regole su
					<span class="font-mono">{active.total}</span>
				{/if}
			</p>
		</div>
	{/if}
</div>

<style>
	@keyframes grow {
		from {
			transform: scaleY(0);
		}
		to {
			transform: scaleY(1);
		}
	}
</style>
