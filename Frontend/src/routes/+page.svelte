<script lang="ts">
	import { onMount, tick } from 'svelte';
	import * as Command from '$lib/components/ui/command';
	import * as Popover from '$lib/components/ui/popover';
	import * as ScrollArea from '$lib/components/ui/scroll-area';
	import * as Chart from '$lib/components/ui/chart';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import { LineChart } from 'layerchart';

	type UsageType = 'daily' | 'road-trips' | 'weekend';

	type Recommendation = {
		manufacturer_name: string;
		model_name: string;
		body_type: string;
		price_usd: number;
		year_produced: string;
		odometer_value?: number;
		transmission: string;
		engine_fuel: string;
	};

	type DepreciationPoint = {
		year: string;
		predicted_price_usd: number;
		car_age?: number;
		odometer_value?: number;
		usage_type?: UsageType;
	};

	const usageOptions: Array<{
		value: UsageType;
		label: string;
		description: string;
	}> = [
		{ value: 'daily', label: 'Daily commute', description: 'For regular city driving and everyday errands.' },
		{ value: 'road-trips', label: 'Road trips', description: 'A clearer replacement for long journey.' },
		{ value: 'weekend', label: 'Weekend use', description: 'For occasional drives and leisure use.' }
	];

	const chartConfig = {
		depreciation: {
			label: 'Predicted value',
			color: '#f8fafc'
		}
	} satisfies Chart.ChartConfig;

	let budgetMin = $state('');
	let budgetMax = $state('');
	let yearMin = $state('');
	let yearMax = $state('');
	let preferredBrand = $state('');
	let bodyType = $state('');
	let usageType = $state<UsageType>('daily');

	let brands = $state<string[]>([]);
	let bodyTypes = $state<string[]>([]);
	let recommendations = $state<Recommendation[]>([]);
	let depreciationData = $state<DepreciationPoint[]>([]);
	let isLoadingBrands = $state(true);
	let isLoadingBodyTypes = $state(false);
	let isSubmitting = $state(false);
	let isLoadingDepreciation = $state(false);
	let requestError = $state('');
	let depreciationError = $state('');
	let brandOpen = $state(false);
	let bodyTypeOpen = $state(false);
	let brandTriggerRef = $state<HTMLButtonElement>(null!);
	let bodyTypeTriggerRef = $state<HTMLButtonElement>(null!);
	let lastSubmittedFilters = $state<string | null>(null);
	let selectedRecommendationKey = $state('');

	const selectedUsage = $derived(
		usageOptions.find((option) => option.value === usageType) ?? usageOptions[0]
	);

	const brandOptions = $derived(brands.map((brand) => ({ value: brand, label: brand })));
	const bodyTypeOptions = $derived(bodyTypes.map((item) => ({ value: item, label: item })));
	const selectedBrandLabel = $derived(
		brandOptions.find((option) => option.value === preferredBrand)?.label
	);
	const selectedBodyTypeLabel = $derived(
		bodyTypeOptions.find((option) => option.value === bodyType)?.label
	);

	const currentFilterKey = $derived(
		JSON.stringify({
			budgetMin,
			budgetMax,
			yearMin,
			yearMax,
			preferredBrand,
			bodyType,
			usageType
		})
	);

	const resultsStale = $derived(lastSubmittedFilters !== null && lastSubmittedFilters !== currentFilterKey);

	$effect(() => {
		if (resultsStale) {
			recommendations = [];
			selectedRecommendationKey = '';
			depreciationData = [];
			depreciationError = '';
		}
	});

	const selectedRecommendation = $derived.by(() => {
		if (recommendations.length === 0) return null;

		return (
			recommendations.find(
				(car) =>
					`${car.manufacturer_name}-${car.model_name}-${car.year_produced}-${car.price_usd}` ===
					selectedRecommendationKey
			) ?? recommendations[0]
		);
	});

	function parseOptionalNumber(value: string | number) {
		if (typeof value === 'number') {
			return Number.isNaN(value) ? undefined : value;
		}

		const normalized = value.trim();
		if (normalized === '') {
			return undefined;
		}

		const parsed = Number(normalized);
		return Number.isNaN(parsed) ? undefined : parsed;
	}

	async function loadBrands() {
		isLoadingBrands = true;
		requestError = '';

		try {
			const response = await fetch('/api/brands');
			if (!response.ok) {
				throw new Error('Unable to load brands.');
			}

			const data = await response.json();
			brands = data.brands ?? [];
		} catch (error) {
			requestError = error instanceof Error ? error.message : 'Unable to load brands.';
		} finally {
			isLoadingBrands = false;
		}
	}

	async function loadBodyTypes(brand: string) {
		isLoadingBodyTypes = true;
		requestError = '';

		try {
			const query = brand ? `?brand=${encodeURIComponent(brand)}` : '';
			const response = await fetch(`/api/body-types${query}`);

			if (!response.ok) {
				throw new Error('Unable to load body types.');
			}

			const data = await response.json();
			bodyTypes = data.bodyTypes ?? [];
			if (bodyType && !bodyTypes.includes(bodyType)) {
				bodyType = '';
			}
		} catch (error) {
			requestError = error instanceof Error ? error.message : 'Unable to load body types.';
			bodyTypes = [];
		} finally {
			isLoadingBodyTypes = false;
		}
	}

	async function submitPreferences() {
		isSubmitting = true;
		requestError = '';

		const minBudgetValue = parseOptionalNumber(budgetMin);
		const maxBudgetValue = parseOptionalNumber(budgetMax);
		const minYearValue = parseOptionalNumber(yearMin);
		const maxYearValue = parseOptionalNumber(yearMax);

		if (
			(typeof minBudgetValue === 'number' &&
				typeof maxBudgetValue === 'number' &&
				minBudgetValue > maxBudgetValue) ||
			(typeof minYearValue === 'number' &&
				typeof maxYearValue === 'number' &&
				minYearValue > maxYearValue)
		) {
			requestError = 'Minimum values cannot be higher than maximum values.';
			isSubmitting = false;
			return;
		}

		try {
			const response = await fetch('/api/recommend', {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					budgetMin,
					budgetMax,
					yearMin,
					yearMax,
					brand: preferredBrand,
					bodyType,
					usageType
				})
			});

			if (!response.ok) {
				throw new Error('Unable to load recommendations.');
			}

			const data = await response.json();
			recommendations = data.recommendations ?? [];
			selectedRecommendationKey = data.recommendations?.[0]
				? `${data.recommendations[0].manufacturer_name}-${data.recommendations[0].model_name}-${data.recommendations[0].year_produced}-${data.recommendations[0].price_usd}`
				: '';
			lastSubmittedFilters = currentFilterKey;
		} catch (error) {
			requestError = error instanceof Error ? error.message : 'Unable to load recommendations.';
			recommendations = [];
			selectedRecommendationKey = '';
		} finally {
			isSubmitting = false;
		}
	}

	async function selectBrand(nextBrand: string) {
		preferredBrand = nextBrand;
		bodyType = '';
		brandOpen = false;
		await tick();
		brandTriggerRef?.focus();
		await loadBodyTypes(nextBrand);
	}

	async function selectBodyType(nextBodyType: string) {
		bodyType = nextBodyType;
		bodyTypeOpen = false;
		await tick();
		bodyTypeTriggerRef?.focus();
	}

	async function loadDepreciationForecast(car: Recommendation) {
		isLoadingDepreciation = true;
		depreciationError = '';

		try {
			const response = await fetch('/api/depreciation', {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					manufacturer_name: car.manufacturer_name,
					model_name: car.model_name,
					body_type: car.body_type,
					year_produced: Number(car.year_produced),
					price_usd: car.price_usd,
					usage_type: usageType,
					horizon_years: 5
				})
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(
					typeof data?.message === 'string'
						? data.message
						: 'Unable to load depreciation prediction.'
				);
			}

			depreciationData = Array.isArray(data?.points)
				? data.points.map((point: Record<string, unknown>) => ({
						year: `${point.year ?? ''}`,
						predicted_price_usd:
							typeof point.predicted_price_usd === 'number'
								? point.predicted_price_usd
								: Number(point.predicted_price_usd ?? 0),
						car_age:
							typeof point.car_age === 'number' ? point.car_age : Number(point.car_age ?? 0),
						odometer_value:
							typeof point.odometer_value === 'number'
								? point.odometer_value
								: Number(point.odometer_value ?? 0),
						usage_type:
							point.usage_type === 'daily' ||
							point.usage_type === 'road-trips' ||
							point.usage_type === 'weekend'
								? point.usage_type
								: usageType
					}))
				: [];
		} catch (error) {
			depreciationData = [];
			depreciationError =
				error instanceof Error ? error.message : 'Unable to load depreciation prediction.';
		} finally {
			isLoadingDepreciation = false;
		}
	}

	onMount(async () => {
		await loadBrands();
		await loadBodyTypes('');
	});

	$effect(() => {
		if (!selectedRecommendation || resultsStale) {
			depreciationData = [];
			depreciationError = '';
			isLoadingDepreciation = false;
			return;
		}

		void loadDepreciationForecast(selectedRecommendation);
	});
</script>

<svelte:head>
	<title>Preference Input</title>
	<meta
		name="description"
		content="Vehicle preference input page with recommendations and depreciation chart."
	/>
</svelte:head>

<div class="min-h-screen bg-black text-slate-100">
	<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
		<div class="mb-6 space-y-2">
			<p class="text-sm font-semibold tracking-[0.24em] text-slate-400 uppercase">Vehicle preferences</p>
			<h1 class="text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">Enter your preferences</h1>
		</div>

		<div class="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
			<section class="rounded-[2rem] border border-white/10 bg-neutral-950 p-5 sm:p-6">
				<form
					class="space-y-5"
					onsubmit={(event) => {
						event.preventDefault();
						void submitPreferences();
					}}
				>
					<div class="grid gap-5 sm:grid-cols-2">
						<label class="space-y-2">
							<span class="text-sm font-semibold text-slate-200">Minimum budget (USD)</span>
							<input
								bind:value={budgetMin}
								type="number"
								min="0"
								placeholder="e.g. 5000"
								class="w-full rounded-[1.2rem] border border-white/10 bg-black px-4 py-2.5 text-white placeholder:text-slate-600 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-700"
							/>
						</label>

						<label class="space-y-2">
							<span class="text-sm font-semibold text-slate-200">Maximum budget (USD)</span>
							<input
								bind:value={budgetMax}
								type="number"
								min="0"
								placeholder="e.g. 12000"
								class="w-full rounded-[1.2rem] border border-white/10 bg-black px-4 py-2.5 text-white placeholder:text-slate-600 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-700"
							/>
						</label>
					</div>

					<div class="grid gap-5 sm:grid-cols-2">
						<label class="space-y-2">
							<span class="text-sm font-semibold text-slate-200">Minimum year</span>
							<input
								bind:value={yearMin}
								type="number"
								min="1900"
								max="2100"
								placeholder="e.g. 2015"
								class="w-full rounded-[1.2rem] border border-white/10 bg-black px-4 py-2.5 text-white placeholder:text-slate-600 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-700"
							/>
						</label>

						<label class="space-y-2">
							<span class="text-sm font-semibold text-slate-200">Maximum year</span>
							<input
								bind:value={yearMax}
								type="number"
								min="1900"
								max="2100"
								placeholder="e.g. 2022"
								class="w-full rounded-[1.2rem] border border-white/10 bg-black px-4 py-2.5 text-white placeholder:text-slate-600 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-700"
							/>
						</label>
					</div>

					<div class="grid gap-5 sm:grid-cols-2">
						<div class="space-y-2">
							<span class="text-sm font-semibold text-slate-200">Preferred brand</span>
							<Popover.Root bind:open={brandOpen}>
								<Popover.Trigger bind:ref={brandTriggerRef}>
									{#snippet child({ props })}
										<Button
											{...props}
											variant="outline"
											class="h-11 w-full justify-between rounded-[1.2rem] !border-white/10 !bg-black px-4 !text-white hover:!bg-neutral-900 focus-visible:!ring-0 focus-visible:!outline-none"
											role="combobox"
											aria-expanded={brandOpen}
											disabled={isLoadingBrands}
										>
											{selectedBrandLabel || 'Any brand'}
											<span class="text-xs text-slate-500">v</span>
										</Button>
									{/snippet}
								</Popover.Trigger>
								<Popover.Content class="combobox-popover w-[var(--bits-popover-anchor-width)] !border-white/10 !bg-neutral-950 p-0 !text-white !ring-0">
									<Command.Root>
										<Command.Input
											placeholder="Search brand..."
											class="!bg-transparent !text-white placeholder:!text-slate-500 focus-visible:!ring-0 focus-visible:!outline-none"
										/>
										<Command.List class="bg-neutral-950">
											<Command.Empty>No brand found.</Command.Empty>
											<Command.Group value="brands">
												<Command.Item
													value=""
													class="text-slate-200 data-selected:!bg-neutral-900 data-selected:!text-white"
													onSelect={() => {
														void selectBrand('');
													}}
												>
													<span class={cn('mr-2 text-xs', preferredBrand ? 'text-transparent' : 'text-white')}>
														✓
													</span>
													Any brand
												</Command.Item>
												{#each brandOptions as brand (brand.value)}
													<Command.Item
														value={brand.value}
														class="text-slate-200 data-selected:!bg-neutral-900 data-selected:!text-white"
														onSelect={() => {
															void selectBrand(brand.value);
														}}
													>
														<span class={cn('mr-2 text-xs', preferredBrand !== brand.value && 'text-transparent')}>
															✓
														</span>
														{brand.label}
													</Command.Item>
												{/each}
											</Command.Group>
										</Command.List>
									</Command.Root>
								</Popover.Content>
							</Popover.Root>
							{#if isLoadingBrands}
								<p class="text-sm text-slate-500">Loading brands...</p>
							{/if}
						</div>

						<div class="space-y-2">
							<span class="text-sm font-semibold text-slate-200">Body type</span>
							<Popover.Root bind:open={bodyTypeOpen}>
								<Popover.Trigger bind:ref={bodyTypeTriggerRef}>
									{#snippet child({ props })}
										<Button
											{...props}
											variant="outline"
											class="h-11 w-full justify-between rounded-[1.2rem] !border-white/10 !bg-black px-4 !text-white hover:!bg-neutral-900 focus-visible:!ring-0 focus-visible:!outline-none"
											role="combobox"
											aria-expanded={bodyTypeOpen}
											disabled={isLoadingBodyTypes}
										>
											{selectedBodyTypeLabel || 'Any body type'}
											<span class="text-xs text-slate-500">v</span>
										</Button>
									{/snippet}
								</Popover.Trigger>
								<Popover.Content class="combobox-popover w-[var(--bits-popover-anchor-width)] !border-white/10 !bg-neutral-950 p-0 !text-white !ring-0">
									<Command.Root>
										<Command.Input
											placeholder="Search body type..."
											class="!bg-transparent !text-white placeholder:!text-slate-500 focus-visible:!ring-0 focus-visible:!outline-none"
										/>
										<Command.List class="bg-neutral-950">
											<Command.Empty>No body type found.</Command.Empty>
											<Command.Group value="body-types">
												<Command.Item
													value=""
													class="text-slate-200 data-selected:!bg-neutral-900 data-selected:!text-white"
													onSelect={() => {
														void selectBodyType('');
													}}
												>
													<span class={cn('mr-2 text-xs', bodyType ? 'text-transparent' : 'text-white')}>
														✓
													</span>
													Any body type
												</Command.Item>
												{#each bodyTypeOptions as option (option.value)}
													<Command.Item
														value={option.value}
														class="text-slate-200 data-selected:!bg-neutral-900 data-selected:!text-white"
														onSelect={() => {
															void selectBodyType(option.value);
														}}
													>
														<span class={cn('mr-2 text-xs', bodyType !== option.value && 'text-transparent')}>
															✓
														</span>
														{option.label}
													</Command.Item>
												{/each}
											</Command.Group>
										</Command.List>
									</Command.Root>
								</Popover.Content>
							</Popover.Root>
							{#if isLoadingBodyTypes}
								<p class="text-sm text-slate-500">Loading body types...</p>
							{/if}
						</div>
					</div>

					<div class="space-y-2.5">
						<div>
							<p class="text-sm font-semibold text-slate-200">Usage type</p>
						</div>

						<div class="grid gap-3">
							{#each usageOptions as option}
								<button
									type="button"
									class={`w-full rounded-[1.3rem] border px-4 py-3 text-left transition ${
										usageType === option.value
											? 'border-white/30 bg-white/5'
											: 'border-white/10 bg-black hover:border-white/20'
									}`}
									onclick={() => (usageType = option.value)}
								>
									<p class="text-[15px] font-bold text-white">{option.label}</p>
									<p class="mt-1 text-sm leading-5 text-slate-500">{option.description}</p>
								</button>
							{/each}
						</div>
					</div>

					{#if requestError}
						<p class="rounded-[1.2rem] border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
							{requestError}
						</p>
					{/if}

					<div class="flex items-center justify-between border-t border-white/10 pt-5">
						<p class="text-sm text-slate-500">Dataset filter and recommendation system.</p>
						<Button
							type="submit"
							size="lg"
							class="h-10 rounded-full bg-white px-5 text-sm font-semibold text-black hover:bg-slate-200"
							disabled={isSubmitting}
						>
							{isSubmitting ? 'Loading...' : 'Get recommendations'}
						</Button>
					</div>
				</form>
			</section>

			<aside class="rounded-[2rem] border border-white/10 bg-neutral-950 p-5 sm:p-6">
				<div class="flex items-center justify-between gap-4">
					<div>
						<p class="text-sm font-semibold tracking-[0.18em] text-slate-400 uppercase">Recommendations</p>
						<h2 class="mt-2 text-2xl font-black tracking-[-0.04em] text-white">Results</h2>
					</div>
					<div class="rounded-full border border-white/10 bg-black px-4 py-2 text-sm text-slate-300">
						{resultsStale ? 'Filters changed' : `${recommendations.length} found`}
					</div>
				</div>

				<ScrollArea.Root
					class="mt-4 lg:h-124"
					orientation="vertical"
					scrollbarYClasses="w-2.5"
				>
					<div class="space-y-3 pr-3">
					{#if resultsStale}
						<div class="rounded-[1.4rem] border border-amber-500/20 bg-amber-500/10 p-5 text-sm leading-6 text-amber-100">
							The current inputs are different from the last submitted search. Click
							"Get recommendations" again to refresh the results for this budget range.
						</div>
					{:else if recommendations.length > 0}
						{#each recommendations as car}
							<button
								type="button"
								class={`w-full rounded-[1.3rem] border bg-black p-3.5 text-left transition ${
									selectedRecommendation &&
									`${car.manufacturer_name}-${car.model_name}-${car.year_produced}-${car.price_usd}` ===
										`${selectedRecommendation.manufacturer_name}-${selectedRecommendation.model_name}-${selectedRecommendation.year_produced}-${selectedRecommendation.price_usd}`
										? 'border-white/30 bg-white/5'
										: 'border-white/10 hover:border-white/20'
								}`}
								onclick={() =>
									(selectedRecommendationKey = `${car.manufacturer_name}-${car.model_name}-${car.year_produced}-${car.price_usd}`)}
							>
								<p class="text-base font-bold text-white">{car.manufacturer_name} {car.model_name}</p>
								<p class="mt-1 text-sm leading-5 text-slate-400">
									{car.body_type} · {car.year_produced || 'Year unknown'} · {car.transmission || 'Transmission unknown'}
								</p>
								<p class="mt-3 text-sm text-slate-500">{car.engine_fuel || 'Fuel unknown'}</p>
								<p class="mt-2 text-[15px] font-semibold text-white">${car.price_usd.toLocaleString()}</p>
							</button>
						{/each}
					{:else}
						<div class="rounded-[1.4rem] border border-dashed border-white/10 bg-black p-5 text-sm leading-6 text-slate-500">
							Submit the form to see matching cars.
						</div>
					{/if}
					</div>
				</ScrollArea.Root>
			</aside>
		</div>

		<section class="mt-6 rounded-[2rem] border border-white/10 bg-neutral-950 p-5 sm:p-6">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<p class="text-sm font-semibold tracking-[0.18em] text-slate-400 uppercase">Depreciation</p>
					<h2 class="mt-2 text-2xl font-black tracking-[-0.04em] text-white">Projected value trend</h2>
				</div>
				{#if selectedRecommendation}
					<div class="text-sm text-slate-400">
						<span class="font-semibold text-white">
							{selectedRecommendation.manufacturer_name} {selectedRecommendation.model_name}
						</span>
						<span> · {selectedRecommendation.year_produced || 'Year unknown'} · ${selectedRecommendation.price_usd.toLocaleString()}</span>
					</div>
				{/if}
			</div>

			<div class="mt-4">
				{#if selectedRecommendation && isLoadingDepreciation}
					<div class="rounded-[1.4rem] border border-white/10 bg-black p-5 text-sm leading-6 text-slate-400">
						Loading model-based depreciation forecast...
					</div>
				{:else if selectedRecommendation && depreciationError}
					<div class="rounded-[1.4rem] border border-red-500/20 bg-red-500/10 p-5 text-sm leading-6 text-red-200">
						{depreciationError}
					</div>
				{:else if selectedRecommendation && depreciationData.length > 0}
					<div class="mb-4 flex flex-wrap gap-3 text-sm text-slate-400">
						<div class="rounded-full border border-white/10 bg-black px-4 py-2">
							Usage: <span class="font-semibold text-white">{selectedUsage.label}</span>
						</div>
						<div class="rounded-full border border-white/10 bg-black px-4 py-2">
							Estimated 5-year drop:
							<span class="font-semibold text-white">
								{Math.round(
									((selectedRecommendation.price_usd - depreciationData[depreciationData.length - 1].predicted_price_usd) /
										selectedRecommendation.price_usd) *
										100
								)}%
							</span>
						</div>
					</div>

					<Chart.ChartContainer config={chartConfig} class="h-[250px] w-full">
						<LineChart
							data={depreciationData}
							x="year"
							y="predicted_price_usd"
							series={[
								{
									key: 'depreciation',
									label: 'Predicted value',
									value: 'predicted_price_usd',
									color: 'var(--color-depreciation)'
								}
							]}
							props={{
								xAxis: {
									format: (value: unknown) => `${value ?? ''}`
								},
								yAxis: {
									format: (value: unknown) =>
										typeof value === 'number' ? `$${value.toLocaleString()}` : `${value ?? ''}`
								},
								tooltip: {
									root: {
										class: 'depreciation-tooltip-root'
									}
								}
							}}
						/>
					</Chart.ChartContainer>
				{:else}
					<div class="rounded-[1.4rem] border border-dashed border-white/10 bg-black p-5 text-sm leading-6 text-slate-500">
						Choose a recommended car to see its projected depreciation trend.
					</div>
				{/if}
			</div>
		</section>
	</div>
</div>

<style>
	:global(.combobox-popover) {
		box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08);
	}

	:global(.combobox-popover [data-slot='command-input-wrapper']) {
		padding: 0.75rem 0.75rem 0 0.75rem;
	}

	:global(.combobox-popover [data-slot='input-group']) {
		background: rgb(10 10 10);
		border-color: rgba(255, 255, 255, 0.08);
		box-shadow: none;
	}

	:global(.combobox-popover [data-slot='input-group']:focus-within) {
		border-color: rgba(255, 255, 255, 0.16);
		box-shadow: none;
	}

	:global(.combobox-popover [data-slot='input-group-addon']) {
		color: rgb(113 113 122);
	}

	:global(.combobox-popover [data-slot='command-input']) {
		background: transparent;
		color: white;
		box-shadow: none;
		outline: none;
	}

	:global(.combobox-popover [data-slot='command-input']::placeholder) {
		color: rgb(113 113 122);
	}

	:global(.combobox-popover [data-slot='command-list']) {
		padding: 0.5rem 0.75rem 0.75rem 0.75rem;
	}

	:global(.combobox-popover [data-slot='command-item']) {
		border-radius: 1rem;
		color: rgb(226 232 240);
	}

	:global(.combobox-popover [data-slot='command-item'][data-selected]) {
		background: rgb(23 23 23);
		color: white;
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
