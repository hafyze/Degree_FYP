import { json } from '@sveltejs/kit';
import { getBrands } from '$lib/server/car-data';

export async function GET() {
	const brands = await getBrands();
	return json({ brands });
}
