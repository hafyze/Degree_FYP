<script lang="ts">
	import Chart from 'chart.js/auto';
	import { onMount, tick } from 'svelte';

	let depreciationChart: any = null;
	let chartCanvas: HTMLCanvasElement;
	let manufacturers: string[] = [];
	let models: string[] = [];
	let form = {
		manufacturer_name: '',
		car_age: 0,
		engine_capacity: 1.0,
		odometer_value: 0,
		has_warranty: 0,
		is_exchangeable: 0,
		feature_0: 0,
		feature_1: 0,
		feature_2: 0,
		feature_3: 0,
		feature_4: 0,
		feature_5: 0,
		feature_6: 0,
		feature_7: 0,
		feature_8: 0,
		feature_9: 0
	};

	//  Feature labels
	const featureLabels = [
		'Sunroof',
		'Leather Seats',
		'Navigation System',
		'Apple Carplay / Android Auto',
		'Backup Camera',
		'Parking Sensors',
		'360 Camera',
		'Keyless Entry',
		'Adaptive Cruise Control',
		'Cruise Control'
	];

	let predictedPrice: number | null = null;
	let loading = false;
	let error = '';

	function toggleFeature(index: number, checked: boolean) {
		(form as any)[`feature_${index}`] = checked ? 1 : 0;
	}

	function renderChart(data: { ages: number[]; prices: number[] }) {
		if (!chartCanvas) return;

		const currentYear = new Date().getFullYear();
		const currentCarAge = form.car_age;

		//
		const points = data.ages
			.map((age, i) => {
				const yearOffset = age - currentCarAge;
				const year = currentYear + yearOffset;
				return {
					year,
					price: data.prices[i],
					offset: yearOffset
				};
			})
			.filter((p) => p.offset >= 0);

		const labels = points.map((p) => p.year);
		const prices = points.map((p) => p.price);

		if (depreciationChart) {
			depreciationChart.destroy();
		}

		depreciationChart = new Chart(chartCanvas, {
			type: 'line',
			data: {
				labels,
				datasets: [
					{
						label: 'Projected Vehicle Value',
						data: prices,
						borderWidth: 3,
						tension: 0.35,
						fill: {
							target: 'origin',
							above: 'rgba(59, 130, 246, 0.08)'
						},
						pointRadius: 3,
						pointHoverRadius: 5
					},
					{
						label: 'Current Estimated Value',
						data: prices.map((p, i) => (i === 0 ? p : null)),
						pointRadius: 7,
						pointHoverRadius: 9,
						showLine: false
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: {
					mode: 'index',
					intersect: false
				},
				plugins: {
					legend: {
						display: true
					},
					tooltip: {
						callbacks: {
							label: (ctx) => `$${ctx.parsed.y !== null ? ctx.parsed.y.toLocaleString() : '0'}`
						}
					}
				},
				scales: {
					x: {
						title: {
							display: true,
							text: 'Year'
						}
					},
					y: {
						title: {
							display: true,
							text: 'Estimated Price (USD)'
						},
						ticks: {
							callback: (value: any) => '$' + Number(value).toLocaleString()
						}
					}
				}
			}
		});
	}

	// load manufacturers
	onMount(async () => {
		try {
			const res = await fetch('http://127.0.0.1:8000/manufacturers');
			const data = await res.json();
			manufacturers = data.manufacturers;

			// set default
			if (manufacturers.length > 0) {
				form.manufacturer_name = manufacturers[0];
				await loadModels(form.manufacturer_name);
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

			await tick();

			const depRes = await fetch('http://127.0.0.1:8000/depreciation', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(form)
			});

			const depData = await depRes.json();
			renderChart(depData);
		} catch (e) {
			error = 'Prediction failed. Check API.';
			console.error(e);
		} finally {
			loading = false;
		}
	}

	async function loadModels(manufacturer: string) {
		try {
			const res = await fetch(`http://127.0.0.1:8000/models/${manufacturer}`);
			const data = await res.json();
			models = data.models;
		} catch (e) {
			console.error('Failed to load models', e);
			models = [];
		}
	}

	$: if (form.manufacturer_name) {
		loadModels(form.manufacturer_name);
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
					<label for="manufacturer" class="mb-1 block text-sm font-medium text-gray-700">
						Manufacturer
					</label>
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

				<!-- Model -->
				<div>
					<label for="model" class="mb-1 block text-sm font-medium text-gray-700"> Model </label>

					<select
						id="model"
						class="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
					>
						<option value="">Select model</option>
						{#each models as m}
							<option value={m}>{m}</option>
						{/each}
					</select>
				</div>
				<!-- Car Age -->
				<div>
					<label for="age" class="mb-1 block text-sm font-medium text-gray-700">
						Car Age (years)
					</label>
					<input
						id="age"
						type="number"
						class="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
						bind:value={form.car_age}
					/>
				</div>

				<!-- Engine Capacity -->
				<div>
					<label for="engine_capacity" class="mb-1 block text-sm font-medium text-gray-700">
						Engine Capacity (L)
					</label>
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
					<label for="mileage" class="mb-1 block text-sm font-medium text-gray-700">
						Mileage (km)
					</label>
					<input
						id="mileage"
						type="number"
						class="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
						bind:value={form.odometer_value}
					/>
				</div>

				<!-- Features Section -->
				<div>
					<label for="features" class="mb-2 block text-sm font-medium text-gray-700">
						Vehicle Features
					</label>

					<div class="grid grid-cols-2 gap-3 md:grid-cols-3">
						{#each featureLabels as label, i}
							<label
								class="flex cursor-pointer items-center gap-2 rounded-lg border p-3 hover:bg-gray-50"
							>
								<input
									id="features"
									type="checkbox"
									class="h-4 w-4"
									on:change={(e) => toggleFeature(i, e.currentTarget.checked)}
								/>
								<span class="text-sm text-gray-700">{label}</span>
							</label>
						{/each}
					</div>
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

			<!-- Car Depreciation Prediction -->
			{#if predictedPrice !== null}
				<div class="mt-6 rounded-2xl bg-white p-6 shadow">
					<h3 class="mb-4 text-lg font-semibold text-gray-800">Expected Depreciation Curve</h3>

					<!-- fixed height wrapper -->
					<div class="relative h-80 w-full">
						<canvas bind:this={chartCanvas}></canvas>
					</div>
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
