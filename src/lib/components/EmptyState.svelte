<script lang="ts">
	import Icon, { type IconName } from './Icon.svelte';

	interface Props {
		icon?: IconName;
		title: string;
		description?: string;
		children?: import('svelte').Snippet;
	}

	let { icon = 'empty', title, description, children }: Props = $props();
</script>

<div class="panel flex flex-col items-center gap-3 px-6 py-12 text-center">
	<span class="rounded-full bg-panel-2 p-3 text-ink-3">
		<Icon name={icon} size={22} />
	</span>
	<div>
		<p class="font-medium text-ink">{title}</p>
		{#if description}
			<p class="mx-auto mt-1 max-w-md text-sm text-balance text-ink-2">{description}</p>
		{/if}
	</div>
	{@render children?.()}
</div>
