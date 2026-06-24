<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import * as ScrollArea from '$lib/components/ui/scroll-area';
	import * as Pagination from '$lib/components/ui/pagination';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { SearchIcon } from '@hugeicons/core-free-icons';
	import {
		drivetrainLabels,
		formatFuelUsageEstimate,
		getBodyTypeIcon,
		getFuelBadgeClasses,
		recommendationSortOptions
	} from '$lib/features/vehicle-recommendation/helpers';
	import type {
		Recommendation,
		RecommendationSort
	} from '$lib/features/vehicle-recommendation/types';

	type Props = {
		recommendations: Recommendation[];
		resultsStale: boolean;
		totalRecommendations: number;
		recommendationsPerPage: number;
		currentPage: number;
		selectedRecommendationKey: string;
		comparisonKeys: string[];
		maxComparisonItems: number;
		recommendationSort: RecommendationSort;
	};

	let {
		recommendations,
		resultsStale,
		totalRecommendations,
		recommendationsPerPage,
		currentPage,
		selectedRecommendationKey,
		comparisonKeys,
		maxComparisonItems,
		recommendationSort
	}: Props = $props();

	const dispatch = createEventDispatcher<{
		sortChange: RecommendationSort;
		pageChange: number;
		selectRecommendation: string;
		toggleComparison: string;
	}>();

	// svelte-ignore state_referenced_locally
		let paginationPage = $state(currentPage);

	$effect(() => {
		paginationPage = currentPage;
	});

	$effect(() => {
		if (paginationPage !== currentPage) {
			dispatch('pageChange', paginationPage);
		}
	});
</script>

<aside class="rounded-[1.5rem] border border-border bg-card p-4 shadow-sm sm:rounded-[2rem] sm:p-6">
	<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
		<div class="flex items-start gap-3">
			<div class="flex size-11 items-center justify-center rounded-2xl border border-border bg-muted/50 text-foreground">
				<HugeiconsIcon icon={SearchIcon} class="size-5" />
			</div>
			<div>
				<p class="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">Recommendations</p>
				<h2 class="mt-1 text-2xl font-black tracking-normal text-foreground">Cars</h2>
			</div>
		</div>
		<div class="flex flex-col gap-3 sm:flex-row sm:items-start lg:ml-auto">
			<div class="mx-auto inline-flex items-center justify-center rounded-full border border-border bg-muted/40 px-4 py-2 text-center text-sm text-muted-foreground sm:mx-0">
				{resultsStale ? 'Filters changed' : `${totalRecommendations} found`}
			</div>
			<div class="mx-auto inline-flex items-center justify-center rounded-full border border-border bg-muted/40 px-4 py-2 text-center text-sm text-muted-foreground sm:mx-0">
				Compare {comparisonKeys.length}/{maxComparisonItems}
			</div>
			<label class="space-y-2">
				<span class="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">Sort by</span>
				<select
					value={recommendationSort}
					class="h-10 w-full rounded-full border border-border bg-background px-4 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 sm:min-w-52"
					onchange={(event) =>
						dispatch('sortChange', (event.currentTarget as HTMLSelectElement).value as RecommendationSort)}
				>
					{#each recommendationSortOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</label>
		</div>
	</div>

	<ScrollArea.Root class="mt-4 lg:h-124" orientation="vertical" scrollbarYClasses="w-2.5">
		<div class="space-y-3 lg:pr-3">
			{#if resultsStale}
				<div class="rounded-[1.4rem] border border-amber-500/20 bg-amber-500/10 p-5 text-sm leading-6 text-amber-100">
					The current inputs are different from the last submitted search. Click "Get recommendations" again to refresh the results for this budget range.
				</div>
			{:else if recommendations.length > 0}
				{#each recommendations as car}
					{@const recommendationKey = `${car.manufacturer_name}-${car.model_name}-${car.year_produced}-${car.price_usd}`}
					{@const isCompared = comparisonKeys.includes(recommendationKey)}
					{@const compareLimitReached = !isCompared && comparisonKeys.length >= maxComparisonItems}
					<div
						role="button"
						tabindex="0"
						class={`w-full rounded-[1.1rem] border bg-background p-3 text-left transition sm:rounded-[1.3rem] sm:p-3.5 ${
							recommendationKey === selectedRecommendationKey
								? 'border-primary/45 bg-primary/5 shadow-sm'
								: 'border-border hover:border-ring/70 hover:bg-muted/60'
						}`}
						onclick={() => dispatch('selectRecommendation', recommendationKey)}
						onkeydown={(event) => {
							if (event.key === 'Enter' || event.key === ' ') {
								event.preventDefault();
								dispatch('selectRecommendation', recommendationKey);
							}
						}}
					>
						<div class="flex items-start gap-3">
							{#if getBodyTypeIcon(car.body_type)}
								<img src={getBodyTypeIcon(car.body_type)} alt={car.body_type} class="mt-1 h-9 w-9 object-contain opacity-85" />
							{/if}
							<div class="min-w-0 flex-1">
								<p class="text-base font-bold text-foreground">{car.manufacturer_name} {car.model_name}</p>
								<p class="mt-1 text-sm leading-5 text-muted-foreground">
									{car.body_type} · {car.year_produced || 'Year unknown'} · {car.transmission || 'Transmission unknown'}
								</p>
								<p class="mt-2 text-sm text-muted-foreground">
									{drivetrainLabels[car.drivetrain ?? ''] ?? car.drivetrain ?? 'Drivetrain unknown'}
								</p>
								<div class="mt-1 flex items-center gap-2 text-sm">
									<span class={`h-2.5 w-2.5 rounded-full ${getFuelBadgeClasses(car.engine_fuel || '').dot}`}></span>
									<span class={getFuelBadgeClasses(car.engine_fuel || '').text}>
										{car.engine_fuel || 'Fuel unknown'}
									</span>
								</div>
								<p class="mt-2 text-sm text-muted-foreground">
									Estimated fuel use:
									<span class="font-semibold text-foreground">
										{formatFuelUsageEstimate(car.estimated_fuel_usage_l_per_100km)}
									</span>
								</p>
								<div class="mt-3 flex flex-wrap items-center gap-2">
									<p class="text-[15px] font-semibold text-foreground">${car.price_usd.toLocaleString()}</p>
									<button
										type="button"
										class={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
											isCompared
											? 'border-primary bg-primary text-primary-foreground'
											: compareLimitReached
												? 'border-border bg-muted text-muted-foreground'
												: 'border-border bg-background text-foreground hover:border-ring/70 hover:bg-muted'
										}`}
										disabled={compareLimitReached}
										onclick={(event) => {
											event.stopPropagation();
											dispatch('toggleComparison', recommendationKey);
										}}
									>
										{isCompared ? 'Compared' : compareLimitReached ? 'Limit reached' : 'Compare'}
									</button>
								</div>
							</div>
						</div>
					</div>
				{/each}
			{:else}
				<div class="rounded-[1.4rem] border border-dashed border-border bg-muted/40 p-5 text-sm leading-6 text-muted-foreground">
					Submit the form to see matching cars.
				</div>
			{/if}
		</div>
	</ScrollArea.Root>

	{#if !resultsStale && totalRecommendations > recommendationsPerPage}
		<div class="mt-4 border-t border-border pt-4">
			<Pagination.Root count={totalRecommendations} perPage={recommendationsPerPage} bind:page={paginationPage} siblingCount={1}>
				{#snippet child({ pages })}
					<Pagination.Content class="flex-wrap justify-center gap-1.5">
						<Pagination.Item>
							<Pagination.PrevButton
								class="border-border bg-background text-foreground hover:bg-muted disabled:opacity-40"
							/>
						</Pagination.Item>
						{#each pages as page (page.key)}
							<Pagination.Item>
								{#if page.type === 'ellipsis'}
									<Pagination.Ellipsis class="text-muted-foreground" />
								{:else}
									<Pagination.Link
										{page}
										isActive={paginationPage === page.value}
										class="border-border bg-background text-foreground hover:bg-muted data-active:border-primary data-active:bg-primary data-active:text-primary-foreground"
									/>
								{/if}
							</Pagination.Item>
						{/each}
						<Pagination.Item>
							<Pagination.NextButton
								class="border-border bg-background text-foreground hover:bg-muted disabled:opacity-40"
							/>
						</Pagination.Item>
					</Pagination.Content>
				{/snippet}
			</Pagination.Root>
		</div>
	{/if}
</aside>
