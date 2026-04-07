import { json } from '@sveltejs/kit';
import { getRecommendations } from '$lib/server/car-data';

function toNumber(value: unknown) {
	if (typeof value === 'number') {
		return Number.isNaN(value) ? undefined : value;
	}

	if (typeof value !== 'string' || value.trim() === '') {
		return undefined;
	}

	const parsed = Number(value);
	return Number.isNaN(parsed) ? undefined : parsed;
}

export async function POST({ request }) {
	const payload = await request.json();
	const budgetMin = toNumber(payload.budgetMin);
	const budgetMax = toNumber(payload.budgetMax);
	const yearMin = toNumber(payload.yearMin);
	const yearMax = toNumber(payload.yearMax);
	const brand = typeof payload.brand === 'string' ? payload.brand.trim() : '';
	const bodyType = typeof payload.bodyType === 'string' ? payload.bodyType.trim() : '';
	const usageType = typeof payload.usageType === 'string' ? payload.usageType.trim() : '';

	const recommendations = await getRecommendations({
		budgetMin,
		budgetMax,
		yearMin,
		yearMax,
		brand: brand || undefined,
		bodyType: bodyType || undefined,
		usageType: usageType || undefined
	});

	return json({
		usageType,
		appliedFilters: {
			budgetMin,
			budgetMax,
			yearMin,
			yearMax,
			brand: brand || undefined,
			bodyType: bodyType || undefined,
			usageType: usageType || undefined
		},
		count: recommendations.length,
		recommendations
	});
}
