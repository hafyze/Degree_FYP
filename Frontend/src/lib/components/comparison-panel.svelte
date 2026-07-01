<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import * as Chart from '$lib/components/ui/chart';
	import * as Table from '$lib/components/ui/table';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		Car01Icon,
		Cancel01Icon,
		ChartLineData02Icon,
		ChartDecreaseIcon,
		ChartIncreaseIcon,
		DashboardSpeed01Icon,
		EngineIcon,
		Fuel01Icon,
		LeftToRightListNumberIcon
	} from '@hugeicons/core-free-icons';
	import {
		LineChart,
		Tooltip as LayerTooltip
	} from 'layerchart';
	import {
		drivetrainLabels,
		formatCurrency,
		formatEngineCapacity,
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

	const comparisonColors = [
		{ light: '#0f172a', dark: '#e5e7eb' },
		{ light: '#0284c7', dark: '#60a5fa' },
		{ light: '#ea580c', dark: '#fb923c' }
	];

	const readyComparisonItems = $derived(comparisonItems.filter((item) => !item.isLoading && !item.error));
	const canRenderComparison = $derived(readyComparisonItems.length >= 2 && comparisonChartData.length > 0);

	const chartConfig = $derived.by(() =>
		Object.fromEntries(
			readyComparisonItems.map((item, index) => [
				item.key,
				{
					label: item.label,
					theme: comparisonColors[index % comparisonColors.length]
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

	const comparisonRows = $derived.by(() =>
		comparisonItems.map((item) => {
			const oneYearPoint = item.points[1] ?? null;
			const threeYearPoint = item.points[3] ?? null;
			const fiveYearPoint = item.points[5] ?? item.points[item.points.length - 1] ?? null;

			return {
				...item,
				values: {
					price: formatCurrency(item.car.price_usd),
					engineCapacity: formatEngineCapacity(item.car.engine_capacity),
					drivetrain:
						drivetrainLabels[item.car.drivetrain ?? ''] ?? item.car.drivetrain ?? 'Unknown',
					fuelType: item.car.engine_fuel || 'Unknown',
					odometer: formatOdometer(item.car.odometer_value),
					fuelUse: formatFuelUsageEstimate(item.car.estimated_fuel_usage_l_per_100km),
					oneYearLoss: item.isLoading ? 'Loading...' : item.error ? item.error : formatLoss(
						oneYearPoint ? item.car.price_usd - oneYearPoint.predicted_price_usd : null
					),
					threeYearLoss: item.isLoading ? 'Loading...' : item.error ? item.error : formatLoss(
						threeYearPoint ? item.car.price_usd - threeYearPoint.predicted_price_usd : null
					),
					fiveYearLoss: item.isLoading ? 'Loading...' : item.error ? item.error : formatLoss(
						fiveYearPoint ? item.car.price_usd - fiveYearPoint.predicted_price_usd : null
					),
					fiveYearRetention: item.isLoading ? 'Loading...' : item.error ? item.error : (
						fiveYearPoint ? formatPercent(fiveYearPoint.value_retention_percent, 1) : 'N/A'
					),
					fiveYearValue: item.isLoading ? 'Loading...' : item.error ? item.error : (
						fiveYearPoint ? formatCurrency(fiveYearPoint.predicted_price_usd) : 'N/A'
					)
				}
			};
		})
	);

	const rowDefinitions = [
		{ key: 'price', label: 'Current price', icon: ChartLineData02Icon },
		{ key: 'engineCapacity', label: 'Engine capacity', icon: EngineIcon },
		{ key: 'drivetrain', label: 'Drivetrain', icon: Car01Icon },
		{ key: 'fuelType', label: 'Fuel type', icon: Fuel01Icon },
		{ key: 'odometer', label: 'Odometer', icon: DashboardSpeed01Icon },
		{ key: 'fuelUse', label: 'Fuel use', icon: Fuel01Icon },
		{ key: 'oneYearLoss', label: '1-year loss', icon: ChartDecreaseIcon },
		{ key: 'threeYearLoss', label: '3-year loss', icon: ChartDecreaseIcon },
		{ key: 'fiveYearLoss', label: '5-year loss', icon: ChartDecreaseIcon },
		{ key: 'fiveYearRetention', label: '5-year retention', icon: ChartIncreaseIcon },
		{ key: 'fiveYearValue', label: 'Projected 5-year value', icon: ChartLineData02Icon }
	] as const;

	function getVisibleTooltipSeries(context: {
		tooltip?: { series?: Array<{ value: unknown; label: string; color?: string }> };
	}) {
		return context.tooltip?.series?.filter((series) => typeof series.value === 'number') ?? [];
	}

	function getCellClasses(item: ComparisonForecastState) {
		if (item.error) {
			return 'text-red-200';
		}

		if (item.isLoading) {
		return 'text-muted-foreground';
		}

		return 'text-foreground';
	}

	function getComparisonColorStyle(index: number) {
		const color = comparisonColors[index % comparisonColors.length];
		return `--comparison-color-light: ${color.light}; --comparison-color-dark: ${color.dark};`;
	}
</script>

<section class="comparison-panel rounded-[1.5rem] border border-border bg-card p-4 shadow-sm sm:rounded-[2rem] sm:p-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
		<div class="flex items-start gap-3">
			<div class="flex size-11 items-center justify-center rounded-2xl border border-border bg-muted/50 text-foreground">
				<HugeiconsIcon icon={LeftToRightListNumberIcon} class="size-5" />
			</div>
			<div>
				<p class="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase sm:text-sm">Comparison</p>
				<h2 class="mt-1.5 text-xl font-black tracking-[-0.04em] text-foreground sm:mt-2 sm:text-2xl">
					Compare selected cars
				</h2>
			</div>
		</div>
		<div class="rounded-full border border-border bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
			{comparisonItems.length}/{maxComparisonItems} selected
		</div>
	</div>

	<div class="mt-4">
		{#if comparisonItems.length === 0}
			<div class="rounded-[1.4rem] border border-dashed border-white/10 bg-black p-5 text-sm leading-6 text-slate-500">
				Use the Compare button on recommendation cards to start a side-by-side view.
			</div>
		{:else}
			<div class="rounded-[1.2rem] border border-white/10 bg-black p-3 sm:p-4">
				<Table.Root>
					<Table.Header>
						<Table.Row class="hover:bg-transparent">
							<Table.Head class="sticky left-0 z-10 min-w-44 bg-black text-slate-400">Metric</Table.Head>
							{#each comparisonRows as item, index (item.key)}
								<Table.Head class="min-w-64 bg-black align-top">
									<div class="flex items-start justify-between gap-3">
										<div>
											<div class="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-neutral-950 px-3 py-1 text-xs font-semibold text-slate-300">
												<span
													class="comparison-swatch inline-flex h-2.5 w-2.5 rounded-full"
													style={getComparisonColorStyle(index)}
												></span>
												Car {index + 1}
											</div>
											<p class="text-base font-bold text-white">
												{item.car.manufacturer_name} {item.car.model_name}
											</p>
											<p class="mt-1 text-sm font-normal text-slate-400">
												{item.car.year_produced || 'Year unknown'} · {item.car.body_type}
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
								</Table.Head>
							{/each}
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each rowDefinitions as row}
							<Table.Row>
								<Table.Cell class="sticky left-0 z-10 bg-black font-medium text-slate-300">
									<span class="inline-flex items-center gap-2">
										<HugeiconsIcon icon={row.icon} class="size-4 text-muted-foreground" />
										<span>{row.label}</span>
									</span>
								</Table.Cell>
								{#each comparisonRows as item}
									<Table.Cell class={getCellClasses(item)}>
										{item.values[row.key]}
									</Table.Cell>
								{/each}
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
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
								lines: { stroke: 'color-mix(in oklch, var(--foreground) 26%, transparent)' },
								points: { r: 6, fill: 'var(--background)', stroke: 'currentColor', strokeWidth: 2 }
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
	.comparison-swatch {
		background: var(--comparison-color-light);
	}

	:global(.dark) .comparison-swatch {
		background: var(--comparison-color-dark);
	}

	:global(html:not(.dark) .comparison-panel [class~='bg-black']),
	:global(html:not(.dark) .comparison-panel [class~='bg-neutral-950']) {
		background-color: var(--background) !important;
	}

	:global(html:not(.dark) .comparison-panel [class*='border-white']) {
		border-color: var(--border) !important;
	}

	:global(html:not(.dark) .comparison-panel [class~='bg-white/5']) {
		background-color: var(--muted) !important;
	}

	:global(html:not(.dark) .comparison-panel [class*='text-white']),
	:global(html:not(.dark) .comparison-panel [class*='text-slate-200']),
	:global(html:not(.dark) .comparison-panel [class*='text-slate-300']) {
		color: var(--foreground) !important;
	}

	:global(html:not(.dark) .comparison-panel [class*='text-slate-400']),
	:global(html:not(.dark) .comparison-panel [class*='text-slate-500']) {
		color: var(--muted-foreground) !important;
	}
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

	:global(html:not(.dark) .comparison-tooltip-root) {
		background: color-mix(in oklch, var(--background) 98%, white) !important;
		border-color: var(--border) !important;
		box-shadow: 0 18px 42px rgba(15, 23, 42, 0.16);
		color: var(--foreground) !important;
	}

	:global(html:not(.dark) .comparison-tooltip-root .lc-tooltip-header),
	:global(html:not(.dark) .comparison-tooltip-root .lc-tooltip-item-value) {
		color: var(--foreground) !important;
	}

	:global(html:not(.dark) .comparison-tooltip-root .lc-tooltip-item-label) {
		color: var(--muted-foreground) !important;
	}

	:global(html:not(.dark) .comparison-tooltip-root .lc-tooltip-item-color) {
		border-color: color-mix(in oklch, var(--foreground) 22%, transparent) !important;
	}
</style>
