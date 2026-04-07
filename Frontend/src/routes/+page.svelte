<script lang="ts">
	import { onMount } from 'svelte';
	import { tick } from 'svelte';
	import * as Command from '$lib/components/ui/command';
	import * as Popover from '$lib/components/ui/popover';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';

	type UsageType = 'daily' | 'road-trips' | 'weekend';

	type Recommendation = {
		manufacturer_name: string;
		model_name: string;
		body_type: string;
		price_usd: number;
		year_produced: string;
		transmission: string;
		engine_fuel: string;
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

	let budgetMin = $state('');
	let budgetMax = $state('');
	let preferredBrand = $state('');
	let bodyType = $state('');
	let usageType = $state<UsageType>('daily');

	let brands = $state<string[]>([]);
	let bodyTypes = $state<string[]>([]);
	let recommendations = $state<Recommendation[]>([]);
	let isLoadingBrands = $state(true);
	let isLoadingBodyTypes = $state(false);
	let isSubmitting = $state(false);
	let requestError = $state('');
	let brandOpen = $state(false);
	let bodyTypeOpen = $state(false);
	let brandTriggerRef = $state<HTMLButtonElement>(null!);
	let bodyTypeTriggerRef = $state<HTMLButtonElement>(null!);

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

	const budgetSummary = $derived.by(() => {
		if (!budgetMin && !budgetMax) return 'Not set yet';
		return `${budgetMin || '0'} - ${budgetMax || '0'}`;
	});

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

		try {
			const response = await fetch('/api/recommend', {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					budgetMin,
					budgetMax,
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
		} catch (error) {
			requestError = error instanceof Error ? error.message : 'Unable to load recommendations.';
			recommendations = [];
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

	onMount(async () => {
		await loadBrands();
		await loadBodyTypes('');
	});
</script>

<svelte:head>
	<title>Preference Input</title>
	<meta
		name="description"
		content="Vehicle preference input page with live preference review and dataset-backed recommendations."
	/>
</svelte:head>

<div class="min-h-screen bg-black text-slate-100">
	<div class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
		<div class="mb-8 space-y-3">
			<p class="text-sm font-semibold tracking-[0.24em] text-slate-400 uppercase">Vehicle preferences</p>
			<h1 class="text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">Enter your preferences</h1>
			<p class="max-w-2xl text-base leading-7 text-slate-400">
				Brand and body type now come from the backend dataset, and the form submits to a recommendation endpoint.
			</p>
		</div>

		<div class="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
			<section class="rounded-[2rem] border border-white/10 bg-neutral-950 p-6 sm:p-8">
				<form
					class="space-y-6"
					onsubmit={(event) => {
						event.preventDefault();
						void submitPreferences();
					}}
				>
					<div class="grid gap-5 sm:grid-cols-2">
						<label class="space-y-2">
							<span class="text-sm font-semibold text-slate-200">Minimum budget</span>
							<input
								bind:value={budgetMin}
								type="number"
								min="0"
								placeholder="e.g. 5000"
								class="w-full rounded-[1.2rem] border border-white/10 bg-black px-4 py-3 text-white placeholder:text-slate-600 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-700"
							/>
						</label>

						<label class="space-y-2">
							<span class="text-sm font-semibold text-slate-200">Maximum budget</span>
							<input
								bind:value={budgetMax}
								type="number"
								min="0"
								placeholder="e.g. 12000"
								class="w-full rounded-[1.2rem] border border-white/10 bg-black px-4 py-3 text-white placeholder:text-slate-600 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-700"
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
											class="h-12 w-full justify-between rounded-[1.2rem] border-white/10 bg-black px-4 text-white hover:bg-neutral-900"
											role="combobox"
											aria-expanded={brandOpen}
											disabled={isLoadingBrands}
										>
											{selectedBrandLabel || 'Any brand'}
											<span class="text-xs text-slate-500">v</span>
										</Button>
									{/snippet}
								</Popover.Trigger>
								<Popover.Content class="w-[var(--bits-popover-anchor-width)] border-white/10 bg-neutral-950 p-0 text-white">
									<Command.Root>
										<Command.Input placeholder="Search brand..." class="border-white/10 bg-neutral-950 text-white placeholder:text-slate-500" />
										<Command.List class="bg-neutral-950">
											<Command.Empty>No brand found.</Command.Empty>
											<Command.Group value="brands">
												<Command.Item
													value=""
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
											class="h-12 w-full justify-between rounded-[1.2rem] border-white/10 bg-black px-4 text-white hover:bg-neutral-900"
											role="combobox"
											aria-expanded={bodyTypeOpen}
											disabled={isLoadingBodyTypes}
										>
											{selectedBodyTypeLabel || 'Any body type'}
											<span class="text-xs text-slate-500">v</span>
										</Button>
									{/snippet}
								</Popover.Trigger>
								<Popover.Content class="w-[var(--bits-popover-anchor-width)] border-white/10 bg-neutral-950 p-0 text-white">
									<Command.Root>
										<Command.Input placeholder="Search body type..." class="border-white/10 bg-neutral-950 text-white placeholder:text-slate-500" />
										<Command.List class="bg-neutral-950">
											<Command.Empty>No body type found.</Command.Empty>
											<Command.Group value="body-types">
												<Command.Item
													value=""
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

					<div class="space-y-3">
						<div>
							<p class="text-sm font-semibold text-slate-200">Usage type</p>
							<p class="mt-1 text-sm text-slate-500">Using “Road trips” as the better term for long journey.</p>
						</div>

						<div class="grid gap-3">
							{#each usageOptions as option}
								<button
									type="button"
									class={`w-full rounded-[1.4rem] border px-4 py-4 text-left transition ${
										usageType === option.value
											? 'border-white/30 bg-white/5'
											: 'border-white/10 bg-black hover:border-white/20'
									}`}
									onclick={() => (usageType = option.value)}
								>
									<p class="text-base font-bold text-white">{option.label}</p>
									<p class="mt-1 text-sm leading-6 text-slate-500">{option.description}</p>
								</button>
							{/each}
						</div>
					</div>

					{#if requestError}
						<p class="rounded-[1.2rem] border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
							{requestError}
						</p>
					{/if}

					<div class="flex items-center justify-between border-t border-white/10 pt-6">
						<p class="text-sm text-slate-500">Dataset-backed filters and recommendation request.</p>
						<Button
							type="submit"
							size="lg"
							class="h-11 rounded-full bg-white px-6 text-sm font-semibold text-black hover:bg-slate-200"
							disabled={isSubmitting}
						>
							{isSubmitting ? 'Loading...' : 'Get recommendations'}
						</Button>
					</div>
				</form>
			</section>

			<aside class="space-y-6">
				<section class="rounded-[2rem] border border-white/10 bg-neutral-950 p-6 sm:p-8">
					<div class="space-y-6">
						<div>
							<p class="text-sm font-semibold tracking-[0.18em] text-slate-400 uppercase">Live review</p>
							<h2 class="mt-3 text-3xl font-black tracking-[-0.04em] text-white">Current preferences</h2>
						</div>

						<div class="grid gap-4">
							<div class="rounded-[1.5rem] border border-white/10 bg-black p-5">
								<p class="text-sm font-semibold text-slate-500">Budget range</p>
								<p class="mt-2 text-2xl font-bold tracking-[-0.03em] text-white">{budgetSummary}</p>
							</div>

							<div class="rounded-[1.5rem] border border-white/10 bg-black p-5">
								<p class="text-sm font-semibold text-slate-500">Preferred brand</p>
								<p class="mt-2 text-lg font-semibold text-white">{preferredBrand || 'Any brand'}</p>
							</div>

							<div class="rounded-[1.5rem] border border-white/10 bg-black p-5">
								<p class="text-sm font-semibold text-slate-500">Body type</p>
								<p class="mt-2 text-lg font-semibold text-white">{bodyType || 'Any body type'}</p>
							</div>

							<div class="rounded-[1.5rem] border border-white/10 bg-black p-5">
								<p class="text-sm font-semibold text-slate-500">Usage</p>
								<p class="mt-2 text-lg font-semibold text-white">{selectedUsage.label}</p>
								<p class="mt-1 text-sm leading-6 text-slate-500">{selectedUsage.description}</p>
							</div>
						</div>
					</div>
				</section>

				<section class="rounded-[2rem] border border-white/10 bg-neutral-950 p-6 sm:p-8">
					<div class="flex items-center justify-between gap-4">
						<div>
							<p class="text-sm font-semibold tracking-[0.18em] text-slate-400 uppercase">Recommendations</p>
							<h2 class="mt-3 text-3xl font-black tracking-[-0.04em] text-white">Results</h2>
						</div>
						<div class="rounded-full border border-white/10 bg-black px-4 py-2 text-sm text-slate-300">
							{recommendations.length} found
						</div>
					</div>

					<div class="mt-6 space-y-3">
						{#if recommendations.length > 0}
							{#each recommendations as car}
								<div class="rounded-[1.4rem] border border-white/10 bg-black p-4">
									<p class="text-lg font-bold text-white">{car.manufacturer_name} {car.model_name}</p>
									<p class="mt-1 text-sm text-slate-400">
										{car.body_type} · {car.year_produced || 'Year unknown'} · {car.transmission || 'Transmission unknown'}
									</p>
									<p class="mt-3 text-sm text-slate-500">{car.engine_fuel || 'Fuel unknown'}</p>
									<p class="mt-2 text-base font-semibold text-white">${car.price_usd.toLocaleString()}</p>
								</div>
							{/each}
						{:else}
							<div class="rounded-[1.4rem] border border-dashed border-white/10 bg-black p-5 text-sm leading-6 text-slate-500">
								Submit the form to see matching cars from the dataset.
							</div>
						{/if}
					</div>
				</section>
			</aside>
		</div>
	</div>
</div>
