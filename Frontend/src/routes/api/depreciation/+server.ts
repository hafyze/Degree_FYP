import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';

const DEFAULT_BACKEND_URL = 'http://127.0.0.1:8000';

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

export async function POST({ request, fetch }) {
	const payload = await request.json();
	const backendUrl = env.DEPRECIATION_API_URL || env.BACKEND_API_URL || DEFAULT_BACKEND_URL;

	const manufacturerName =
		typeof payload.manufacturer_name === 'string' ? payload.manufacturer_name.trim() : '';
	const modelName = typeof payload.model_name === 'string' ? payload.model_name.trim() : '';
	const bodyType = typeof payload.body_type === 'string' ? payload.body_type.trim() : '';
	const usageType = typeof payload.usage_type === 'string' ? payload.usage_type.trim() : '';
	const yearProduced = toNumber(payload.year_produced);
	const priceUsd = toNumber(payload.price_usd);
	const horizonYears = toNumber(payload.horizon_years) ?? 5;

	if (!manufacturerName || !modelName || !usageType || !yearProduced || !priceUsd) {
		return json({ message: 'Missing fields for depreciation prediction.' }, { status: 400 });
	}

	try {
		const response = await fetch(`${backendUrl}/predict-depreciation`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json'
			},
			body: JSON.stringify({
				manufacturer_name: manufacturerName,
				model_name: modelName,
				body_type: bodyType,
				year_produced: yearProduced,
				price_usd: priceUsd,
				usage_type: usageType,
				horizon_years: horizonYears
			})
		});

		const data = await response.json();

		if (!response.ok) {
			return json(
				{
					message:
						typeof data?.detail === 'string' ? data.detail : 'Unable to predict depreciation.'
				},
				{ status: response.status }
			);
		}

		return json(data);
	} catch (error) {
		return json(
			{
				message:
					error instanceof Error
						? error.message
						: 'Unable to reach depreciation prediction service.'
			},
			{ status: 502 }
		);
	}
}
