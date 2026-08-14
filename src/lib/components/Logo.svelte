<script lang="ts">
	/**
	 * Il marchio dell'app.
	 *
	 * L'icona è la grafica fornita, servita a 64px: alle misure della barra di
	 * navigazione (22–28px) resta nitida anche su schermi a densità doppia
	 * senza trascinarsi dietro il file da mezzo megabyte della versione grande.
	 */

	interface Props {
		size?: number;
		showWordmark?: boolean;
	}

	let { size = 24, showWordmark = true }: Props = $props();
</script>

<span class="inline-flex items-center gap-2.5">
	<img
		src="/battafit-icon-64.webp"
		alt=""
		width={size}
		height={size}
		class="shrink-0 rounded-[22%]"
		style="width: {size}px; height: {size}px"
	/>
	{#if showWordmark}
		<span class="text-[15px] font-semibold tracking-[-0.02em] text-ink">
			Batta<span class="text-motion">Fit</span>
		</span>
	{/if}
</span>
