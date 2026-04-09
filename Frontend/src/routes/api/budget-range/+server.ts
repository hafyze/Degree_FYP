import { json } from '@sveltejs/kit';
import { getPriceBounds } from '$lib/server/car-data';

export async function GET() {
	const bounds = await getPriceBounds();

	return json({
		min: 0,
		datasetMin: bounds.min,
		max: bounds.max
	});
}
