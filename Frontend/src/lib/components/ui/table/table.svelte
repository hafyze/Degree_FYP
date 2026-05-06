<script lang="ts">
	import { cn, type WithElementRef } from '$lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>, HTMLDivElement> = $props();
</script>

<div
	bind:this={ref}
	data-slot="table-wrapper"
	class={cn('relative w-full overflow-x-auto', className)}
	{...restProps}
>
	<table data-slot="table" class="w-full caption-bottom text-sm">
		{@render children?.()}
	</table>
</div>
