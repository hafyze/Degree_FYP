import { json } from '@sveltejs/kit';
import { getAgeBounds } from '$lib/server/car-data';

export async function GET() {
	const range = await getAgeBounds();

	return json({
		min: 0,
		max: range.max
	});
}
