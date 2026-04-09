import { json } from '@sveltejs/kit';
import { getDrivetrains } from '$lib/server/car-data';

export async function GET() {
	const drivetrains = await getDrivetrains();
	return json({ drivetrains });
}
