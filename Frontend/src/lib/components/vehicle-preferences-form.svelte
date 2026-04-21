<script lang="ts">
	import { createEventDispatcher, tick } from 'svelte';
	import * as Command from '$lib/components/ui/command';
	import * as Popover from '$lib/components/ui/popover';
	import * as Slider from '$lib/components/ui/slider';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import {
		bodyTypeIconMap,
		drivetrainLabels,
		formatCurrency,
		fuelTypeLabels,
		usageOptions
	} from '$lib/features/vehicle-recommendation/helpers';
	import type {
		SelectOption,
		TickLabel,
		UsageType
	} from '$lib/features/vehicle-recommendation/types';

	type Props = {
		budgetRange: [number, number];
		priceRangeMax: number;
		budgetTicks: TickLabel[];
		isLoadingBudgetRange: boolean;
		ageRange: [number, number];
		ageRangeMax: number;
		ageTicks: TickLabel[];
		isLoadingAgeRange: boolean;
		preferredBrand: string;
		bodyType: string;
		drivetrain: string;
		fuelType: string;
		usageType: UsageType;
		brandOptions: SelectOption[];
		bodyTypeOptions: SelectOption[];
		drivetrainOptions: SelectOption[];
		fuelOptions: SelectOption[];
		isLoadingBrands: boolean;
		isLoadingBodyTypes: boolean;
		isLoadingDrivetrains: boolean;
		isLoadingFuelTypes: boolean;
		requestError: string;
		isSubmitting: boolean;
	};

	let {
		budgetRange,
		priceRangeMax,
		budgetTicks,
		isLoadingBudgetRange,
		ageRange,
		ageRangeMax,
		ageTicks,
		isLoadingAgeRange,
		preferredBrand,
		bodyType,
		drivetrain,
		fuelType,
		usageType,
		brandOptions,
		bodyTypeOptions,
		drivetrainOptions,
		fuelOptions,
		isLoadingBrands,
		isLoadingBodyTypes,
		isLoadingDrivetrains,
		isLoadingFuelTypes,
		requestError,
		isSubmitting
	}: Props = $props();

	const dispatch = createEventDispatcher<{
		submit: void;
		budgetRangeChange: [number, number];
		ageRangeChange: [number, number];
		brandChange: string;
		bodyTypeChange: string;
		drivetrainChange: string;
		fuelTypeChange: string;
		usageTypeChange: UsageType;
	}>();

	let brandOpen = $state(false);
	let bodyTypeOpen = $state(false);
	let drivetrainOpen = $state(false);
	let fuelTypeOpen = $state(false);
	let brandTriggerRef = $state<HTMLButtonElement>(null!);
	let bodyTypeTriggerRef = $state<HTMLButtonElement>(null!);
	let drivetrainTriggerRef = $state<HTMLButtonElement>(null!);
	let fuelTypeTriggerRef = $state<HTMLButtonElement>(null!);

	const selectedBrandLabel = $derived(
		brandOptions.find((option) => option.value === preferredBrand)?.label
	);
	const selectedBodyTypeOption = $derived(bodyTypeOptions.find((option) => option.value === bodyType));
	const selectedBodyTypeLabel = $derived(selectedBodyTypeOption?.label);
	const selectedDrivetrainLabel = $derived(
		drivetrainOptions.find((option) => option.value === drivetrain)?.label
	);
	const selectedFuelLabel = $derived(fuelOptions.find((option) => option.value === fuelType)?.label);

	async function handleBrandChange(nextBrand: string) {
		dispatch('brandChange', nextBrand);
		brandOpen = false;
		await tick();
		brandTriggerRef?.focus();
	}

	async function handleBodyTypeChange(nextBodyType: string) {
		dispatch('bodyTypeChange', nextBodyType);
		bodyTypeOpen = false;
		await tick();
		bodyTypeTriggerRef?.focus();
	}

	async function handleDrivetrainChange(nextDrivetrain: string) {
		dispatch('drivetrainChange', nextDrivetrain);
		drivetrainOpen = false;
		await tick();
		drivetrainTriggerRef?.focus();
	}

	async function handleFuelTypeChange(nextFuelType: string) {
		dispatch('fuelTypeChange', nextFuelType);
		fuelTypeOpen = false;
		await tick();
		fuelTypeTriggerRef?.focus();
	}
</script>

<section class="rounded-[1.5rem] border border-white/10 bg-neutral-950 p-4 sm:rounded-[2rem] sm:p-6">
	<form
		class="space-y-4 sm:space-y-5"
		onsubmit={(event) => {
			event.preventDefault();
			dispatch('submit');
		}}
	>
		<div class="space-y-3">
			<div class="flex flex-col items-start justify-between gap-2 sm:flex-row sm:gap-3">
				<div>
					<span class="text-sm font-semibold text-slate-200">Budget range (USD)</span>
				</div>
				<div class="grid w-full grid-cols-2 gap-2 text-xs sm:w-auto sm:text-sm">
					<div class="rounded-full border border-white/10 bg-black px-3 py-1.5 text-slate-300">
						Min: <span class="font-semibold text-white">{formatCurrency(budgetRange[0])}</span>
					</div>
					<div class="rounded-full border border-white/10 bg-black px-3 py-1.5 text-slate-300">
						Max: <span class="font-semibold text-white">{formatCurrency(budgetRange[1])}</span>
					</div>
				</div>
			</div>

			<Slider.Root
				value={budgetRange}
				type="multiple"
				min={0}
				max={priceRangeMax}
				step={100}
				disabled={isLoadingBudgetRange}
				class="py-1"
				onValueChange={(value) => dispatch('budgetRangeChange', value as [number, number])}
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
			<div class="flex flex-col items-start justify-between gap-2 sm:flex-row sm:gap-3">
				<div>
					<span class="text-sm font-semibold text-slate-200">Car age range</span>
				</div>
				<div class="grid w-full grid-cols-2 gap-2 text-xs sm:w-auto sm:text-sm">
					<div class="rounded-full border border-white/10 bg-black px-3 py-1.5 text-slate-300">
						Min: <span class="font-semibold text-white">{ageRange[0]} years</span>
					</div>
					<div class="rounded-full border border-white/10 bg-black px-3 py-1.5 text-slate-300">
						Max: <span class="font-semibold text-white">{ageRange[1]} years</span>
					</div>
				</div>
			</div>

			<Slider.Root
				value={ageRange}
				type="multiple"
				min={0}
				max={ageRangeMax}
				step={1}
				disabled={isLoadingAgeRange}
				class="py-1"
				onValueChange={(value) => dispatch('ageRangeChange', value as [number, number])}
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
					<Popover.Content class="combobox-popover max-w-[calc(100vw-1.5rem)] w-(--bits-popover-anchor-width) border-white/10! bg-neutral-950! p-0 text-white! ring-0!">
						<Command.Root>
							<Command.Input placeholder="Search brand..." class="bg-transparent! text-white! placeholder:text-slate-500! focus-visible:ring-0! focus-visible:outline-none!" />
							<Command.List class="bg-neutral-950">
								<Command.Empty>No brand found.</Command.Empty>
								<Command.Group value="brands">
									<Command.Item value="" class="text-slate-200 data-selected:bg-neutral-900! data-selected:text-white!" onSelect={() => void handleBrandChange('')}>
										<span class={cn('mr-2 text-xs', preferredBrand ? 'text-transparent' : 'text-white')}>✓</span>
										Any brand
									</Command.Item>
									{#each brandOptions as brand (brand.value)}
										<Command.Item value={brand.value} class="text-slate-200 data-selected:bg-neutral-900! data-selected:text-white!" onSelect={() => void handleBrandChange(brand.value)}>
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
					<Popover.Content class="combobox-popover max-w-[calc(100vw-1.5rem)] w-(--bits-popover-anchor-width) border-white/10! bg-neutral-950! p-0 text-white! ring-0!">
						<Command.Root>
							<Command.Input placeholder="Search body type..." class="bg-transparent! text-white! placeholder:text-slate-500! focus-visible:ring-0! focus-visible:outline-none!" />
							<Command.List class="bg-neutral-950">
								<Command.Empty>No body type found.</Command.Empty>
								<Command.Group value="body-types">
									<Command.Item value="" class="text-slate-200 data-selected:bg-neutral-900! data-selected:text-white!" onSelect={() => void handleBodyTypeChange('')}>
										<span class={cn('mr-2 text-xs', bodyType ? 'text-transparent' : 'text-white')}>✓</span>
										<span class="mr-3 inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/10 text-[10px] text-slate-500">-</span>
										Any body type
									</Command.Item>
									{#each bodyTypeOptions as option (option.value)}
										<Command.Item value={option.value} class="text-slate-200 data-selected:bg-neutral-900! data-selected:text-white!" onSelect={() => void handleBodyTypeChange(option.value)}>
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
					<Popover.Content class="combobox-popover max-w-[calc(100vw-1.5rem)] w-(--bits-popover-anchor-width) border-white/10! bg-neutral-950! p-0 text-white! ring-0!">
						<Command.Root>
							<Command.Input placeholder="Search drivetrain..." class="bg-transparent! text-white! placeholder:text-slate-500! focus-visible:ring-0! focus-visible:outline-none!" />
							<Command.List class="bg-neutral-950">
								<Command.Empty>No drivetrain found.</Command.Empty>
								<Command.Group value="drivetrains">
									<Command.Item value="" class="text-slate-200 data-selected:bg-neutral-900! data-selected:text-white!" onSelect={() => void handleDrivetrainChange('')}>
										<span class={cn('mr-2 text-xs', drivetrain ? 'text-transparent' : 'text-white')}>✓</span>
										Any drivetrain
									</Command.Item>
									{#each drivetrainOptions as option (option.value)}
										<Command.Item value={option.value} class="text-slate-200 data-selected:bg-neutral-900! data-selected:text-white!" onSelect={() => void handleDrivetrainChange(option.value)}>
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
					<Popover.Content class="combobox-popover max-w-[calc(100vw-1.5rem)] w-(--bits-popover-anchor-width) border-white/10! bg-neutral-950! p-0 text-white! ring-0!">
						<Command.Root>
							<Command.Input placeholder="Search fuel type..." class="bg-transparent! text-white! placeholder:text-slate-500! focus-visible:ring-0! focus-visible:outline-none!" />
							<Command.List class="bg-neutral-950">
								<Command.Empty>No fuel type found.</Command.Empty>
								<Command.Group value="fuel-types">
									<Command.Item value="" class="text-slate-200 data-selected:bg-neutral-900! data-selected:text-white!" onSelect={() => void handleFuelTypeChange('')}>
										<span class={cn('mr-2 text-xs', fuelType ? 'text-transparent' : 'text-white')}>✓</span>
										Any fuel type
									</Command.Item>
									{#each fuelOptions as option (option.value)}
										<Command.Item value={option.value} class="text-slate-200 data-selected:bg-neutral-900! data-selected:text-white!" onSelect={() => void handleFuelTypeChange(option.value)}>
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
						onclick={() => dispatch('usageTypeChange', option.value)}
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

		<div class="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between sm:pt-5">
			<p class="text-sm text-slate-500">Dataset filter and recommendation system.</p>
			<Button type="submit" size="lg" class="h-11 w-full rounded-full bg-white px-5 text-sm font-semibold text-black hover:bg-slate-200 sm:h-10 sm:w-auto" disabled={isSubmitting}>
				{isSubmitting ? 'Loading...' : 'Get recommendations'}
			</Button>
		</div>
	</form>
</section>

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
</style>
