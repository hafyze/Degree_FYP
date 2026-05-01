<script lang="ts">
	import { onMount, tick } from 'svelte';
	import DepreciationForecastPanel from '$lib/components/depreciation-forecast-panel.svelte';
	import RecommendationResultsPanel from '$lib/components/recommendation-results-panel.svelte';
	import VehiclePreferencesForm from '$lib/components/vehicle-preferences-form.svelte';
	import * as Tabs from '$lib/components/ui/tabs';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		Car02Icon,
		ChartLineData02Icon,
		FilterHorizontalIcon,
		SearchIcon
	} from '@hugeicons/core-free-icons';
	import {
		bodyTypeIconMap,
		drivetrainLabels,
		fallbackDrivetrains,
		fuelTypeLabels,
		usageOptions
	} from '$lib/features/vehicle-recommendation/helpers';
	import type {
		DepreciationMetric,
		DepreciationPoint,
		DepreciationViewPoint,
		Recommendation,
		RecommendationSort,
		SelectOption,
		UsageType
	} from '$lib/features/vehicle-recommendation/types';

	let budgetRange = $state<[number, number]>([0, 50000]);
	let priceRangeMax = $state(50000);
	let ageRange = $state<[number, number]>([0, 30]);
	let ageRangeMax = $state(30);
	let preferredBrand = $state('');
	let bodyType = $state('');
	let drivetrain = $state('');
	let fuelType = $state('');
	let usageType = $state<UsageType>('daily');
	let recommendationSort = $state<RecommendationSort>('recommended');
	let depreciationMetric = $state<DepreciationMetric>('price');

	let brands = $state<string[]>([]);
	let bodyTypes = $state<string[]>([]);
	let drivetrains = $state<string[]>([]);
	let fuelTypes = $state<string[]>([]);
	let recommendations = $state<Recommendation[]>([]);
	let depreciationData = $state<DepreciationPoint[]>([]);
	let isLoadingBrands = $state(true);
	let isLoadingBodyTypes = $state(false);
	let isLoadingDrivetrains = $state(true);
	let isLoadingFuelTypes = $state(true);
	let isLoadingBudgetRange = $state(true);
	let isLoadingAgeRange = $state(true);
	let isSubmitting = $state(false);
	let isLoadingDepreciation = $state(false);
	let requestError = $state('');
	let depreciationError = $state('');
	let lastSubmittedFilters = $state<string | null>(null);
	let selectedRecommendationKey = $state('');
	let currentPage = $state(1);
	let lastObservedPage = $state(1);
	let totalRecommendations = $state(0);
	let lastObservedSort = $state<RecommendationSort>('recommended');
	let mobileTab = $state('filters');
	let mobileDepreciationSection = $state<HTMLDivElement | null>(null);
	let desktopDepreciationSection = $state<HTMLDivElement | null>(null);

	const recommendationsPerPage = 6;

	const selectedUsageLabel = $derived(
		usageOptions.find((option) => option.value === usageType)?.label ?? usageOptions[0].label
	);

	const brandOptions = $derived<SelectOption[]>(
		brands.map((brand) => ({ value: brand, label: brand }))
	);
	const bodyTypeOptions = $derived<SelectOption[]>(
		bodyTypes.map((item) => ({
			value: item,
			label: item,
			icon: bodyTypeIconMap[item]
		}))
	);
	const drivetrainOptions = $derived<SelectOption[]>(
		drivetrains.map((item) => ({
			value: item,
			label: drivetrainLabels[item] ?? item
		}))
	);
	const fuelOptions = $derived<SelectOption[]>(
		fuelTypes.map((item) => ({
			value: item,
			label: fuelTypeLabels[item] ?? item
		}))
	);

	const budgetTicks = $derived(
		Array.from({ length: 6 }, (_, index) => {
			const rawValue = (priceRangeMax / 5) * index;
			const roundedValue = index === 5 ? priceRangeMax : Math.round(rawValue / 1000) * 1000;
			return {
				label: roundedValue >= 1000 ? `$${Math.round(roundedValue / 1000)}k` : `$${roundedValue}`
			};
		})
	);

	const ageTicks = $derived(
		Array.from({ length: 6 }, (_, index) => {
			const rawValue = (ageRangeMax / 5) * index;
			const roundedValue = index === 5 ? ageRangeMax : Math.round(rawValue);
			return {
				label: `${roundedValue}y`
			};
		})
	);

	const currentFilterKey = $derived(
		JSON.stringify({
			budgetRange,
			ageRange,
			preferredBrand,
			bodyType,
			drivetrain,
			fuelType,
			usageType
		})
	);

	const resultsStale = $derived(lastSubmittedFilters !== null && lastSubmittedFilters !== currentFilterKey);

	$effect(() => {
		if (resultsStale) {
			recommendations = [];
			totalRecommendations = 0;
			currentPage = 1;
			lastObservedPage = 1;
			selectedRecommendationKey = '';
			depreciationData = [];
			depreciationError = '';
		}
	});

	$effect(() => {
		if (currentPage === lastObservedPage) {
			return;
		}

		lastObservedPage = currentPage;

		if (lastSubmittedFilters && !resultsStale) {
			void loadRecommendations(currentPage);
		}
	});

	$effect(() => {
		if (recommendationSort === lastObservedSort) {
			return;
		}

		lastObservedSort = recommendationSort;

		if (lastSubmittedFilters && !resultsStale) {
			currentPage = 1;
			lastObservedPage = 1;
			void loadRecommendations(1);
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

	const depreciationViewData = $derived.by(() => {
		if (!selectedRecommendation) {
			return [] as DepreciationViewPoint[];
		}

		const baselinePrice = selectedRecommendation.price_usd;

		return depreciationData.map((point, index, points) => {
			const previousPoint = points[index - 1];
			const annualLossUsd = previousPoint
				? Math.max(0, previousPoint.predicted_price_usd - point.predicted_price_usd)
				: 0;
			const depreciationPercent =
				baselinePrice > 0 ? ((baselinePrice - point.predicted_price_usd) / baselinePrice) * 100 : 0;
			const valueRetentionPercent =
				baselinePrice > 0 ? (point.predicted_price_usd / baselinePrice) * 100 : 0;

			return {
				...point,
				chart_value:
					depreciationMetric === 'price'
						? point.predicted_price_usd
						: Math.max(0, depreciationPercent),
				depreciation_percent: Math.max(0, depreciationPercent),
				annual_loss_usd: annualLossUsd,
				value_retention_percent: Math.max(0, valueRetentionPercent)
			};
		});
	});

	const depreciationCaption = $derived.by(() => {
		if (!selectedRecommendation) {
			return '';
		}

		const finalPoint =
			depreciationViewData[5] ?? depreciationViewData[depreciationViewData.length - 1] ?? null;
		if (!finalPoint) {
			return '';
		}

		return `The car is projected to retain ${Math.round(finalPoint.value_retention_percent)}% of its current value after 5 years.`;
	});

	async function loadBrands() {
		isLoadingBrands = true;
		requestError = '';

		try {
			const response = await fetch('/api/brands');
			if (!response.ok) throw new Error('Unable to load brands.');
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
			if (!response.ok) throw new Error('Unable to load body types.');
			const data = await response.json();
			bodyTypes = data.bodyTypes ?? [];
			if (bodyType && !bodyTypes.includes(bodyType)) bodyType = '';
		} catch (error) {
			requestError = error instanceof Error ? error.message : 'Unable to load body types.';
			bodyTypes = [];
		} finally {
			isLoadingBodyTypes = false;
		}
	}

	async function loadDrivetrains() {
		isLoadingDrivetrains = true;

		try {
			const response = await fetch('/api/drivetrains');
			if (!response.ok) throw new Error('Unable to load drivetrains.');
			const data = await response.json();
			drivetrains = data.drivetrains ?? fallbackDrivetrains;
		} catch {
			drivetrains = fallbackDrivetrains;
		} finally {
			isLoadingDrivetrains = false;
		}
	}

	async function loadFuelTypes() {
		isLoadingFuelTypes = true;

		try {
			const response = await fetch('/api/fuel-types');
			if (!response.ok) throw new Error('Unable to load fuel types.');
			const data = await response.json();
			fuelTypes = data.fuelTypes ?? ['diesel', 'gas', 'hybrid-petrol', 'petrol'];
		} catch {
			fuelTypes = ['diesel', 'gas', 'hybrid-petrol', 'petrol'];
		} finally {
			isLoadingFuelTypes = false;
		}
	}

	async function loadBudgetRange() {
		isLoadingBudgetRange = true;
		requestError = '';

		try {
			const response = await fetch('/api/budget-range');
			if (!response.ok) throw new Error('Unable to load budget range.');
			const data = await response.json();
			const nextMax =
				typeof data?.max === 'number' && Number.isFinite(data.max) && data.max > 0
					? Math.round(data.max)
					: 50000;

			priceRangeMax = nextMax;
			budgetRange = [0, nextMax];
		} catch (error) {
			requestError = error instanceof Error ? error.message : 'Unable to load budget range.';
			priceRangeMax = 50000;
			budgetRange = [0, 50000];
		} finally {
			isLoadingBudgetRange = false;
		}
	}

	async function loadAgeRange() {
		isLoadingAgeRange = true;

		try {
			const response = await fetch('/api/age-range');
			if (!response.ok) throw new Error('Unable to load car age range.');
			const data = await response.json();
			const nextMax =
				typeof data?.max === 'number' && Number.isFinite(data.max) && data.max > 0
					? Math.round(data.max)
					: 30;

			ageRangeMax = nextMax;
			ageRange = [0, nextMax];
		} catch {
			ageRangeMax = 30;
			ageRange = [0, 30];
		} finally {
			isLoadingAgeRange = false;
		}
	}

	async function loadRecommendations(page = currentPage) {
		isSubmitting = true;
		requestError = '';

		const minBudgetValue = budgetRange[0];
		const maxBudgetValue = budgetRange[1];
		const minAgeValue = ageRange[0];
		const maxAgeValue = ageRange[1];

		if (
			(typeof minBudgetValue === 'number' &&
				typeof maxBudgetValue === 'number' &&
				minBudgetValue > maxBudgetValue) ||
			(typeof minAgeValue === 'number' &&
				typeof maxAgeValue === 'number' &&
				minAgeValue > maxAgeValue)
		) {
			requestError = 'Minimum values cannot be higher than maximum values.';
			isSubmitting = false;
			return;
		}

		try {
			const response = await fetch('/api/recommend', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					budgetMin: minBudgetValue,
					budgetMax: maxBudgetValue,
					ageMin: minAgeValue,
					ageMax: maxAgeValue,
					brand: preferredBrand,
					bodyType,
					drivetrain,
					fuelType,
					usageType,
					sortBy: recommendationSort,
					page,
					pageSize: recommendationsPerPage
				})
			});

			if (!response.ok) throw new Error('Unable to load recommendations.');

			const data = await response.json();
			recommendations = data.recommendations ?? [];
			totalRecommendations = data.totalCount ?? recommendations.length;
			currentPage = data.page ?? page;
			lastObservedPage = currentPage;
			selectedRecommendationKey = data.recommendations?.[0]
				? `${data.recommendations[0].manufacturer_name}-${data.recommendations[0].model_name}-${data.recommendations[0].year_produced}-${data.recommendations[0].price_usd}`
				: '';
			lastSubmittedFilters = currentFilterKey;
		} catch (error) {
			requestError = error instanceof Error ? error.message : 'Unable to load recommendations.';
			recommendations = [];
			totalRecommendations = 0;
			selectedRecommendationKey = '';
		} finally {
			isSubmitting = false;
		}
	}

	async function submitPreferences() {
		currentPage = 1;
		lastObservedPage = 1;
		await loadRecommendations(1);
		if (!requestError) {
			mobileTab = 'results';
		}
	}

	async function selectRecommendation(nextRecommendationKey: string) {
		selectedRecommendationKey = nextRecommendationKey;
		mobileTab = 'details';
		await tick();

		const target =
			typeof window !== 'undefined' && window.innerWidth < 1024
				? mobileDepreciationSection
				: desktopDepreciationSection;

		target?.scrollIntoView({
			behavior: 'smooth',
			block: 'start'
		});
	}

	function handleBrandChange(nextBrand: string) {
		preferredBrand = nextBrand;
		bodyType = '';
		void loadBodyTypes(nextBrand);
	}

	function handleBodyTypeChange(nextBodyType: string) {
		bodyType = nextBodyType;
	}

	function handleDrivetrainChange(nextDrivetrain: string) {
		drivetrain = nextDrivetrain;
	}

	function handleFuelTypeChange(nextFuelType: string) {
		fuelType = nextFuelType;
	}

	async function loadDepreciationForecast(car: Recommendation) {
		isLoadingDepreciation = true;
		depreciationError = '';

		try {
			const response = await fetch('/api/depreciation', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
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
					typeof data?.message === 'string' ? data.message : 'Unable to load depreciation prediction.'
				);
			}

			depreciationData = Array.isArray(data?.points)
				? data.points.map((point: Record<string, unknown>) => ({
						year: `${point.year ?? ''}`,
						predicted_price_usd:
							typeof point.predicted_price_usd === 'number'
								? point.predicted_price_usd
								: Number(point.predicted_price_usd ?? 0),
						car_age: typeof point.car_age === 'number' ? point.car_age : Number(point.car_age ?? 0),
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
		await loadBudgetRange();
		await loadAgeRange();
		await loadBrands();
		await loadBodyTypes('');
		await loadDrivetrains();
		await loadFuelTypes();
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
	<title>Car Recommender</title>
	<meta
		name="description"
		content="Vehicle preference input page with recommendations and depreciation chart."
	/>
</svelte:head>

<div class="min-h-screen bg-black text-slate-100">
	<div class="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
		<div class="mb-4 space-y-2 sm:mb-6 sm:space-y-3">
			<div class="flex items-center gap-3 sm:gap-4">
				<p class="text-3xl font-black text-white sm:text-5xl lg:text-6xl tracking-normal">
					CarTradezMy
				</p>
				<div class="flex items-center justify-center text-white/90">
					<HugeiconsIcon icon={Car02Icon} class="size-9 sm:size-12 lg:size-14" strokeWidth={1.8} />
				</div> 
			</div>
			<h1 class="text-lg font-semibold tracking-[-0.03em] text-slate-300 sm:text-2xl">
				Find Your Next Car
			</h1>
			<div class="flex flex-wrap gap-2 pt-1">
				<div class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 sm:text-sm">
					<HugeiconsIcon icon={FilterHorizontalIcon} class="size-4 text-slate-300" />
					Smart filters
				</div>
				<div class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 sm:text-sm">
					<HugeiconsIcon icon={SearchIcon} class="size-4 text-slate-300" />
					Matched results
				</div>
				<div class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 sm:text-sm">
					<HugeiconsIcon icon={ChartLineData02Icon} class="size-4 text-slate-300" />
					Value forecast
				</div>
			</div>
		</div>

		<div class="lg:hidden">
			<Tabs.Root bind:value={mobileTab} class="gap-4">
				<Tabs.List class="grid h-auto w-full grid-cols-3 rounded-full border border-white/10 bg-neutral-950 p-1 text-slate-400">
					<Tabs.Trigger
						value="filters"
						class="rounded-full px-2 py-2 text-xs font-semibold text-slate-300 hover:text-white data-active:bg-white data-active:text-black"
					>
						<span class="inline-flex items-center gap-1.5">
							<HugeiconsIcon icon={FilterHorizontalIcon} class="size-4" />
							Filters
						</span>
					</Tabs.Trigger>
					<Tabs.Trigger
						value="results"
						class="rounded-full px-2 py-2 text-xs font-semibold text-slate-300 hover:text-white data-active:bg-white data-active:text-black"
					>
						<span class="inline-flex items-center gap-1.5">
							<HugeiconsIcon icon={SearchIcon} class="size-4" />
							Results
						</span>
					</Tabs.Trigger>
					<Tabs.Trigger
						value="details"
						class="rounded-full px-2 py-2 text-xs font-semibold text-slate-300 hover:text-white data-active:bg-white data-active:text-black"
					>
						<span class="inline-flex items-center gap-1.5">
							<HugeiconsIcon icon={ChartLineData02Icon} class="size-4" />
							Details
						</span>
					</Tabs.Trigger>
				</Tabs.List>

				<Tabs.Content value="filters" class="mt-4">
					<VehiclePreferencesForm
						{budgetRange}
						{priceRangeMax}
						{budgetTicks}
						{isLoadingBudgetRange}
						{ageRange}
						{ageRangeMax}
						{ageTicks}
						{isLoadingAgeRange}
						{preferredBrand}
						{bodyType}
						{drivetrain}
						{fuelType}
						{usageType}
						{brandOptions}
						{bodyTypeOptions}
						{drivetrainOptions}
						{fuelOptions}
						{isLoadingBrands}
						{isLoadingBodyTypes}
						{isLoadingDrivetrains}
						{isLoadingFuelTypes}
						{requestError}
						{isSubmitting}
						on:submit={() => void submitPreferences()}
						on:budgetRangeChange={(event) => (budgetRange = event.detail)}
						on:ageRangeChange={(event) => (ageRange = event.detail)}
						on:brandChange={(event) => handleBrandChange(event.detail)}
						on:bodyTypeChange={(event) => handleBodyTypeChange(event.detail)}
						on:drivetrainChange={(event) => handleDrivetrainChange(event.detail)}
						on:fuelTypeChange={(event) => handleFuelTypeChange(event.detail)}
						on:usageTypeChange={(event) => (usageType = event.detail)}
					/>
				</Tabs.Content>

				<Tabs.Content value="results" class="mt-4">
					<RecommendationResultsPanel
						{recommendations}
						{resultsStale}
						{totalRecommendations}
						{recommendationsPerPage}
						{currentPage}
						{selectedRecommendationKey}
						{recommendationSort}
						on:sortChange={(event) => (recommendationSort = event.detail)}
						on:pageChange={(event) => (currentPage = event.detail)}
						on:selectRecommendation={(event) => selectRecommendation(event.detail)}
					/>
				</Tabs.Content>

				<Tabs.Content value="details" class="mt-4">
					<div bind:this={mobileDepreciationSection}>
						<DepreciationForecastPanel
							{selectedRecommendation}
							{isLoadingDepreciation}
							{depreciationError}
							{depreciationViewData}
							{selectedUsageLabel}
							{depreciationMetric}
							{depreciationCaption}
							on:metricChange={(event) => (depreciationMetric = event.detail)}
						/>
					</div>
				</Tabs.Content>
			</Tabs.Root>
		</div>

		<div class="hidden lg:block">
			<div class="grid gap-4 sm:gap-6 lg:grid-cols-[1.05fr_0.95fr]">
				<VehiclePreferencesForm
					{budgetRange}
					{priceRangeMax}
					{budgetTicks}
					{isLoadingBudgetRange}
					{ageRange}
					{ageRangeMax}
					{ageTicks}
					{isLoadingAgeRange}
					{preferredBrand}
					{bodyType}
					{drivetrain}
					{fuelType}
					{usageType}
					{brandOptions}
					{bodyTypeOptions}
					{drivetrainOptions}
					{fuelOptions}
					{isLoadingBrands}
					{isLoadingBodyTypes}
					{isLoadingDrivetrains}
					{isLoadingFuelTypes}
					{requestError}
					{isSubmitting}
					on:submit={() => void submitPreferences()}
					on:budgetRangeChange={(event) => (budgetRange = event.detail)}
					on:ageRangeChange={(event) => (ageRange = event.detail)}
					on:brandChange={(event) => handleBrandChange(event.detail)}
					on:bodyTypeChange={(event) => handleBodyTypeChange(event.detail)}
					on:drivetrainChange={(event) => handleDrivetrainChange(event.detail)}
					on:fuelTypeChange={(event) => handleFuelTypeChange(event.detail)}
					on:usageTypeChange={(event) => (usageType = event.detail)}
				/>

				<RecommendationResultsPanel
					{recommendations}
					{resultsStale}
					{totalRecommendations}
					{recommendationsPerPage}
					{currentPage}
					{selectedRecommendationKey}
					{recommendationSort}
					on:sortChange={(event) => (recommendationSort = event.detail)}
					on:pageChange={(event) => (currentPage = event.detail)}
					on:selectRecommendation={(event) => void selectRecommendation(event.detail)}
				/>
			</div>

			<div bind:this={desktopDepreciationSection}>
				<DepreciationForecastPanel
					{selectedRecommendation}
					{isLoadingDepreciation}
					{depreciationError}
					{depreciationViewData}
					{selectedUsageLabel}
					{depreciationMetric}
					{depreciationCaption}
					on:metricChange={(event) => (depreciationMetric = event.detail)}
				/>
			</div>
		</div>
	</div>
</div>
