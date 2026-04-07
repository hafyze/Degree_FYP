import { readFile } from 'node:fs/promises';
import path from 'node:path';

export type CarRecord = {
	manufacturer_name: string;
	model_name: string;
	body_type: string;
	price_usd: number;
	year_produced: string;
	transmission: string;
	engine_fuel: string;
};

let cachedCars: CarRecord[] | null = null;

function parseCsvLine(line: string) {
	const values: string[] = [];
	let current = '';
	let inQuotes = false;

	for (let index = 0; index < line.length; index += 1) {
		const char = line[index];
		const next = line[index + 1];

		if (char === '"') {
			if (inQuotes && next === '"') {
				current += '"';
				index += 1;
			} else {
				inQuotes = !inQuotes;
			}
			continue;
		}

		if (char === ',' && !inQuotes) {
			values.push(current);
			current = '';
			continue;
		}

		current += char;
	}

	values.push(current);
	return values;
}

async function loadCars() {
	if (cachedCars) {
		return cachedCars;
	}

	const csvPath = path.resolve(process.cwd(), '..', 'Backend', 'data', 'processed', 'cleaned_cars.csv');
	const file = await readFile(csvPath, 'utf8');
	const lines = file.split(/\r?\n/).filter(Boolean);

	if (lines.length === 0) {
		cachedCars = [];
		return cachedCars;
	}

	const headers = parseCsvLine(lines[0]);
	const headerIndex = Object.fromEntries(headers.map((header, index) => [header, index]));

	cachedCars = lines.slice(1).flatMap((line) => {
		const columns = parseCsvLine(line);
		const manufacturer = columns[headerIndex.manufacturer_name]?.trim();
		const bodyType = columns[headerIndex.body_type]?.trim();
		const modelName = columns[headerIndex.model_name]?.trim();
		const priceValue = Number(columns[headerIndex.price_usd]);

		if (!manufacturer || !bodyType || !modelName || Number.isNaN(priceValue)) {
			return [];
		}

		return [
			{
				manufacturer_name: manufacturer,
				model_name: modelName,
				body_type: bodyType,
				price_usd: priceValue,
				year_produced: columns[headerIndex.year_produced]?.trim() ?? '',
				transmission: columns[headerIndex.transmission]?.trim() ?? '',
				engine_fuel: columns[headerIndex.engine_fuel]?.trim() ?? ''
			}
		];
	});

	return cachedCars;
}

function sortText(values: Iterable<string>) {
	return Array.from(values).sort((left, right) => left.localeCompare(right));
}

export async function getBrands() {
	const cars = await loadCars();
	return sortText(new Set(cars.map((car) => car.manufacturer_name)));
}

export async function getBodyTypesByBrand(brand?: string) {
	const cars = await loadCars();
	const filteredCars = brand
		? cars.filter((car) => car.manufacturer_name.toLowerCase() === brand.toLowerCase())
		: cars;

	return sortText(new Set(filteredCars.map((car) => car.body_type)));
}

export async function getRecommendations(filters: {
	budgetMin?: number;
	budgetMax?: number;
	brand?: string;
	bodyType?: string;
}) {
	const cars = await loadCars();

	const filteredCars = cars
		.filter((car) => (filters.brand ? car.manufacturer_name.toLowerCase() === filters.brand.toLowerCase() : true))
		.filter((car) => (filters.bodyType ? car.body_type.toLowerCase() === filters.bodyType.toLowerCase() : true))
		.filter((car) => (typeof filters.budgetMin === 'number' ? car.price_usd >= filters.budgetMin : true))
		.filter((car) => (typeof filters.budgetMax === 'number' ? car.price_usd <= filters.budgetMax : true))
		.sort((left, right) => left.price_usd - right.price_usd)
		.slice(0, 12);

	return filteredCars;
}
