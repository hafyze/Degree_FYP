import assert from 'node:assert/strict';

import {
	buildFuelEstimate,
	estimateFuelUsageLPer100Km
} from './fuel-estimation.js';

/**
 * @param {string} name
 * @param {() => void} callback
 */
function runTest(name, callback) {
	try {
		callback();
		console.log(`PASS ${name}`);
	} catch (error) {
		console.error(`FAIL ${name}`);
		throw error;
	}
}

runTest('estimates a small petrol hatchback with low consumption', () => {
	const estimate = estimateFuelUsageLPer100Km({
		engine_fuel: 'petrol',
		engine_capacity: 1.2,
		body_type: 'hatchback',
		drivetrain: 'front',
		transmission: 'manual',
		engine_type: 'gasoline',
		engine_has_gas: false
	});

	assert.equal(estimate, 6.7);
});

runTest('estimates a medium diesel sedan automatic below comparable petrol cars', () => {
	const estimate = estimateFuelUsageLPer100Km({
		engine_fuel: 'diesel',
		engine_capacity: 2,
		body_type: 'sedan',
		drivetrain: 'front',
		transmission: 'automatic',
		engine_type: 'diesel',
		engine_has_gas: false
	});

	assert.equal(estimate, 6.7);
});

runTest('estimates a large petrol SUV AWD automatic with clearly higher usage', () => {
	const estimate = estimateFuelUsageLPer100Km({
		engine_fuel: 'petrol',
		engine_capacity: 3.2,
		body_type: 'suv',
		drivetrain: 'all',
		transmission: 'automatic',
		engine_type: 'gasoline',
		engine_has_gas: false
	});

	assert.equal(estimate, 11.9);
});

runTest('estimates a hybrid-petrol compact car efficiently and within bounds', () => {
	const estimate = estimateFuelUsageLPer100Km({
		engine_fuel: 'hybrid-petrol',
		engine_capacity: 1.8,
		body_type: 'hatchback',
		drivetrain: 'front',
		transmission: 'automatic',
		engine_type: 'gasoline',
		engine_has_gas: false
	});

	assert.equal(estimate, 5.7);
});

runTest('falls back safely when engine capacity and drivetrain are missing', () => {
	const estimate = estimateFuelUsageLPer100Km({
		engine_fuel: 'petrol',
		body_type: 'sedan',
		transmission: 'manual'
	});

	assert.equal(estimate, 7.8);
});

runTest('returns rounded values and enforces upper bounds', () => {
	const estimate = estimateFuelUsageLPer100Km({
		engine_fuel: 'diesel',
		engine_capacity: 7.5,
		body_type: 'pickup',
		drivetrain: 'all',
		transmission: 'automatic',
		engine_type: 'diesel',
		engine_has_gas: true
	});

	assert.equal(estimate, 11);
	assert.equal(Number.isInteger(estimate * 10), true);
});

runTest('buildFuelEstimate adds the display note and numeric estimate', () => {
	const estimate = buildFuelEstimate({
		engine_fuel: 'gas',
		engine_capacity: 2.4,
		body_type: 'wagon',
		drivetrain: 'rear',
		transmission: 'automatic',
		engine_type: 'gasoline',
		engine_has_gas: true
	});

	assert.equal(estimate.estimated_fuel_usage_l_per_100km, 9.8);
	assert.equal(estimate.fuel_estimate_note, 'Estimated from engine and vehicle attributes.');
});
