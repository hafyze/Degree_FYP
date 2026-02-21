<script lang="ts">
	import { onMount } from 'svelte';

	let manufacturers: string[] = [];

	let form = {
		manufacturer_name: '',
		car_age: 5,
		engine_capacity: 1.8,
		odometer_value: 80000,
		total_features: 5,
		luxury_score: 2
	};

	let predictedPrice: number | null = null;
	let loading = false;
	let error = '';

	// load manufacturers
	onMount(async () => {
		try {
			const res = await fetch('http://127.0.0.1:8000/manufacturers');
			const data = await res.json();
			manufacturers = data.manufacturers;

			// set default
			if (manufacturers.length > 0) {
				form.manufacturer_name = manufacturers[0];
			}
		} catch (e) {
			console.error('Failed to load manufacturers', e);
		}
	});

	async function predict() {
		loading = true;
		error = '';
		predictedPrice = null;

		try {
			const res = await fetch('http://127.0.0.1:8000/predict', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(form)
			});

			if (!res.ok) throw new Error('API error');

			const data = await res.json();
			predictedPrice = data.predicted_price_usd;
		} catch (e) {
			error = 'Prediction failed. Check API.';
			console.error(e);
		} finally {
			loading = false;
		}
	}
</script>

<div class="min-h-screen bg-gray-50 px-4 py-10">
	<div class="mx-auto max-w-3xl">
		<!-- Header -->
		<div class="mb-8 text-center">
			<h1 class="text-3xl font-bold text-gray-800">Car Price Prediction</h1>
			<p class="mt-2 text-gray-500">Estimate used car market price using AI</p>
		</div>

		<!-- Form Card -->
		<div class="space-y-6 rounded-2xl bg-white p-6 shadow-lg">
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<!-- Manufacturer -->
				<!-- Manufacturer -->
				<div>
					<label for="manufacturer" class="mb-1 block text-sm font-medium text-gray-700"> Manufacturer </label>
					<select
						id="manufacturer"
						class="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
						bind:value={form.manufacturer_name}
					>
						{#each manufacturers as m}
							<option value={m}>{m}</option>
						{/each}
					</select>
				</div>

				<!-- Car Age -->
				<div>
					<label for="age" class="mb-1 block text-sm font-medium text-gray-700"> Car Age (years) </label>
					<input
						id="age"
						type="number"
						class="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
						bind:value={form.car_age}
					/>
				</div>

				<!-- Engine Capacity -->
				<div>
					<label for="engine_capacity" class="mb-1 block text-sm font-medium text-gray-700"> Engine Capacity (L) </label>
					<input
						id="engine_capacity"
						type="number"
						step="0.1"
						class="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
						bind:value={form.engine_capacity}
					/>
				</div>

				<!-- Mileage -->
				<div>
					<label for="mileage" class="mb-1 block text-sm font-medium text-gray-700"> Mileage (km) </label>
					<input
						id="mileage"
						type="number"
						class="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
						bind:value={form.odometer_value}
					/>
				</div>
			</div>

			<!-- Button -->
			<button
				class="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
				on:click={predict}
				disabled={loading}
			>
				{loading ? 'Predicting Price...' : 'Predict Price'}
			</button>

			<!-- Result -->
			{#if predictedPrice !== null}
				<div class="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
					<p class="text-sm text-green-700">Estimated Market Price</p>
					<p class="mt-1 text-2xl font-bold text-green-800">
						${predictedPrice.toLocaleString()}
					</p>
				</div>
			{/if}

			<!-- Error -->
			{#if error}
				<div class="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-red-700">
					{error}
				</div>
			{/if}
		</div>
	</div>
</div>
