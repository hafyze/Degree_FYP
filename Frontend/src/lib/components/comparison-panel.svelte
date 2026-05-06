<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import * as Chart from '$lib/components/ui/chart';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		Cancel01Icon,
		ChartLineData02Icon,
		LeftToRightListNumberIcon
	} from '@hugeicons/core-free-icons';
	import {
		LineChart,
		Tooltip as LayerTooltip
	} from 'layerchart';
	import {
		drivetrainLabels,
		formatCurrency,
		formatFuelUsageEstimate,
		formatLoss,
		formatOdometer,
		formatPercent
	} from '$lib/features/vehicle-recommendation/helpers';
	import type {
		ComparisonChartPoint,
		ComparisonForecastState
	} from '$lib/features/vehicle-recommendation/types';

	type Props = {
		comparisonItems: ComparisonForecastState[];
		comparisonChartData: ComparisonChartPoint[];
		maxComparisonItems: number;
	};

	let {
		comparisonItems,
		comparisonChartData,
		maxComparisonItems
	}: Props = $props();

	const dispatch = createEventDispatcher<{
		removeComparison: string;
	}>();

	const comparisonColors = ['#f8fafc', '#38bdf8', '#f97316'];

	const readyComparisonItems = $derived(comparisonItems.filter((item) => !item.isLoading && !item.error));
	const canRenderComparison = $derived(readyComparisonItems.length >= 2 && comparisonChartData.length > 0);

	const chartConfig = $derived.by(() =>
		Object.fromEntries(
			readyComparisonItems.map((item, index) => [
				item.key,
				{
					label: item.label,
					color: comparisonColors[index % comparisonColors.length]
				}
			])
		)
	);

	const chartSeries = $derived(
		readyComparisonItems.map((item) => ({
			key: item.key,
			label: item.label,
			value: item.key,
			color: `var(--color-${item.key})`
		}))
	);

	function getSummaryPoints(points: ComparisonForecastState['points']) {
		return {
			oneYearPoint: points[1] ?? null,
			threeYearPoint: points[3] ?? null,
			fiveYearPoint: points[5] ?? points[points.length - 1] ?? null
		};
	}

	function getVisibleTooltipSeries(context: {
		tooltip?: { series?: Array<{ value: unknown; label: string; color?: string }> };
	}) {
		return context.tooltip?.series?.filter((series) => typeof series.value === 'number') ?? [];
	}
</script>

<section class="mt-4 rounded-[1.5rem] border border-white/10 bg-neutral-950 p-4 sm:mt-6 sm:rounded-[2rem] sm:p-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
		<div class="flex items-start gap-3">
			<div class="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white">
				<HugeiconsIcon icon={LeftToRightListNumberIcon} class="size-5" />
			</div>
			<div>
				<p class="text-xs font-semibold tracking-[0.18em] text-slate-400 uppercase sm:text-sm">Comparison</p>
				<h2 class="mt-1.5 text-xl font-black tracking-[-0.04em] text-white sm:mt-2 sm:text-2xl">
					Compare selected cars
				</h2>
			</div>
		</div>
		<div class="rounded-full border border-white/10 bg-black px-4 py-2 text-sm text-slate-300">
			{comparisonItems.length}/{maxComparisonItems} selected
		</div>
	</div>

	<div class="mt-4">
		{#if comparisonItems.length === 0}
			<div class="rounded-[1.4rem] border border-dashed border-white/10 bg-black p-5 text-sm leading-6 text-slate-500">
				Use the Compare button on recommendation cards to start a side-by-side view.
			</div>
		{:else}
			<div class="grid gap-3 xl:grid-cols-3">
				{#each comparisonItems as item, index (item.key)}
					{@const summary = getSummaryPoints(item.points)}
					<article class="rounded-[1.2rem] border border-white/10 bg-black p-4 sm:rounded-[1.4rem]">
						<div class="flex items-start justify-between gap-3">
							<div>
								<div class="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-neutral-950 px-3 py-1 text-xs font-semibold text-slate-300">
									<span
										class="inline-flex h-2.5 w-2.5 rounded-full"
										style={`background: ${comparisonColors[index % comparisonColors.length]};`}
									></span>
									Car {index + 1}
								</div>
								<h3 class="text-lg font-bold text-white">
									{item.car.manufacturer_name} {item.car.model_name}
								</h3>
								<p class="mt-1 text-sm text-slate-400">
									{item.car.body_type} · {item.car.year_produced || 'Year unknown'} ·
									{item.car.transmission || 'Transmission unknown'}
								</p>
							</div>
							<button
								type="button"
								class="inline-flex size-9 items-center justify-center rounded-full border border-white/10 bg-neutral-950 text-slate-400 transition hover:border-white/20 hover:text-white"
								onclick={() => dispatch('removeComparison', item.key)}
								aria-label={`Remove ${item.label} from comparison`}
							>
								<HugeiconsIcon icon={Cancel01Icon} class="size-4" />
							</button>
						</div>

						<div class="mt-4 grid gap-2 sm:grid-cols-2">
							<div class="rounded-[1rem] border border-white/10 bg-neutral-950 px-4 py-3">
								<p class="text-xs text-slate-500">Current price</p>
								<p class="mt-1 text-base font-semibold text-white">{formatCurrency(item.car.price_usd)}</p>
							</div>
							<div class="rounded-[1rem] border border-white/10 bg-neutral-950 px-4 py-3">
								<p class="text-xs text-slate-500">Drivetrain</p>
								<p class="mt-1 text-base font-semibold text-white">
									{drivetrainLabels[item.car.drivetrain ?? ''] ?? item.car.drivetrain ?? 'Unknown'}
								</p>
							</div>
							<div class="rounded-[1rem] border border-white/10 bg-neutral-950 px-4 py-3">
								<p class="text-xs text-slate-500">Fuel type</p>
								<p class="mt-1 text-base font-semibold text-white">{item.car.engine_fuel || 'Unknown'}</p>
							</div>
							<div class="rounded-[1rem] border border-white/10 bg-neutral-950 px-4 py-3">
								<p class="text-xs text-slate-500">Odometer</p>
								<p class="mt-1 text-base font-semibold text-white">{formatOdometer(item.car.odometer_value)}</p>
							</div>
							<div class="rounded-[1rem] border border-white/10 bg-neutral-950 px-4 py-3">
								<p class="text-xs text-slate-500">Fuel use</p>
								<p class="mt-1 text-base font-semibold text-white">
									{formatFuelUsageEstimate(item.car.estimated_fuel_usage_l_per_100km)}
								</p>
							</div>
							<div class="rounded-[1rem] border border-white/10 bg-neutral-950 px-4 py-3">
								<p class="text-xs text-slate-500">5-year retention</p>
								<p class="mt-1 text-base font-semibold text-white">
									{summary.fiveYearPoint ? formatPercent(summary.fiveYearPoint.value_retention_percent, 1) : 'N/A'}
								</p>
							</div>
						</div>

						{#if item.isLoading}
							<div class="mt-4 rounded-[1rem] border border-white/10 bg-neutral-950 px-4 py-3 text-sm text-slate-400">
								Loading depreciation forecast...
							</div>
						{:else if item.error}
							<div class="mt-4 rounded-[1rem] border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
								{item.error}
							</div>
						{:else}
							<div class="mt-4 grid gap-2 sm:grid-cols-2">
								<div class="rounded-[1rem] border border-white/10 bg-neutral-950 px-4 py-3">
									<p class="text-xs text-slate-500">1-year loss</p>
									<p class="mt-1 text-base font-semibold text-white">
										{formatLoss(
											summary.oneYearPoint
												? item.car.price_usd - summary.oneYearPoint.predicted_price_usd
												: null
										)}
									</p>
								</div>
								<div class="rounded-[1rem] border border-white/10 bg-neutral-950 px-4 py-3">
									<p class="text-xs text-slate-500">3-year loss</p>
									<p class="mt-1 text-base font-semibold text-white">
										{formatLoss(
											summary.threeYearPoint
												? item.car.price_usd - summary.threeYearPoint.predicted_price_usd
												: null
										)}
									</p>
								</div>
								<div class="rounded-[1rem] border border-white/10 bg-neutral-950 px-4 py-3">
									<p class="text-xs text-slate-500">5-year loss</p>
									<p class="mt-1 text-base font-semibold text-white">
										{formatLoss(
											summary.fiveYearPoint
												? item.car.price_usd - summary.fiveYearPoint.predicted_price_usd
												: null
										)}
									</p>
								</div>
								<div class="rounded-[1rem] border border-white/10 bg-neutral-950 px-4 py-3">
									<p class="text-xs text-slate-500">Projected 5-year value</p>
									<p class="mt-1 text-base font-semibold text-white">
										{summary.fiveYearPoint ? formatCurrency(summary.fiveYearPoint.predicted_price_usd) : 'N/A'}
									</p>
								</div>
							</div>
						{/if}
					</article>
				{/each}
			</div>

			{#if comparisonItems.length === 1}
				<div class="mt-4 rounded-[1.4rem] border border-dashed border-white/10 bg-black p-5 text-sm leading-6 text-slate-500">
					Add at least one more car to unlock the comparison chart.
				</div>
			{:else if canRenderComparison}
				<div class="mt-4 rounded-[1.2rem] border border-white/10 bg-black p-4 sm:rounded-[1.4rem] sm:p-5">
					<div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div class="flex items-start gap-3">
							<div class="flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white">
								<HugeiconsIcon icon={ChartLineData02Icon} class="size-4" />
							</div>
							<div>
								<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">Value forecast</p>
								<p class="mt-1 text-base font-bold text-white">Projected depreciation comparison</p>
							</div>
						</div>
						<p class="text-sm text-slate-500">Hover the chart to compare projected value by year.</p>
					</div>

					<Chart.ChartContainer config={chartConfig} class="h-64 w-full sm:h-80">
						<LineChart
							data={comparisonChartData}
							x="year"
							y={readyComparisonItems[0]?.key}
							series={chartSeries}
							highlight={{
								lines: { stroke: 'rgba(148, 163, 184, 0.4)' },
								points: { r: 6, fill: '#ffffff', stroke: '#0f172a', strokeWidth: 2 }
							}}
							tooltipContext={{ mode: 'quadtree-x' }}
							props={{
								xAxis: { format: (value: unknown) => `${value ?? ''}` },
								yAxis: {
									format: (value: unknown) =>
										typeof value === 'number' ? formatCurrency(value) : `${value ?? ''}`
								},
								tooltip: { root: { class: 'comparison-tooltip-root' } }
							}}
						>
							{#snippet tooltip({ context })}
								<LayerTooltip.Root {context} class="comparison-tooltip-root">
									{#snippet children({ data })}
										<LayerTooltip.Header value={data?.year} color="rgba(255,255,255,0.9)" />
										<LayerTooltip.List>
											{#each getVisibleTooltipSeries(context) as series}
												<LayerTooltip.Item
													label={series.label}
													value={formatCurrency(series.value as number)}
													color={series.color}
													valueAlign="right"
												/>
											{/each}
										</LayerTooltip.List>
									{/snippet}
								</LayerTooltip.Root>
							{/snippet}
						</LineChart>
					</Chart.ChartContainer>
				</div>
			{/if}
		{/if}
	</div>
</section>

<style>
	:global(.comparison-tooltip-root) {
		z-index: 20;
		background: rgba(10, 10, 10, 0.96);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 1rem;
		box-shadow: 0 18px 48px rgba(0, 0, 0, 0.45);
		color: white;
	}

	:global(.comparison-tooltip-root .lc-tooltip-header) {
		color: white;
		font-weight: 700;
	}

	:global(.comparison-tooltip-root .lc-tooltip-item-label) {
		color: rgb(148 163 184);
	}

	:global(.comparison-tooltip-root .lc-tooltip-item-value) {
		color: white;
		font-weight: 600;
	}
	
	:global(.comparison-tooltip-root .lc-tooltip-item-color) {
		border-color: rgba(255, 255, 255, 0.8);
	}
</style>
