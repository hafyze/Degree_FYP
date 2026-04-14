import { json } from '@sveltejs/kit';
import { getFuelTypes } from '$lib/server/car-data';

export async function GET() {
	const fuelTypes = await getFuelTypes();
	return json({ fuelTypes });
}
