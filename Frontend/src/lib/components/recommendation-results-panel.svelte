<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import * as ScrollArea from '$lib/components/ui/scroll-area';
	import * as Pagination from '$lib/components/ui/pagination';
	import {
		drivetrainLabels,
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
		recommendationSort: RecommendationSort;
	};

	let {
		recommendations,
		resultsStale,
		totalRecommendations,
		recommendationsPerPage,
		currentPage,
		selectedRecommendationKey,
		recommendationSort
	}: Props = $props();

	const dispatch = createEventDispatcher<{
		sortChange: RecommendationSort;
		pageChange: number;
		selectRecommendation: string;
	}>();

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
				value={recommendationSort}
				class="h-10 min-w-52 rounded-full border border-white/10 bg-black px-4 text-sm text-white focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-700"
				onchange={(event) =>
					dispatch('sortChange', (event.currentTarget as HTMLSelectElement).value as RecommendationSort)}
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
							`${car.manufacturer_name}-${car.model_name}-${car.year_produced}-${car.price_usd}` ===
							selectedRecommendationKey
								? 'border-white/30 bg-white/5'
								: 'border-white/10 hover:border-white/20'
						}`}
						onclick={() =>
							dispatch(
								'selectRecommendation',
								`${car.manufacturer_name}-${car.model_name}-${car.year_produced}-${car.price_usd}`
							)}
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
			<Pagination.Root count={totalRecommendations} perPage={recommendationsPerPage} bind:page={paginationPage} siblingCount={1}>
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
										isActive={paginationPage === page.value}
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
