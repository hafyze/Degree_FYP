import { json } from '@sveltejs/kit';
import { getBodyTypesByBrand } from '$lib/server/car-data';

export async function GET({ url }) {
	const brand = url.searchParams.get('brand')?.trim() || undefined;
	const bodyTypes = await getBodyTypesByBrand(brand);

	return json({ bodyTypes });
}
