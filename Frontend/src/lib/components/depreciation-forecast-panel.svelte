<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import * as Chart from '$lib/components/ui/chart';
	import * as Carousel from '$lib/components/ui/carousel';
	import * as Popover from '$lib/components/ui/popover';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		ChartLineData02Icon,
		InformationCircleIcon
	} from '@hugeicons/core-free-icons';
	import {
		LineChart,
		Tooltip as LayerTooltip
	} from 'layerchart';
	import {
		drivetrainLabels,
		formatEngineCapacity,
		formatCurrency,
		formatFuelUsageEstimate,
		formatLoss,
		formatOdometer,
		formatPercent
	} from '$lib/features/vehicle-recommendation/helpers';
	import { getRecommendationImages } from '$lib/features/vehicle-recommendation/car-images';
	import type {
		DepreciationMetric,
		DepreciationViewPoint,
		Recommendation
	} from '$lib/features/vehicle-recommendation/types';

	type Props = {
		selectedRecommendation: Recommendation | null;
		isLoadingDepreciation: boolean;
		depreciationError: string;
		depreciationViewData: DepreciationViewPoint[];
		selectedUsageLabel: string;
		depreciationMetric: DepreciationMetric;
		depreciationCaption: string;
	};

	let {
		selectedRecommendation,
		isLoadingDepreciation,
		depreciationError,
		depreciationViewData,
		selectedUsageLabel,
		depreciationMetric,
		depreciationCaption
	}: Props = $props();

	const dispatch = createEventDispatcher<{
		metricChange: DepreciationMetric;
	}>();

	const chartConfig = {
		depreciation: {
			label: 'Predicted value',
			color: '#0f172a'
		}
	} satisfies Chart.ChartConfig;

	let chartContext = $state<any>(null);

	const hoveredDepreciationPoint = $derived(
		(chartContext?.tooltip?.data as DepreciationViewPoint | null | undefined) ?? null
	);
	const activeDepreciationPoint = $derived.by(
		() => hoveredDepreciationPoint ?? depreciationViewData[depreciationViewData.length - 1] ?? null
	);
	const currentCarAge = $derived(depreciationViewData[0]?.car_age ?? null);
	const finalCarAge = $derived(
		depreciationViewData.length > 0 ? depreciationViewData[depreciationViewData.length - 1]?.car_age ?? null : null
	);
	const oneYearPoint = $derived(depreciationViewData[1] ?? null);
	const threeYearPoint = $derived(depreciationViewData[3] ?? null);
	const fiveYearPoint = $derived(
		depreciationViewData[5] ?? depreciationViewData[depreciationViewData.length - 1] ?? null
	);
	const selectedRecommendationImages = $derived.by(() =>
		selectedRecommendation ? getRecommendationImages(selectedRecommendation) : null
	);
</script>

<section id="depreciation-section" class="depreciation-panel mt-4 rounded-[1.5rem] border border-border bg-card p-4 text-foreground shadow-sm sm:mt-6 sm:rounded-[2rem] sm:p-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
		<div class="flex items-start gap-3">
			<div class="flex size-11 items-center justify-center rounded-2xl border border-border bg-muted/50 text-foreground">
				<HugeiconsIcon icon={ChartLineData02Icon} class="size-5" />
			</div>
			<div>
				<p class="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase sm:text-sm">Depreciation</p>
				<h2 class="mt-1.5 text-xl font-black tracking-[-0.04em] text-foreground sm:mt-2 sm:text-2xl">Projected value trend</h2>
			</div>
		</div>
		{#if selectedRecommendation}
			<div class="text-sm text-muted-foreground">
				<span class="font-semibold text-foreground">{selectedRecommendation.manufacturer_name} {selectedRecommendation.model_name}</span>
				<span> · {selectedRecommendation.year_produced || 'Year unknown'} · ${selectedRecommendation.price_usd.toLocaleString()}</span>
			</div>
		{/if}
	</div>

	{#if selectedRecommendation}
		<div class="mt-4 grid gap-3 sm:gap-4 lg:grid-cols-[0.95fr_1.05fr]">
			<div class="order-2 rounded-[1.2rem] border border-white/10 bg-black p-4 sm:rounded-[1.4rem] sm:p-5 lg:order-1">
				<p class="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
					Selected recommendation
				</p>
				<h3 class="mt-2 text-xl font-black tracking-[-0.04em] text-white sm:text-2xl">
					{selectedRecommendation.manufacturer_name} {selectedRecommendation.model_name}
				</h3>
				<p class="mt-2 text-sm leading-6 text-slate-400">
					{selectedRecommendation.body_type} · {selectedRecommendation.year_produced || 'Year unknown'} · {selectedRecommendation.transmission || 'Transmission unknown'}
				</p>

				<div class="mt-4 grid gap-2 sm:mt-5 sm:grid-cols-2 sm:gap-3">
					<div class="rounded-[1rem] border border-white/10 bg-neutral-950 px-4 py-3">
						<p class="text-xs text-slate-500">Current price</p>
						<p class="mt-1 text-base font-semibold text-white">
							{formatCurrency(selectedRecommendation.price_usd)}
						</p>
					</div>
					<div class="rounded-[1rem] border border-white/10 bg-neutral-950 px-4 py-3">
						<p class="text-xs text-slate-500">Drivetrain</p>
						<p class="mt-1 text-base font-semibold text-white">
							{drivetrainLabels[selectedRecommendation.drivetrain ?? ''] ?? selectedRecommendation.drivetrain ?? 'Unknown'}
						</p>
					</div>
					<div class="rounded-[1rem] border border-white/10 bg-neutral-950 px-4 py-3">
						<p class="text-xs text-slate-500">Fuel</p>
						<p class="mt-1 text-base font-semibold text-white">
							{selectedRecommendation.engine_fuel || 'Unknown'}
						</p>
					</div>
					<div class="rounded-[1rem] border border-white/10 bg-neutral-950 px-4 py-3">
						<p class="text-xs text-slate-500">Odometer</p>
						<p class="mt-1 text-base font-semibold text-white">
							{formatOdometer(selectedRecommendation.odometer_value)}
						</p>
					</div>
					<div class="rounded-[1rem] border border-white/10 bg-neutral-950 px-4 py-3">
						<div class="flex items-center gap-2">
							<p class="text-xs text-slate-500">Estimated fuel use</p>
							<Popover.Root>
								<Popover.Trigger
									class="inline-flex size-4 items-center justify-center rounded-full text-slate-500 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-slate-700"
									aria-label="Show fuel estimate basis"
								>
									<HugeiconsIcon icon={InformationCircleIcon} class="size-4" />
								</Popover.Trigger>
								<Popover.Content
									sideOffset={8}
									class="max-w-56 border-white/10! bg-neutral-950! px-3 py-2 text-sm leading-5 text-slate-200! shadow-xl"
								>
									{selectedRecommendation.fuel_estimate_note || 'Estimated from engine and vehicle attributes.'}
								</Popover.Content>
							</Popover.Root>
						</div>
						<div class="mt-1 flex items-center gap-2 text-base font-semibold text-white">
							<span>{formatFuelUsageEstimate(selectedRecommendation.estimated_fuel_usage_l_per_100km)}</span>
						</div>
					</div>
					<div class="rounded-[1rem] border border-white/10 bg-neutral-950 px-4 py-3">
						<p class="text-xs text-slate-500">Engine capacity</p>
						<p class="mt-1 text-base font-semibold text-white">
							{formatEngineCapacity(selectedRecommendation.engine_capacity)}
						</p>
					</div>
				</div>
			</div>

			<div class="order-1 rounded-[1.2rem] border border-white/10 bg-black p-2.5 sm:rounded-[1.4rem] sm:p-3 lg:order-2">
				{#if selectedRecommendationImages}
					<Carousel.Root opts={{ loop: true }} class="overflow-hidden rounded-[1.15rem]">
						<Carousel.Content>
							{#each selectedRecommendationImages.images as image}
								<Carousel.Item>
									<figure class="relative overflow-hidden rounded-[1.15rem] border border-white/10 bg-neutral-950">
										<img
											src={image.src}
											alt={image.alt}
											class="aspect-16/10 w-full object-cover"
											loading="lazy"
										/>
										<figcaption class="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2 rounded-full border border-white/10 bg-black/70 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur sm:inset-x-3 sm:bottom-3 sm:px-4 sm:py-2 sm:text-xs">
											<span>{image.label}</span>
											<span class="text-slate-300">{selectedRecommendation.manufacturer_name} {selectedRecommendation.model_name}</span>
										</figcaption>
									</figure>
								</Carousel.Item>
							{/each}
						</Carousel.Content>
						<Carousel.Previous class="inset-s-2 top-1/2 size-8 -translate-y-1/2 border-white/15 bg-black/70 text-white hover:bg-black/90 sm:inset-s-3 sm:size-9" />
						<Carousel.Next class="inset-e-2 top-1/2 size-8 -translate-y-1/2 border-white/15 bg-black/70 text-white hover:bg-black/90 sm:inset-e-3 sm:size-9" />
					</Carousel.Root>
				{:else}
					<div class="flex aspect-16/10 flex-col items-center justify-center rounded-[1.15rem] border border-dashed border-white/10 bg-neutral-950 p-6 text-center">
						<p class="text-sm font-semibold text-white">Images not available for this car yet.</p>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<div class="mt-4">
		{#if selectedRecommendation && isLoadingDepreciation}
			<div class="rounded-[1.4rem] border border-white/10 bg-black p-5 text-sm leading-6 text-slate-400">
				Loading model-based depreciation forecast...
			</div>
		{:else if selectedRecommendation && depreciationError}
			<div class="rounded-[1.4rem] border border-red-500/20 bg-red-500/10 p-5 text-sm leading-6 text-red-200">
				{depreciationError}
			</div>
		{:else if selectedRecommendation && depreciationViewData.length > 0}
			<div class="mb-4 flex flex-wrap gap-2 text-xs text-slate-400 sm:gap-3 sm:text-sm">
				<div class="rounded-full border border-white/10 bg-black px-4 py-2">
					Usage: <span class="font-semibold text-white">{selectedUsageLabel}</span>
				</div>
				<div class="rounded-full border border-dashed border-sky-400/30 bg-sky-500/10 px-4 py-2 text-sky-100">
					Baseline: <span class="font-semibold text-white">{formatCurrency(selectedRecommendation.price_usd)}</span>
				</div>
				<div class="rounded-full border border-white/10 bg-black px-4 py-2">
					Estimated 5-year drop:
					<span class="font-semibold text-white">
						{formatPercent(fiveYearPoint?.depreciation_percent ?? 0)}
					</span>
				</div>
			</div>

			<div class="mb-4 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
				<div class="grid gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
					<div class="rounded-[1rem] border border-white/10 bg-black px-4 py-3 sm:rounded-[1.2rem]">
						<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">Current price</p>
						<p class="mt-2 text-base font-bold text-white sm:text-lg">{formatCurrency(selectedRecommendation.price_usd)}</p>
					</div>
					<div class="rounded-[1rem] border border-white/10 bg-black px-4 py-3 sm:rounded-[1.2rem]">
						<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">1-year loss</p>
						<p class="mt-2 text-base font-bold text-white sm:text-lg">
							{formatLoss(
								typeof oneYearPoint?.predicted_price_usd === 'number'
									? selectedRecommendation.price_usd - oneYearPoint.predicted_price_usd
									: null
							)}
						</p>
					</div>
					<div class="rounded-[1rem] border border-white/10 bg-black px-4 py-3 sm:rounded-[1.2rem]">
						<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">3-year loss</p>
						<p class="mt-2 text-base font-bold text-white sm:text-lg">
							{formatLoss(
								typeof threeYearPoint?.predicted_price_usd === 'number'
									? selectedRecommendation.price_usd - threeYearPoint.predicted_price_usd
									: null
							)}
						</p>
					</div>
					<div class="rounded-[1rem] border border-white/10 bg-black px-4 py-3 sm:rounded-[1.2rem]">
						<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">5-year loss</p>
						<p class="mt-2 text-base font-bold text-white sm:text-lg">
							{formatLoss(
								typeof fiveYearPoint?.predicted_price_usd === 'number'
									? selectedRecommendation.price_usd - fiveYearPoint.predicted_price_usd
									: null
							)}
						</p>
					</div>
					<div class="rounded-[1rem] border border-white/10 bg-black px-4 py-3 sm:rounded-[1.2rem]">
						<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">Current age</p>
						<p class="mt-2 text-base font-bold text-white sm:text-lg">
							{currentCarAge !== null ? `${currentCarAge} years` : 'N/A'}
						</p>
					</div>
					<div class="rounded-[1rem] border border-white/10 bg-black px-4 py-3 sm:rounded-[1.2rem]">
						<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">Final projected age</p>
						<p class="mt-2 text-base font-bold text-white sm:text-lg">
							{finalCarAge !== null ? `${finalCarAge} years` : 'N/A'}
						</p>
					</div>
				</div>

				<div class="rounded-[1.2rem] border border-white/10 bg-black px-4 py-4 sm:rounded-[1.4rem]">
					<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
						<div>
							<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">Selected year</p>
							<p class="mt-2 text-xl font-bold text-white">{activeDepreciationPoint?.year ?? 'N/A'}</p>
						</div>
						<div class="w-fit rounded-full border border-white/10 bg-neutral-950 px-3 py-1 text-xs font-semibold text-slate-300">
							{hoveredDepreciationPoint ? 'Hovering point' : 'Latest forecast'}
						</div>
					</div>

					<div class="mt-4 grid gap-3 sm:grid-cols-2">
						<div>
							<p class="text-xs text-slate-500">Projected value</p>
							<p class="mt-1 text-base font-semibold text-white">
								{activeDepreciationPoint ? formatCurrency(activeDepreciationPoint.predicted_price_usd) : 'N/A'}
							</p>
						</div>
						<div>
							<p class="text-xs text-slate-500">Depreciation</p>
							<p class="mt-1 text-base font-semibold text-white">
								{activeDepreciationPoint ? formatPercent(activeDepreciationPoint.depreciation_percent, 1) : 'N/A'}
							</p>
						</div>
						<div>
							<p class="text-xs text-slate-500">Annual loss vs prior year</p>
							<p class="mt-1 text-base font-semibold text-white">
								{activeDepreciationPoint ? formatLoss(activeDepreciationPoint.annual_loss_usd) : 'N/A'}
							</p>
						</div>
						<div>
							<p class="text-xs text-slate-500">Projected odometer</p>
							<p class="mt-1 text-base font-semibold text-white">
								{activeDepreciationPoint ? formatOdometer(activeDepreciationPoint.odometer_value) : 'N/A'}
							</p>
						</div>
					</div>
				</div>
			</div>

			<div class="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
				<div class="grid grid-cols-2 rounded-full border border-white/10 bg-black p-1 sm:inline-flex">
					<button
						type="button"
						class={`rounded-full px-3 py-2 text-sm font-semibold transition sm:px-4 ${
							depreciationMetric === 'price'
								? 'bg-white text-black'
								: 'text-slate-400 hover:text-white'
						}`}
						onclick={() => dispatch('metricChange', 'price')}
					>
						Price (USD)
					</button>
					<button
						type="button"
						class={`rounded-full px-3 py-2 text-sm font-semibold transition sm:px-4 ${
							depreciationMetric === 'depreciation'
								? 'bg-white text-black'
								: 'text-slate-400 hover:text-white'
						}`}
						onclick={() => dispatch('metricChange', 'depreciation')}
					>
						Depreciation (%)
					</button>
				</div>

				<p class="text-sm text-slate-500">
					<span class="block sm:hidden">
						Hold the line to inspect each forecast year in more detail.
					</span>
					<span class="hidden sm:block">
						Hover the line to inspect each forecast year in more detail.
					</span>
				</p>
			</div>

			<Chart.ChartContainer config={chartConfig} class="h-64 w-full sm:h-80">
				<LineChart
					bind:context={chartContext}
					data={depreciationViewData}
					x="year"
					y="chart_value"
					highlight={{
						lines: { stroke: 'rgba(148, 163, 184, 0.4)' },
						points: { r: 6, fill: '#ffffff', stroke: '#0f172a', strokeWidth: 2 }
					}}
					series={[
						{
							key: 'depreciation',
							label: depreciationMetric === 'price' ? 'Predicted value' : 'Depreciation',
							value: 'chart_value',
							color: 'var(--color-depreciation)'
						}
					]}
					tooltipContext={{ mode: 'quadtree-x' }}
					props={{
						xAxis: { format: (value: unknown) => `${value ?? ''}` },
						yAxis: {
							format: (value: unknown) =>
								typeof value === 'number'
									? depreciationMetric === 'price'
										? formatCurrency(value)
										: formatPercent(value, 0)
									: `${value ?? ''}`
						},
						tooltip: { root: { class: 'depreciation-tooltip-root' } }
					}}
				>
					{#snippet tooltip({ context })}
						<LayerTooltip.Root {context} class="depreciation-tooltip-root">
							{#snippet children({ data })}
								<LayerTooltip.Header value={data?.year} color="var(--color-depreciation)" />
								<LayerTooltip.List>
									<LayerTooltip.Item
										label="Predicted value"
										value={formatCurrency(data?.predicted_price_usd ?? 0)}
										color="var(--color-depreciation)"
										valueAlign="right"
									/>
									<LayerTooltip.Item
										label="Depreciation"
										value={formatPercent(data?.depreciation_percent ?? 0, 1)}
										valueAlign="right"
									/>
									<LayerTooltip.Item
										label="Value retained"
										value={formatPercent(data?.value_retention_percent ?? 0, 1)}
										valueAlign="right"
									/>
									<LayerTooltip.Item
										label="Car age"
										value={typeof data?.car_age === 'number' ? `${data.car_age} years` : 'N/A'}
										valueAlign="right"
									/>
									<LayerTooltip.Item
										label="Projected odometer"
										value={formatOdometer(data?.odometer_value)}
										valueAlign="right"
									/>
									<LayerTooltip.Item
										label="Annual loss"
										value={formatLoss(data?.annual_loss_usd)}
										valueAlign="right"
									/>
								</LayerTooltip.List>
							{/snippet}
						</LayerTooltip.Root>
					{/snippet}
				</LineChart>
			</Chart.ChartContainer>

			<p class="mt-4 text-sm leading-6 text-slate-400">
				{depreciationCaption}
			</p>
		{:else}
			<div class="rounded-[1.4rem] border border-dashed border-white/10 bg-black p-5 text-sm leading-6 text-slate-500">
				Choose a recommended car to see its projected depreciation trend.
			</div>
		{/if}
	</div>
</section>

<style>
	:global(html:not(.dark) .depreciation-panel [class~='bg-black']),
	:global(html:not(.dark) .depreciation-panel [class~='bg-neutral-950']) {
		background-color: var(--background) !important;
	}

	:global(html:not(.dark) .depreciation-panel [class*='bg-black/']) {
		background-color: color-mix(in oklch, var(--background) 88%, transparent) !important;
	}

	:global(html:not(.dark) .depreciation-panel [class*='border-white']) {
		border-color: var(--border) !important;
	}

	:global(html:not(.dark) .depreciation-panel [class~='bg-white/5']) {
		background-color: var(--muted) !important;
	}

	:global(html:not(.dark) .depreciation-panel [class*='text-white']),
	:global(html:not(.dark) .depreciation-panel [class*='text-slate-200']),
	:global(html:not(.dark) .depreciation-panel [class*='text-slate-300']) {
		color: var(--foreground) !important;
	}

	:global(html:not(.dark) .depreciation-panel [class*='text-slate-400']),
	:global(html:not(.dark) .depreciation-panel [class*='text-slate-500']) {
		color: var(--muted-foreground) !important;
	}
	:global(.depreciation-tooltip-root) {
		z-index: 20;
		background: rgba(10, 10, 10, 0.96);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 1rem;
		box-shadow: 0 18px 48px rgba(0, 0, 0, 0.45);
		color: white;
	}

	:global(.depreciation-tooltip-root .lc-tooltip-header) {
		color: white;
		font-weight: 700;
	}

	:global(.depreciation-tooltip-root .lc-tooltip-item-label) {
		color: rgb(148 163 184);
	}

	:global(.depreciation-tooltip-root .lc-tooltip-item-value) {
		color: white;
		font-weight: 600;
	}

	:global(.depreciation-tooltip-root .lc-tooltip-item-color) {
		border-color: rgba(255, 255, 255, 0.8);
	}
</style>
