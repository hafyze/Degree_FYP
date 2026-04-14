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
	const ageMin = toNumber(payload.ageMin);
	const ageMax = toNumber(payload.ageMax);
	const brand = typeof payload.brand === 'string' ? payload.brand.trim() : '';
	const bodyType = typeof payload.bodyType === 'string' ? payload.bodyType.trim() : '';
	const drivetrain = typeof payload.drivetrain === 'string' ? payload.drivetrain.trim() : '';
	const fuelType = typeof payload.fuelType === 'string' ? payload.fuelType.trim() : '';
	const usageType = typeof payload.usageType === 'string' ? payload.usageType.trim() : '';
	const sortBy = typeof payload.sortBy === 'string' ? payload.sortBy.trim() : '';
	const page = toNumber(payload.page) ?? 1;
	const pageSize = toNumber(payload.pageSize) ?? 6;

	const result = await getRecommendations(
		{
			budgetMin,
			budgetMax,
			ageMin,
			ageMax,
			brand: brand || undefined,
			bodyType: bodyType || undefined,
			drivetrain: drivetrain || undefined,
			fuelType: fuelType || undefined,
			usageType: usageType || undefined,
			sortBy: sortBy || undefined
		},
		{
			page,
			pageSize
		}
	);

	return json({
		usageType,
		sortBy,
		appliedFilters: {
			budgetMin,
			budgetMax,
			ageMin,
			ageMax,
			brand: brand || undefined,
			bodyType: bodyType || undefined,
			drivetrain: drivetrain || undefined,
			fuelType: fuelType || undefined,
			usageType: usageType || undefined,
			sortBy: sortBy || undefined
		},
		count: result.recommendations.length,
		totalCount: result.totalCount,
		page: result.page,
		pageSize: result.pageSize,
		recommendations: result.recommendations
	});
}
