<script lang="ts">
	import { Slider as SliderPrimitive } from "bits-ui";
	import { cn, type WithoutChildrenOrChild } from "$lib/utils.js";

	type SliderValue = number | number[];

	let {
		ref = $bindable(null),
		value = $bindable(),
		orientation = "horizontal",
		showThumbLabels = false,
		thumbLabelFormatter = (thumbValue: number) => `${thumbValue}`,
		class: className,
		...restProps
	}: WithoutChildrenOrChild<SliderPrimitive.RootProps> & {
		showThumbLabels?: boolean;
		thumbLabelFormatter?: (thumbValue: number, thumbIndex: number, currentValue: SliderValue) => string;
	} = $props();
</script>

<!--
Discriminated Unions + Destructing (required for bindable) do not
get along, so we shut typescript up by casting `value` to `never`.
-->
<SliderPrimitive.Root
	bind:ref
	bind:value={value as never}
	data-slot="slider"
	{orientation}
	class={cn(
		"data-vertical:min-h-40 relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:w-auto data-vertical:flex-col",
		className
	)}
	{...restProps}
>
	{#snippet children({ thumbItems })}
		<span
			data-slot="slider-track"
			data-orientation={orientation}
			class={cn(
				"bg-muted rounded-4xl data-horizontal:h-3 data-horizontal:w-full data-vertical:h-full data-vertical:w-3 bg-muted relative grow overflow-hidden data-horizontal:w-full data-vertical:h-full"
			)}
		>
			<SliderPrimitive.Range
				data-slot="slider-range"
				class={cn(
					"bg-primary absolute select-none data-horizontal:h-full data-vertical:w-full"
				)}
			/>
		</span>
		{#each thumbItems as thumb (thumb)}
			<SliderPrimitive.Thumb
				data-slot="slider-thumb"
				index={thumb.index}
				class="border-border bg-background ring-ring/50 size-4 rounded-4xl border shadow-sm transition-colors hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden block shrink-0 select-none disabled:pointer-events-none disabled:opacity-50"
			>
				{#snippet children({ active })}
					{#if showThumbLabels && active}
						<SliderPrimitive.ThumbLabel
							index={thumb.index}
							position="top"
							class="pointer-events-none rounded-full border border-border bg-popover px-3 py-1 text-xs font-semibold whitespace-nowrap text-popover-foreground shadow-lg"
						>
							{thumbLabelFormatter(thumb.value, thumb.index, value as SliderValue)}
						</SliderPrimitive.ThumbLabel>
					{/if}
				{/snippet}
			</SliderPrimitive.Thumb>
		{/each}
	{/snippet}
</SliderPrimitive.Root>
