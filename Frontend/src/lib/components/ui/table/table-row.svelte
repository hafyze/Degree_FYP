<script lang="ts">
	import { cn, type WithElementRef } from '$lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLTableRowElement>, HTMLTableRowElement> = $props();
</script>

<tr
	bind:this={ref}
	data-slot="table-row"
	class={cn('border-b border-white/10 transition-colors hover:bg-white/[0.03]', className)}
	{...restProps}
>
	{@render children?.()}
</tr>
