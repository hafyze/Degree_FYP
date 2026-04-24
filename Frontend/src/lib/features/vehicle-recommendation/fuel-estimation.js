/**
 * @typedef {object} FuelEstimateInput
 * @property {string | undefined} [engine_fuel]
 * @property {number | undefined} [engine_capacity]
 * @property {string | undefined} [body_type]
 * @property {string | undefined} [drivetrain]
 * @property {string | undefined} [transmission]
 * @property {string | undefined} [engine_type]
 * @property {boolean | undefined} [engine_has_gas]
 */

/** @type {Record<string, number>} */
const FUEL_BASE_USAGE = {
	petrol: 7.4,
	diesel: 6.2,
	'hybrid-petrol': 5.1,
	gas: 7.8
};

/** @type {Record<string, number>} */
const BODY_TYPE_ADJUSTMENTS = {
	sedan: 0.2,
	hatchback: 0,
	liftback: 0.1,
	wagon: 0.4,
	universal: 0.4,
	suv: 1.1,
	minivan: 1.2,
	minibus: 1.4,
	van: 1.3,
	pickup: 1.5,
	coupe: 0.3,
	cabriolet: 0.4
};

/** @type {Record<string, number>} */
const DRIVETRAIN_ADJUSTMENTS = {
	front: 0,
	rear: 0.2,
	all: 0.6
};

/** @type {Record<string, number>} */
const TRANSMISSION_ADJUSTMENTS = {
	manual: 0,
	automatic: 0.3
};

/** @type {Record<string, [number, number]>} */
const FUEL_USAGE_BOUNDS = {
	petrol: [5.5, 15.5],
	diesel: [4.5, 13.5],
	'hybrid-petrol': [3.5, 9.5],
	gas: [6, 16]
};

/**
 * @param {number | undefined} engineCapacity
 */
function getEngineCapacityAdjustment(engineCapacity) {
	if (typeof engineCapacity !== 'number' || Number.isNaN(engineCapacity) || engineCapacity <= 0) {
		return 0;
	}

	if (engineCapacity < 1.3) return -0.8;
	if (engineCapacity < 1.7) return -0.3;
	if (engineCapacity < 2.1) return 0.2;
	if (engineCapacity < 2.6) return 0.8;
	if (engineCapacity < 3.1) return 1.5;
	return 2.4;
}

/**
 * @param {string | undefined} value
 */
function normalize(value) {
	return value?.trim().toLowerCase() ?? '';
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}

/**
 * @param {FuelEstimateInput} car
 */
export function estimateFuelUsageLPer100Km(car) {
	const fuelType = normalize(car.engine_fuel);
	const engineType = normalize(car.engine_type);
	const bodyType = normalize(car.body_type);
	const drivetrain = normalize(car.drivetrain);
	const transmission = normalize(car.transmission);

	let estimate = FUEL_BASE_USAGE[fuelType] ?? 7.2;
	estimate += getEngineCapacityAdjustment(car.engine_capacity);
	estimate += BODY_TYPE_ADJUSTMENTS[bodyType] ?? 0.2;
	estimate += DRIVETRAIN_ADJUSTMENTS[drivetrain] ?? 0.2;
	estimate += TRANSMISSION_ADJUSTMENTS[transmission] ?? 0.1;

	if (engineType === 'diesel') {
		estimate -= 0.2;
	}

	if (engineType === 'gasoline') {
		estimate += 0.1;
	}

	if (car.engine_has_gas === true && fuelType !== 'hybrid-petrol') {
		estimate += 0.2;
	}

	const [minBound, maxBound] = FUEL_USAGE_BOUNDS[fuelType] ?? [4.5, 16];
	return Math.round(clamp(estimate, minBound, maxBound) * 10) / 10;
}

/**
 * @param {FuelEstimateInput} car
 */
export function buildFuelEstimate(car) {
	return {
		estimated_fuel_usage_l_per_100km: estimateFuelUsageLPer100Km(car),
		fuel_estimate_note: 'Estimated from engine and vehicle attributes.'
	};
}
