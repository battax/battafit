<script lang="ts" module>
	/**
	 * Set di icone disegnate a mano, tutte sulla stessa griglia 24×24 e con lo
	 * stesso tratto da 1.5. Non usiamo emoji: cambiano forma su ogni sistema
	 * operativo, non ereditano il colore del testo e non si allineano fra loro.
	 */
	export const ICONS = {
		// ── Navigazione ──────────────────────────────────────────────────────
		overview: 'M4 13a8 8 0 0 1 16 0M12 13l4-3',
		activity: 'M3 12h3.5l2-6 3.5 12 2.5-8 1.8 4H21',
		workouts: 'M6.5 7v10M17.5 7v10M4 9.5v5M20 9.5v5M6.5 12h11',
		heart: 'M12 20s-7-4.4-7-9.3A4.2 4.2 0 0 1 12 8a4.2 4.2 0 0 1 7 2.7c0 4.9-7 9.3-7 9.3Z',
		sleep: 'M19 14.8A8 8 0 0 1 9.2 5a7.5 7.5 0 1 0 9.8 9.8Z',
		body: 'M12 7.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM9 21v-5l-1.5-1 1-4.5A3 3 0 0 1 11.4 8h1.2a3 3 0 0 1 2.9 2.5l1 4.5-1.5 1v5',
		/* Il ginocchio in profilo: femore, articolazione, tibia. Lo scarto fra i
		   due segmenti è quello che lo distingue da un nodo qualsiasi. */
		knee: 'M10 3v5.2M14 15.8V21M15.5 12a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0',

		// ── Interfaccia ──────────────────────────────────────────────────────
		chevronRight: 'm9.5 6 6 6-6 6',
		chevronLeft: 'm14.5 6-6 6 6 6',
		chevronDown: 'm6 9.5 6 6 6-6',
		arrowUp: 'M12 19V5M6.5 10.5 12 5l5.5 5.5',
		arrowDown: 'M12 5v14M6.5 13.5 12 19l5.5-5.5',
		calendar: 'M5 7.5h14v12H5zM5 11h14M8.5 4.5v4M15.5 4.5v4',
		logout: 'M14 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2M10 12h10M17 9l3 3-3 3',
		close: 'm7 7 10 10M17 7 7 17',
		flame: 'M12 21a5 5 0 0 0 5-5c0-4-3-5-2.5-9C11 9 12.5 11 11 13c-1 1.3-2-.5-2-2a5.6 5.6 0 0 0-2 4.5A5 5 0 0 0 12 21Z',
		clock: 'M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM12 8v4.3l2.8 1.7',
		route: 'M6.5 8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM17.5 20.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM6.5 8.5v3a3 3 0 0 0 3 3h5a3 3 0 0 1 3 3v0',
		mountain: 'm3 18 5.5-9 3.5 5.5 2.5-4L21 18H3Z',
		empty: 'M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM9.5 9.5h.01M14.5 9.5h.01M9 15.5a4 4 0 0 1 6 0',
		warning: 'M12 4.5 21 19H3l9-14.5ZM12 10v4M12 16.5h.01',
		check: 'm5 12.5 4.5 4.5L19 7',
		plus: 'M12 5v14M5 12h14',
		trash: 'M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5h9L17.5 7M10 10.5v6M14 10.5v6',
		note: 'M6 3.5h8.5L19 8v12.5H6zM14 3.5V8h5M9 12h7M9 15.5h5',
		ruler: 'm3.5 14.5 11-11 5 5-11 11zM7 11l2 2M10 8l2 2M13 5l2 2',
		stethoscope: 'M6 3.5v4.2a4 4 0 0 0 8 0V3.5M10 15.7v1.1a4.2 4.2 0 0 0 8.4 0v-2.3M18.4 12.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2ZM10 11.7v4M4.5 3.5h3M12.5 3.5h3',

		// ── Tipi di allenamento ──────────────────────────────────────────────
		run: 'M14.5 6a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM9 21l2.5-5-2.5-2.5 1-4.5 3.5-1 2.5 3 3 1M11 9 7 10.5l-1 3.5M13.5 16.5l1.5 4.5',
		walk: 'M13 6a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM10 21l2-5-2-2.5 1-5 3 1.5 1.5 3.5 2.5 1M12 10l-3 1.5-1 3.5M14 16.5l1 4.5',
		bike: 'M6 19.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM18 19.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM6 16l4.5-5.5H15M14 6.5h2.5L18 16M10.5 10.5 13 6.5',
		swim: 'M3 17.5c1.5 0 1.5 1.2 3 1.2s1.5-1.2 3-1.2 1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2M7 13.5l4-3-2.5-2.5M16.5 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM11 10.5h4',
		strength: 'M4 10v4M7 8v8M17 8v8M20 10v4M7 12h10',
		yoga: 'M12 6a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM12 8v5M12 13l-4 3M12 13l4 3M8 10.5h8',
		hiit: 'M13 3 5 14h6l-1 7 8-11h-6l1-7Z',
		hike: 'M13 6a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM10 21v-5l-1.5-2 1-4.5 3-1 2 3.5 2.5 1M17 8.5V21',
		row: 'M4 18.5h16M7 15l4.5-4.5M11.5 10.5 16 6M14 6h3v3M6.5 16.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
		ball: 'M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM4.5 9.5c3 1.5 5 4 5.5 9M19.5 9.5c-3 1.5-5 4-5.5 9M12 4c-1.5 2.5-4 4-7.5 4.5M12 4c1.5 2.5 4 4 7.5 4.5',
		stairs: 'M4 20h4v-4h4v-4h4V8h4',
		generic: 'M6.5 7v10M17.5 7v10M4 9.5v5M20 9.5v5M6.5 12h11'
	} as const;

	export type IconName = keyof typeof ICONS;
</script>

<script lang="ts">
	interface Props {
		name: IconName;
		size?: number;
		class?: string;
		/** Le icone puramente decorative restano invisibili agli screen reader. */
		title?: string;
	}

	let { name, size = 20, class: className = '', title }: Props = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="1.5"
	stroke-linecap="round"
	stroke-linejoin="round"
	class={className}
	role={title ? 'img' : 'presentation'}
	aria-hidden={title ? undefined : 'true'}
	aria-label={title}
>
	{#if title}<title>{title}</title>{/if}
	<path d={ICONS[name]} />
</svg>
