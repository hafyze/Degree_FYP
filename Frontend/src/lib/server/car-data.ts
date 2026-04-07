import { readFile } from 'node:fs/promises';
import path from 'node:path';

export type CarRecord = {
	manufacturer_name: string;
	model_name: string;
	body_type: string;
	price_usd: number;
	year_produced: string;
	odometer_value: number;
	transmission: string;
	engine_fuel: string;
};

type UsageType = 'daily' | 'road-trips' | 'weekend';

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
		const odometerValue = Number(columns[headerIndex.odometer_value]);

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
				odometer_value: Number.isNaN(odometerValue) ? 0 : odometerValue,
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
	yearMin?: number;
	yearMax?: number;
	brand?: string;
	bodyType?: string;
	usageType?: string;
}) {
	const cars = await loadCars();

	function getUsageScore(car: CarRecord) {
		const usageType = filters.usageType as UsageType | undefined;
		if (!usageType) return 0;

		const bodyType = car.body_type.toLowerCase();
		const fuel = car.engine_fuel.toLowerCase();
		const transmission = car.transmission.toLowerCase();
		const year = Number(car.year_produced);
		const yearScore = Number.isNaN(year) ? 0 : year;
		const mileage = car.odometer_value;

		if (usageType === 'daily') {
			let score = 0;
			if (['sedan', 'hatchback', 'liftback', 'universal'].includes(bodyType)) score += 40;
			if (['suv', 'pickup', 'minivan', 'van'].includes(bodyType)) score -= 10;
			if (fuel === 'diesel' || fuel === 'petrol') score += 8;
			if (transmission === 'automatic') score += 8;
			score += Math.max(0, Math.min(25, yearScore - 2000));
			score += Math.max(0, 30 - mileage / 10000);
			return score;
		}

		if (usageType === 'road-trips') {
			let score = 0;
			if (['suv', 'universal', 'minivan'].includes(bodyType)) score += 40;
			if (['sedan', 'liftback'].includes(bodyType)) score += 20;
			if (['cabriolet', 'coupe'].includes(bodyType)) score -= 8;
			if (transmission === 'automatic') score += 10;
			score += Math.max(0, Math.min(25, yearScore - 2005));
			score += Math.max(0, 25 - mileage / 15000);
			return score;
		}

		let score = 0;
		if (['coupe', 'cabriolet', 'sedan'].includes(bodyType)) score += 35;
		if (['roadster', 'liftback'].includes(bodyType)) score += 20;
		if (['minivan', 'van'].includes(bodyType)) score -= 12;
		score += Math.max(0, Math.min(20, yearScore - 1998));
		score += Math.max(0, 18 - mileage / 20000);
		score += Math.min(20, car.price_usd / 2500);
		return score;
	}

	const filteredCars = cars
		.filter((car) => (filters.brand ? car.manufacturer_name.toLowerCase() === filters.brand.toLowerCase() : true))
		.filter((car) => (filters.bodyType ? car.body_type.toLowerCase() === filters.bodyType.toLowerCase() : true))
		.filter((car) => (typeof filters.budgetMin === 'number' ? car.price_usd >= filters.budgetMin : true))
		.filter((car) => (typeof filters.budgetMax === 'number' ? car.price_usd <= filters.budgetMax : true))
		.filter((car) => {
			if (typeof filters.yearMin !== 'number') return true;
			const year = Number(car.year_produced);
			return !Number.isNaN(year) && year >= filters.yearMin;
		})
		.filter((car) => {
			if (typeof filters.yearMax !== 'number') return true;
			const year = Number(car.year_produced);
			return !Number.isNaN(year) && year <= filters.yearMax;
		})
		.sort((left, right) => {
			const scoreDifference = getUsageScore(right) - getUsageScore(left);
			if (scoreDifference !== 0) {
				return scoreDifference;
			}

			const leftYear = Number(left.year_produced);
			const rightYear = Number(right.year_produced);
			if (!Number.isNaN(leftYear) && !Number.isNaN(rightYear) && rightYear !== leftYear) {
				return rightYear - leftYear;
			}

			return left.price_usd - right.price_usd;
		})
		.slice(0, 12);

	return filteredCars;
}
