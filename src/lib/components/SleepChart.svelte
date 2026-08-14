<script lang="ts">
	import { scaleUtc, scaleLinear } from 'd3-scale';
	import Icon from './Icon.svelte';
	import { formatDuration } from '$lib/metrics';
	import { barPath } from '$lib/chart-shapes';

	/**
	 * Le notti, impilate per fase.
	 *
	 * Le fasi sono una grandezza ordinata — profondo, core, REM, sveglio — non
	 * categorie indipendenti, quindi usano una sola tinta a intensità crescente
	 * invece di quattro colori diversi. Fra un segmento e l'altro passano 2px di
	 * superficie: è quello che separa le fasi, non una riga di contorno.
	 */

	export interface Night {
		day: string;
		deepSec: number | null;
		coreSec: number | null;
		remSec: number | null;
		awakeSec: number | null;
		asleepSec: number | null;
	}

	interface Props {
		nights: Night[];
		height?: number;
	}

	let { nights, height = 260 }: Props = $props();

	const STAGES = [
		{ key: 'deepSec', label: 'Profondo', color: 'var(--color-ramp-600)' },
		{ key: 'coreSec', label: 'Core', color: 'var(--color-ramp-400)' },
		{ key: 'remSec', label: 'REM', color: 'var(--color-ramp-250)' },
		{ key: 'awakeSec', label: 'Sveglio', color: 'var(--color-ink-3)' }
	] as const;

	let width = $state(720);
	let hovered = $state<number | null>(null);

	const PAD = { top: 12, right: 8, bottom: 24, left: 40 };
	const innerW = $derived(Math.max(10, width - PAD.left - PAD.right));
	const innerH = $derived(Math.max(10, height - PAD.top - PAD.bottom));

	const rows = $derived(
		nights
			.map((n) => ({ ...n, date: new Date(n.day + 'T00:00:00Z') }))
			.filter((n) => !Number.isNaN(n.date.getTime()))
	);

	/** Spazio orizzontale di una notte; la scala rientra di mezzo slot per non far sbordare le barre agli estremi. */
	const slot = $derived.by(() => {
		if (rows.length < 2) return Math.min(28, innerW);
		const span = rows[rows.length - 1].date.getTime() - rows[0].date.getTime();
		const days = Math.max(1, Math.round(span / 86_400_000)) + 1;
		return innerW / days;
	});

	const x = $derived(
		scaleUtc()
			.domain(rows.length ? [rows[0].date, rows[rows.length - 1].date] : [new Date(), new Date()])
			.range([slot / 2, innerW - slot / 2])
	);

	const maxTotal = $derived(
		Math.max(
			1,
			...rows.map((n) => STAGES.reduce((sum, s) => sum + (n[s.key] ?? 0), 0))
		)
	);

	const y = $derived(scaleLinear().domain([0, maxTotal / 3600]).range([innerH, 0]).nice());

	const barW = $derived(Math.max(1, slot - 2));

	/**
	 * Segmenti impilati di una notte, dal basso verso l'alto, con 2px di
	 * superficie fra l'uno e l'altro. Solo l'ultimo segmento è marcato come
	 * cima: è l'unico che va arrotondato, così la pila resta una pila.
	 */
	function stack(night: (typeof rows)[number]) {
		const out: { y: number; h: number; color: string; label: string; sec: number; top: boolean }[] = [];
		let acc = 0;
		for (const s of STAGES) {
			const sec = night[s.key] ?? 0;
			if (sec <= 0) continue;
			const y0 = y(acc / 3600);
			const y1 = y((acc + sec) / 3600);
			const h = y0 - y1;
			if (h > 0) {
				out.push({ y: y1, h: Math.max(0.5, h - 2), color: s.color, label: s.label, sec, top: false });
			}
			acc += sec;
		}
		if (out.length) out[out.length - 1].top = true;
		return out;
	}

	const dateFormat = new Intl.DateTimeFormat('it-IT', {
		weekday: 'short',
		day: 'numeric',
		month: 'long',
		timeZone: 'UTC'
	});
	const tickFormat = $derived.by(() => {
		const span = rows.length ? rows[rows.length - 1].date.getTime() - rows[0].date.getTime() : 0;
		const days = span / 86_400_000;
		if (days > 300) return new Intl.DateTimeFormat('it-IT', { month: 'short', timeZone: 'UTC' });
		return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', timeZone: 'UTC' });
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
	const tooltipFlip = $derived(tooltipX > width - 150);
</script>

<div class="relative w-full" bind:clientWidth={width}>
	{#if !rows.length}
		<div class="flex flex-col items-center justify-center gap-2 text-ink-3" style="height: {height}px">
			<Icon name="sleep" size={22} />
			<p class="text-sm">Nessuna notte registrata in questo periodo</p>
		</div>
	{:else}
		<!-- SVG in assoluto: vedi la nota in TimeChart, stessa ragione. -->
		<div class="relative" style="height: {height}px">
		<svg
			{width}
			{height}
			role="img"
			aria-label="Fasi del sonno per notte"
			onpointermove={onMove}
			onpointerleave={() => (hovered = null)}
			class="absolute inset-0 touch-pan-y select-none"
		>
			<g transform="translate({PAD.left},{PAD.top})">
				{#each y.ticks(4) as tick (tick)}
					<line x1="0" x2={innerW} y1={y(tick)} y2={y(tick)} stroke="var(--color-grid)" stroke-width="1" />
					<text x="-8" y={y(tick)} text-anchor="end" dominant-baseline="middle" class="fill-ink-3 font-mono text-[10px]">
						{tick}h
					</text>
				{/each}

				{#each rows as night, i (night.day)}
					{@const segs = stack(night)}
					<g opacity={hovered == null || hovered === i ? 1 : 0.45}>
						{#each segs as seg, si (si)}
							<path
								d={barPath(x(night.date) - barW / 2, seg.y, barW, seg.h, seg.top ? 4 : 0)}
								fill={seg.color}
								class="[animation:rise_.5s_var(--ease-settle)_both]"
								style="animation-delay: {Math.min(i * 5, 250)}ms; transform-box: fill-box; transform-origin: bottom;"
							/>
						{/each}
					</g>
				{/each}

				{#each x.ticks(Math.min(6, Math.max(2, rows.length))) as tick (tick.getTime())}
					<text x={x(tick)} y={innerH + 16} text-anchor="middle" class="fill-ink-3 font-mono text-[10px]">
						{tickFormat.format(tick)}
					</text>
				{/each}
			</g>
		</svg>
		</div>

		{#if active}
			<div
				class="pointer-events-none absolute top-1 z-10 rounded-lg border border-line-strong bg-panel-2/95 px-2.5 py-2 shadow-lg shadow-black/40 backdrop-blur-sm"
				style="left: {tooltipX}px; transform: translateX({tooltipFlip ? '-100%' : '0'})"
			>
				<p class="text-[10px] whitespace-nowrap text-ink-3">{dateFormat.format(active.date)}</p>
				<p class="font-mono text-sm font-medium whitespace-nowrap text-ink">
					{formatDuration(active.asleepSec)} di sonno
				</p>
				<dl class="mt-1.5 space-y-0.5">
					{#each STAGES as stage (stage.key)}
						{@const sec = active[stage.key] ?? 0}
						{#if sec > 0}
							<div class="flex items-center gap-2 text-[11px] whitespace-nowrap">
								<span class="size-1.5 rounded-full" style="background: {stage.color}"></span>
								<dt class="text-ink-3">{stage.label}</dt>
								<dd class="ml-auto font-mono text-ink-2">{formatDuration(sec)}</dd>
							</div>
						{/if}
					{/each}
				</dl>
			</div>
		{/if}

		<!-- Con quattro segmenti la legenda è obbligatoria: il colore da solo non basta a dire quale fase è quale. -->
		<ul class="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
			{#each STAGES as stage (stage.key)}
				<li class="flex items-center gap-1.5 text-xs text-ink-2">
					<span class="size-2 rounded-[3px]" style="background: {stage.color}"></span>
					{stage.label}
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	@keyframes rise {
		from {
			transform: scaleY(0);
			opacity: 0;
		}
		to {
			transform: scaleY(1);
			opacity: 1;
		}
	}
</style>
