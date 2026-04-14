<script lang="ts">
	import { onMount, tick } from 'svelte';
	import * as Command from '$lib/components/ui/command';
	import * as Popover from '$lib/components/ui/popover';
	import * as Slider from '$lib/components/ui/slider';
	import * as ScrollArea from '$lib/components/ui/scroll-area';
	import * as Pagination from '$lib/components/ui/pagination';
	import * as Chart from '$lib/components/ui/chart';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import { LineChart, Tooltip as LayerTooltip } from 'layerchart';
	import cabrioletIcon from '$lib/assets/car-icon/cabriolet.png';
	import coupeIcon from '$lib/assets/car-icon/coupe.png';
	import hatchbackIcon from '$lib/assets/car-icon/hatchback.png';
	import liftbackIcon from '$lib/assets/car-icon/liftback.png';
	import limousineIcon from '$lib/assets/car-icon/limousie.png';
	import minivanIcon from '$lib/assets/car-icon/minivan.png';
	import pickupIcon from '$lib/assets/car-icon/pickup.png';
	import sedanIcon from '$lib/assets/car-icon/sedan.png';
	import suvIcon from '$lib/assets/car-icon/suv.png';
	import vanIcon from '$lib/assets/car-icon/van.png';
	import wagonIcon from '$lib/assets/car-icon/wagon.png';

	type UsageType = 'daily' | 'road-trips' | 'weekend';

	type Recommendation = {
		manufacturer_name: string;
		model_name: string;
		body_type: string;
		drivetrain?: string;
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

	type DepreciationMetric = 'price' | 'depreciation';

	type DepreciationViewPoint = DepreciationPoint & {
		chart_value: number;
		depreciation_percent: number;
		annual_loss_usd: number;
		value_retention_percent: number;
	};

	type RecommendationSort = 'recommended' | 'price-asc' | 'price-desc' | 'year-asc' | 'year-desc';

	const usageOptions: Array<{
		value: UsageType;
		label: string;
		description: string;
	}> = [
		{ value: 'daily', label: 'Daily commute', description: 'For regular city driving and everyday errands.' },
		{ value: 'road-trips', label: 'Road trips', description: 'A clearer replacement for long journey.' },
		{ value: 'weekend', label: 'Weekend use', description: 'For occasional drives and leisure use.' }
	];

	const drivetrainLabels: Record<string, string> = {
		all: 'All-wheel drive (AWD)',
		front: 'Front-wheel drive (FWD)',
		rear: 'Rear-wheel drive (RWD)'
	};

	const fuelTypeLabels: Record<string, string> = {
		diesel: 'Diesel',
		gas: 'Gas',
		'hybrid-petrol': 'Hybrid petrol',
		petrol: 'Petrol'
	};

	const recommendationSortOptions: Array<{ value: RecommendationSort; label: string }> = [
		{ value: 'recommended', label: 'Recommended' },
		{ value: 'price-asc', label: 'Price: Low to high' },
		{ value: 'price-desc', label: 'Price: High to low' },
		{ value: 'year-desc', label: 'Year: Newest first' },
		{ value: 'year-asc', label: 'Year: Oldest first' }
	];

	const fallbackDrivetrains = ['all', 'front', 'rear'];

	const bodyTypeIconMap: Record<string, string> = {
		cabriolet: cabrioletIcon,
		coupe: coupeIcon,
		hatchback: hatchbackIcon,
		liftback: liftbackIcon,
		limousine: limousineIcon,
		minibus: vanIcon,
		minivan: minivanIcon,
		pickup: pickupIcon,
		sedan: sedanIcon,
		suv: suvIcon,
		van: vanIcon,
		wagon: wagonIcon
	};

	const chartConfig = {
		depreciation: {
			label: 'Predicted value',
			color: '#f8fafc'
		}
	} satisfies Chart.ChartConfig;

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
	let brandOpen = $state(false);
	let bodyTypeOpen = $state(false);
	let drivetrainOpen = $state(false);
	let fuelTypeOpen = $state(false);
	let brandTriggerRef = $state<HTMLButtonElement>(null!);
	let bodyTypeTriggerRef = $state<HTMLButtonElement>(null!);
	let drivetrainTriggerRef = $state<HTMLButtonElement>(null!);
	let fuelTypeTriggerRef = $state<HTMLButtonElement>(null!);
	let lastSubmittedFilters = $state<string | null>(null);
	let selectedRecommendationKey = $state('');
	let currentPage = $state(1);
	let lastObservedPage = $state(1);
	let totalRecommendations = $state(0);
	let lastObservedSort = $state<RecommendationSort>('recommended');
	let depreciationChartContext = $state<any>(null);

	const recommendationsPerPage = 6;

	const selectedUsage = $derived(
		usageOptions.find((option) => option.value === usageType) ?? usageOptions[0]
	);

	const brandOptions = $derived(brands.map((brand) => ({ value: brand, label: brand })));
	const bodyTypeOptions = $derived(
		bodyTypes.map((item) => ({
			value: item,
			label: item,
			icon: bodyTypeIconMap[item]
		}))
	);
	const drivetrainOptions = $derived(
		drivetrains.map((item) => ({
			value: item,
			label: drivetrainLabels[item] ?? item
		}))
	);
	const fuelOptions = $derived(
		fuelTypes.map((item) => ({
			value: item,
			label: fuelTypeLabels[item] ?? item
		}))
	);
	const selectedBrandLabel = $derived(
		brandOptions.find((option) => option.value === preferredBrand)?.label
	);
	const selectedBodyTypeOption = $derived(bodyTypeOptions.find((option) => option.value === bodyType));
	const selectedBodyTypeLabel = $derived(selectedBodyTypeOption?.label);
	const selectedDrivetrainLabel = $derived(
		drivetrainOptions.find((option) => option.value === drivetrain)?.label
	);
	const selectedFuelLabel = $derived(fuelOptions.find((option) => option.value === fuelType)?.label);

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

	const totalPages = $derived(Math.max(1, Math.ceil(totalRecommendations / recommendationsPerPage)));

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
			depreciationChartContext = null;
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

	const hoveredDepreciationPoint = $derived(
		(depreciationChartContext?.tooltip?.data as DepreciationViewPoint | null | undefined) ?? null
	);

	const activeDepreciationPoint = $derived.by(
		() => hoveredDepreciationPoint ?? depreciationViewData[depreciationViewData.length - 1] ?? null
	);

	const currentCarAge = $derived(depreciationViewData[0]?.car_age ?? null);
	const finalCarAge = $derived(
		depreciationViewData.length > 0 ? depreciationViewData[depreciationViewData.length - 1]?.car_age ?? null : null
	);

	function getForecastPoint(yearOffset: number) {
		return depreciationViewData[yearOffset] ?? null;
	}

	const oneYearPoint = $derived(getForecastPoint(1));
	const threeYearPoint = $derived(getForecastPoint(3));
	const fiveYearPoint = $derived(getForecastPoint(5) ?? depreciationViewData[depreciationViewData.length - 1] ?? null);

	const depreciationCaption = $derived.by(() => {
		if (!selectedRecommendation || !fiveYearPoint) {
			return '';
		}

		return `Based on this model, the car is projected to retain ${Math.round(fiveYearPoint.value_retention_percent)}% of its current value after 5 years.`;
	});

	function formatCurrency(value: number) {
		return `$${Math.round(value).toLocaleString()}`;
	}

	function formatPercent(value: number, digits = 0) {
		return `${value.toFixed(digits)}%`;
	}

	function formatLoss(value?: number | null) {
		if (typeof value !== 'number' || Number.isNaN(value)) {
			return 'N/A';
		}

		return formatCurrency(value);
	}

	function formatOdometer(value?: number) {
		if (typeof value !== 'number' || Number.isNaN(value)) {
			return 'N/A';
		}

		return `${Math.round(value).toLocaleString()} km`;
	}

	function getBodyTypeIcon(bodyTypeValue: string) {
		return bodyTypeIconMap[bodyTypeValue.toLowerCase()];
	}

	function getFuelBadgeClasses(fuelValue: string) {
		const normalized = fuelValue.toLowerCase();

		if (normalized === 'petrol') {
			return {
				dot: 'bg-emerald-400',
				text: 'text-emerald-200'
			};
		}

		if (normalized === 'diesel') {
			return {
				dot: 'bg-slate-400',
				text: 'text-slate-300'
			};
		}

		return {
			dot: 'bg-slate-600',
			text: 'text-slate-500'
		};
	}

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

	async function selectDrivetrain(nextDrivetrain: string) {
		drivetrain = nextDrivetrain;
		drivetrainOpen = false;
		await tick();
		drivetrainTriggerRef?.focus();
	}

	async function selectFuelType(nextFuelType: string) {
		fuelType = nextFuelType;
		fuelTypeOpen = false;
		await tick();
		fuelTypeTriggerRef?.focus();
	}

	async function loadDepreciationForecast(car: Recommendation) {
		isLoadingDepreciation = true;
		depreciationError = '';
		depreciationChartContext = null;

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
	<title>Preference Input</title>
	<meta name="description" content="Vehicle preference input page with recommendations and depreciation chart." />
</svelte:head>

<div class="min-h-screen bg-black text-slate-100">
	<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
		<div class="mb-6 space-y-2">
			<p class="text-sm font-semibold tracking-[0.24em] text-slate-400 uppercase">Fyze's Smart Car Recommendation System</p>
			<h1 class="text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">Vehicle Preference Recommendation</h1>
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
					<div class="space-y-3">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div>
								<span class="text-sm font-semibold text-slate-200">Budget range (USD)</span>
							</div>
							<div class="flex flex-wrap gap-2 text-sm">
								<div class="rounded-full border border-white/10 bg-black px-3 py-1.5 text-slate-300">
									Min: <span class="font-semibold text-white">{formatCurrency(budgetRange[0])}</span>
								</div>
								<div class="rounded-full border border-white/10 bg-black px-3 py-1.5 text-slate-300">
									Max: <span class="font-semibold text-white">{formatCurrency(budgetRange[1])}</span>
								</div>
							</div>
						</div>

						<Slider.Root
							bind:value={budgetRange}
							type="multiple"
							min={0}
							max={priceRangeMax}
							step={100}
							disabled={isLoadingBudgetRange}
							class="py-1"
						/>

						<div class="flex justify-between text-xs text-slate-500">
							{#each budgetTicks as tick}
								<span>{tick.label}</span>
							{/each}
						</div>

						{#if isLoadingBudgetRange}
							<p class="text-sm text-slate-500">Loading budget range...</p>
						{/if}
					</div>

					<div class="space-y-3">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div>
								<span class="text-sm font-semibold text-slate-200">Car age range</span>
							</div>
							<div class="flex flex-wrap gap-2 text-sm">
								<div class="rounded-full border border-white/10 bg-black px-3 py-1.5 text-slate-300">
									Min: <span class="font-semibold text-white">{ageRange[0]} years</span>
								</div>
								<div class="rounded-full border border-white/10 bg-black px-3 py-1.5 text-slate-300">
									Max: <span class="font-semibold text-white">{ageRange[1]} years</span>
								</div>
							</div>
						</div>

						<Slider.Root
							bind:value={ageRange}
							type="multiple"
							min={0}
							max={ageRangeMax}
							step={1}
							disabled={isLoadingAgeRange}
							class="py-1"
						/>

						<div class="flex justify-between text-xs text-slate-500">
							{#each ageTicks as tick}
								<span>{tick.label}</span>
							{/each}
						</div>

						{#if isLoadingAgeRange}
							<p class="text-sm text-slate-500">Loading age range...</p>
						{/if}
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
											class="h-11 w-full justify-between rounded-[1.2rem] border-white/10! bg-black! px-4 text-white! hover:bg-neutral-900! focus-visible:ring-0! focus-visible:outline-none!"
											role="combobox"
											aria-expanded={brandOpen}
											disabled={isLoadingBrands}
										>
											{selectedBrandLabel || 'Any brand'}
											<span class="text-xs text-slate-500">v</span>
										</Button>
									{/snippet}
								</Popover.Trigger>
								<Popover.Content class="combobox-popover w-(--bits-popover-anchor-width) border-white/10! bg-neutral-950! p-0 text-white! ring-0!">
									<Command.Root>
										<Command.Input placeholder="Search brand..." class="bg-transparent! text-white! placeholder:text-slate-500! focus-visible:ring-0! focus-visible:outline-none!" />
										<Command.List class="bg-neutral-950">
											<Command.Empty>No brand found.</Command.Empty>
											<Command.Group value="brands">
												<Command.Item value="" class="text-slate-200 data-selected:bg-neutral-900! data-selected:text-white!" onSelect={() => void selectBrand('')}>
													<span class={cn('mr-2 text-xs', preferredBrand ? 'text-transparent' : 'text-white')}>✓</span>
													Any brand
												</Command.Item>
												{#each brandOptions as brand (brand.value)}
													<Command.Item value={brand.value} class="text-slate-200 data-selected:bg-neutral-900! data-selected:text-white!" onSelect={() => void selectBrand(brand.value)}>
														<span class={cn('mr-2 text-xs', preferredBrand !== brand.value && 'text-transparent')}>✓</span>
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
											class="h-11 w-full justify-between rounded-[1.2rem] border-white/10! bg-black! px-4 text-white! hover:bg-neutral-900! focus-visible:ring-0! focus-visible:outline-none!"
											role="combobox"
											aria-expanded={bodyTypeOpen}
											disabled={isLoadingBodyTypes}
										>
											<span class="flex items-center gap-3 overflow-hidden">
												{#if selectedBodyTypeOption?.icon}
													<img src={selectedBodyTypeOption.icon} alt={selectedBodyTypeOption.label} class="h-7 w-7 object-contain opacity-90" />
												{/if}
												<span class="truncate">{selectedBodyTypeLabel || 'Any body type'}</span>
											</span>
											<span class="text-xs text-slate-500">v</span>
										</Button>
									{/snippet}
								</Popover.Trigger>
								<Popover.Content class="combobox-popover w-(--bits-popover-anchor-width) border-white/10! bg-neutral-950! p-0 text-white! ring-0!">
									<Command.Root>
										<Command.Input placeholder="Search body type..." class="bg-transparent! text-white! placeholder:text-slate-500! focus-visible:ring-0! focus-visible:outline-none!" />
										<Command.List class="bg-neutral-950">
											<Command.Empty>No body type found.</Command.Empty>
											<Command.Group value="body-types">
												<Command.Item value="" class="text-slate-200 data-selected:bg-neutral-900! data-selected:text-white!" onSelect={() => void selectBodyType('')}>
													<span class={cn('mr-2 text-xs', bodyType ? 'text-transparent' : 'text-white')}>✓</span>
													<span class="mr-3 inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/10 text-[10px] text-slate-500">-</span>
													Any body type
												</Command.Item>
												{#each bodyTypeOptions as option (option.value)}
													<Command.Item value={option.value} class="text-slate-200 data-selected:bg-neutral-900! data-selected:text-white!" onSelect={() => void selectBodyType(option.value)}>
														<span class={cn('mr-2 text-xs', bodyType !== option.value && 'text-transparent')}>✓</span>
														{#if option.icon}
															<img src={option.icon} alt={option.label} class="mr-3 h-7 w-7 object-contain opacity-90" />
														{/if}
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

					<div class="grid gap-5 sm:grid-cols-2">
						<div class="space-y-2">
						<span class="text-sm font-semibold text-slate-200">Drivetrain</span>
						<Popover.Root bind:open={drivetrainOpen}>
							<Popover.Trigger bind:ref={drivetrainTriggerRef}>
								{#snippet child({ props })}
									<Button
										{...props}
										variant="outline"
										class="h-11 w-full justify-between rounded-[1.2rem] border-white/10! bg-black! px-4 text-white! hover:bg-neutral-900! focus-visible:ring-0! focus-visible:outline-none!"
										role="combobox"
										aria-expanded={drivetrainOpen}
										disabled={isLoadingDrivetrains}
									>
										{selectedDrivetrainLabel || 'Any drivetrain'}
										<span class="text-xs text-slate-500">v</span>
									</Button>
								{/snippet}
							</Popover.Trigger>
							<Popover.Content class="combobox-popover w-(--bits-popover-anchor-width) border-white/10! bg-neutral-950! p-0 text-white! ring-0!">
								<Command.Root>
									<Command.Input placeholder="Search drivetrain..." class="bg-transparent! text-white! placeholder:text-slate-500! focus-visible:ring-0! focus-visible:outline-none!" />
									<Command.List class="bg-neutral-950">
										<Command.Empty>No drivetrain found.</Command.Empty>
										<Command.Group value="drivetrains">
											<Command.Item value="" class="text-slate-200 data-selected:bg-neutral-900! data-selected:text-white!" onSelect={() => void selectDrivetrain('')}>
												<span class={cn('mr-2 text-xs', drivetrain ? 'text-transparent' : 'text-white')}>✓</span>
												Any drivetrain
											</Command.Item>
											{#each drivetrainOptions as option (option.value)}
												<Command.Item value={option.value} class="text-slate-200 data-selected:bg-neutral-900! data-selected:text-white!" onSelect={() => void selectDrivetrain(option.value)}>
													<span class={cn('mr-2 text-xs', drivetrain !== option.value && 'text-transparent')}>✓</span>
													{option.label}
												</Command.Item>
											{/each}
										</Command.Group>
									</Command.List>
								</Command.Root>
							</Popover.Content>
						</Popover.Root>
						{#if isLoadingDrivetrains}
							<p class="text-sm text-slate-500">Loading drivetrains...</p>
						{/if}
						</div>

						<div class="space-y-2">
						<span class="text-sm font-semibold text-slate-200">Fuel type</span>
						<Popover.Root bind:open={fuelTypeOpen}>
							<Popover.Trigger bind:ref={fuelTypeTriggerRef}>
								{#snippet child({ props })}
									<Button
										{...props}
										variant="outline"
										class="h-11 w-full justify-between rounded-[1.2rem] border-white/10! bg-black! px-4 text-white! hover:bg-neutral-900! focus-visible:ring-0! focus-visible:outline-none!"
										role="combobox"
										aria-expanded={fuelTypeOpen}
										disabled={isLoadingFuelTypes}
									>
										{selectedFuelLabel || 'Any fuel type'}
										<span class="text-xs text-slate-500">v</span>
									</Button>
								{/snippet}
							</Popover.Trigger>
							<Popover.Content class="combobox-popover w-(--bits-popover-anchor-width) border-white/10! bg-neutral-950! p-0 text-white! ring-0!">
								<Command.Root>
									<Command.Input placeholder="Search fuel type..." class="bg-transparent! text-white! placeholder:text-slate-500! focus-visible:ring-0! focus-visible:outline-none!" />
									<Command.List class="bg-neutral-950">
										<Command.Empty>No fuel type found.</Command.Empty>
										<Command.Group value="fuel-types">
											<Command.Item value="" class="text-slate-200 data-selected:bg-neutral-900! data-selected:text-white!" onSelect={() => void selectFuelType('')}>
												<span class={cn('mr-2 text-xs', fuelType ? 'text-transparent' : 'text-white')}>✓</span>
												Any fuel type
											</Command.Item>
											{#each fuelOptions as option (option.value)}
												<Command.Item value={option.value} class="text-slate-200 data-selected:bg-neutral-900! data-selected:text-white!" onSelect={() => void selectFuelType(option.value)}>
													<span class={cn('mr-2 text-xs', fuelType !== option.value && 'text-transparent')}>✓</span>
													{option.label}
												</Command.Item>
											{/each}
										</Command.Group>
									</Command.List>
								</Command.Root>
							</Popover.Content>
						</Popover.Root>
						{#if isLoadingFuelTypes}
							<p class="text-sm text-slate-500">Loading fuel types...</p>
						{/if}
						</div>
					</div>

					<div class="space-y-3">
						<div>
							<p class="text-sm font-semibold text-slate-200">Usage type</p>
						</div>

						<div class="grid gap-3 sm:grid-cols-3">
							{#each usageOptions as option}
								<button
									type="button"
									class={`w-full rounded-[1.3rem] border px-4 py-3 text-left transition ${
										usageType === option.value
											? 'border-white/30 bg-white/5 shadow-[0_0_0_1px_rgba(255,255,255,0.05)]'
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
						<Button type="submit" size="lg" class="h-10 rounded-full bg-white px-5 text-sm font-semibold text-black hover:bg-slate-200" disabled={isSubmitting}>
							{isSubmitting ? 'Loading...' : 'Get recommendations'}
						</Button>
					</div>
				</form>
			</section>

			<aside class="rounded-[2rem] border border-white/10 bg-neutral-950 p-5 sm:p-6">
				<div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<p class="text-sm font-semibold tracking-[0.18em] text-slate-400 uppercase">Recommendations</p>
						<h2 class="mt-2 text-2xl font-black tracking-[-0.04em] text-white">Results</h2>
					</div>
					<div class="flex flex-col items-stretch gap-3 sm:items-end">
						
						<div class="rounded-full border border-white/10 bg-black px-4 py-2 text-sm text-slate-300">
							{resultsStale ? 'Filters changed' : `${totalRecommendations} found`}
						</div>
					</div>
					<label class="space-y-2">
							<span class="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">Sort by</span>
							<select
								bind:value={recommendationSort}
								class="h-10 min-w-52 rounded-full border border-white/10 bg-black px-4 text-sm text-white focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-700"
							>
								{#each recommendationSortOptions as option}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
						</label>
				</div>

				<ScrollArea.Root class="mt-4 lg:h-124" orientation="vertical" scrollbarYClasses="w-2.5">
					<div class="space-y-3 pr-3">
						{#if resultsStale}
							<div class="rounded-[1.4rem] border border-amber-500/20 bg-amber-500/10 p-5 text-sm leading-6 text-amber-100">
								The current inputs are different from the last submitted search. Click "Get recommendations" again to refresh the results for this budget range.
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
									<div class="flex items-start gap-3">
										{#if getBodyTypeIcon(car.body_type)}
											<img src={getBodyTypeIcon(car.body_type)} alt={car.body_type} class="mt-1 h-9 w-9 object-contain opacity-85" />
										{/if}
										<div class="min-w-0 flex-1">
											<p class="text-base font-bold text-white">{car.manufacturer_name} {car.model_name}</p>
											<p class="mt-1 text-sm leading-5 text-slate-400">
												{car.body_type} · {car.year_produced || 'Year unknown'} · {car.transmission || 'Transmission unknown'}
											</p>
											<p class="mt-2 text-sm text-slate-500">
												{drivetrainLabels[car.drivetrain ?? ''] ?? car.drivetrain ?? 'Drivetrain unknown'}
											</p>
											<div class="mt-1 flex items-center gap-2 text-sm">
												<span class={`h-2.5 w-2.5 rounded-full ${getFuelBadgeClasses(car.engine_fuel || '').dot}`}></span>
												<span class={getFuelBadgeClasses(car.engine_fuel || '').text}>
													{car.engine_fuel || 'Fuel unknown'}
												</span>
											</div>
											<p class="mt-2 text-[15px] font-semibold text-white">${car.price_usd.toLocaleString()}</p>
										</div>
									</div>
								</button>
							{/each}
						{:else}
							<div class="rounded-[1.4rem] border border-dashed border-white/10 bg-black p-5 text-sm leading-6 text-slate-500">
								Submit the form to see matching cars.
							</div>
						{/if}
					</div>
				</ScrollArea.Root>

				{#if !resultsStale && totalRecommendations > recommendationsPerPage}
					<div class="mt-4 border-t border-white/10 pt-4">
						<Pagination.Root count={totalRecommendations} perPage={recommendationsPerPage} bind:page={currentPage} siblingCount={1}>
							{#snippet child({ pages })}
								<Pagination.Content>
									<Pagination.Item>
										<Pagination.PrevButton
											class="border-white/10 bg-black text-slate-300 hover:bg-neutral-900 hover:text-white disabled:opacity-40"
										/>
									</Pagination.Item>
									{#each pages as page (page.key)}
										<Pagination.Item>
											{#if page.type === 'ellipsis'}
												<Pagination.Ellipsis class="text-slate-500" />
											{:else}
												<Pagination.Link
													{page}
													isActive={currentPage === page.value}
													class="border-white/10 bg-black text-slate-300 hover:bg-neutral-900 hover:text-white data-active:bg-white data-active:text-black"
												/>
											{/if}
										</Pagination.Item>
									{/each}
									<Pagination.Item>
										<Pagination.NextButton
											class="border-white/10 bg-black text-slate-300 hover:bg-neutral-900 hover:text-white disabled:opacity-40"
										/>
									</Pagination.Item>
								</Pagination.Content>
							{/snippet}
						</Pagination.Root>
					</div>
				{/if}
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
						<span class="font-semibold text-white">{selectedRecommendation.manufacturer_name} {selectedRecommendation.model_name}</span>
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
				{:else if selectedRecommendation && depreciationViewData.length > 0}
					<div class="mb-4 flex flex-wrap gap-3 text-sm text-slate-400">
						<div class="rounded-full border border-white/10 bg-black px-4 py-2">
							Usage: <span class="font-semibold text-white">{selectedUsage.label}</span>
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
						<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
							<div class="rounded-[1.2rem] border border-white/10 bg-black px-4 py-3">
								<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">Current price</p>
								<p class="mt-2 text-lg font-bold text-white">{formatCurrency(selectedRecommendation.price_usd)}</p>
							</div>
							<div class="rounded-[1.2rem] border border-white/10 bg-black px-4 py-3">
								<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">1-year loss</p>
								<p class="mt-2 text-lg font-bold text-white">
									{formatLoss(
										typeof oneYearPoint?.predicted_price_usd === 'number'
											? selectedRecommendation.price_usd - oneYearPoint.predicted_price_usd
											: null
									)}
								</p>
							</div>
							<div class="rounded-[1.2rem] border border-white/10 bg-black px-4 py-3">
								<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">3-year loss</p>
								<p class="mt-2 text-lg font-bold text-white">
									{formatLoss(
										typeof threeYearPoint?.predicted_price_usd === 'number'
											? selectedRecommendation.price_usd - threeYearPoint.predicted_price_usd
											: null
									)}
								</p>
							</div>
							<div class="rounded-[1.2rem] border border-white/10 bg-black px-4 py-3">
								<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">5-year loss</p>
								<p class="mt-2 text-lg font-bold text-white">
									{formatLoss(
										typeof fiveYearPoint?.predicted_price_usd === 'number'
											? selectedRecommendation.price_usd - fiveYearPoint.predicted_price_usd
											: null
									)}
								</p>
							</div>
							<div class="rounded-[1.2rem] border border-white/10 bg-black px-4 py-3">
								<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">Current age</p>
								<p class="mt-2 text-lg font-bold text-white">
									{currentCarAge !== null ? `${currentCarAge} years` : 'N/A'}
								</p>
							</div>
							<div class="rounded-[1.2rem] border border-white/10 bg-black px-4 py-3">
								<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">Final projected age</p>
								<p class="mt-2 text-lg font-bold text-white">
									{finalCarAge !== null ? `${finalCarAge} years` : 'N/A'}
								</p>
							</div>
						</div>

						<div class="rounded-[1.4rem] border border-white/10 bg-black px-4 py-4">
							<div class="flex items-start justify-between gap-3">
								<div>
									<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">Selected year</p>
									<p class="mt-2 text-xl font-bold text-white">{activeDepreciationPoint?.year ?? 'N/A'}</p>
								</div>
								<div class="rounded-full border border-white/10 bg-neutral-950 px-3 py-1 text-xs font-semibold text-slate-300">
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

					<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
						<div class="inline-flex rounded-full border border-white/10 bg-black p-1">
							<button
								type="button"
								class={`rounded-full px-4 py-2 text-sm font-semibold transition ${
									depreciationMetric === 'price'
										? 'bg-white text-black'
										: 'text-slate-400 hover:text-white'
								}`}
								onclick={() => (depreciationMetric = 'price')}
							>
								Price (USD)
							</button>
							<button
								type="button"
								class={`rounded-full px-4 py-2 text-sm font-semibold transition ${
									depreciationMetric === 'depreciation'
										? 'bg-white text-black'
										: 'text-slate-400 hover:text-white'
								}`}
								onclick={() => (depreciationMetric = 'depreciation')}
							>
								Depreciation (%)
							</button>
						</div>
					</div>

					<Chart.ChartContainer config={chartConfig} class="h-80 w-full">
						<LineChart
							bind:context={depreciationChartContext}
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
										<LayerTooltip.Header
											value={data?.year}
											color="var(--color-depreciation)"
										/>
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

	:global([data-slot='slider-track']) {
		background: rgb(23 23 23);
	}

	:global([data-slot='slider-range']) {
		background: white;
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
