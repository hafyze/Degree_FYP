import cabrioletIcon from '$lib/assets/car-icon/cabriolet.png';
import coupeIcon from '$lib/assets/car-icon/coupe.png';
import hatchbackIcon from '$lib/assets/car-icon/hatchback.png';
import liftbackIcon from '$lib/assets/car-icon/liftback.png';
import limousineIcon from '$lib/assets/car-icon/limousie.png';
import minivanIcon from '$lib/assets/car-icon/minivan.png';
import pickupIcon from '$lib/assets/car-icon/pickup.png';
import sedanIcon from '$lib/assets/car-icon/sedan.png';
import suvIcon from '$lib/assets/car-icon/suv.png';
import vanIcon from '$lib/assets/car-icon/van.png';
import wagonIcon from '$lib/assets/car-icon/wagon.png';
import type {
	RecommendationSortOption,
	UsageOption
} from '$lib/features/vehicle-recommendation/types';

export const usageOptions: UsageOption[] = [
	{
		value: 'daily',
		label: 'Daily commute',
		description: 'For everyday driving.'
	},
	{
		value: 'road-trips',
		label: 'Road trips',
		description: 'Best for long journey.'
	},
	{
		value: 'weekend',
		label: 'Weekend use',
		description: 'Occasional drives and leisure.'
	}
];

export const drivetrainLabels: Record<string, string> = {
	all: 'All-wheel drive (AWD)',
	front: 'Front-wheel drive (FWD)',
	rear: 'Rear-wheel drive (RWD)'
};

export const fuelTypeLabels: Record<string, string> = {
	diesel: 'Diesel',
	gas: 'Gas',
	'hybrid-petrol': 'Hybrid petrol',
	petrol: 'Petrol'
};

export const recommendationSortOptions: RecommendationSortOption[] = [
	{ value: 'recommended', label: 'Recommended' },
	{ value: 'price-asc', label: 'Price: Low to high' },
	{ value: 'price-desc', label: 'Price: High to low' },
	{ value: 'year-desc', label: 'Year: Newest first' },
	{ value: 'year-asc', label: 'Year: Oldest first' }
];

export const fallbackDrivetrains = ['all', 'front', 'rear'];

export const bodyTypeIconMap: Record<string, string> = {
	cabriolet: cabrioletIcon,
	coupe: coupeIcon,
	hatchback: hatchbackIcon,
	liftback: liftbackIcon,
	limousine: limousineIcon,
	minibus: vanIcon,
	minivan: minivanIcon,
	pickup: pickupIcon,
	sedan: sedanIcon,
	suv: suvIcon,
	van: vanIcon,
	wagon: wagonIcon
};

export function formatCurrency(value: number) {
	return `$${Math.round(value).toLocaleString()}`;
}

export function formatPercent(value: number, digits = 0) {
	return `${value.toFixed(digits)}%`;
}

export function formatLoss(value?: number | null) {
	if (typeof value !== 'number' || Number.isNaN(value)) {
		return 'N/A';
	}

	return formatCurrency(value);
}

export function formatOdometer(value?: number) {
	if (typeof value !== 'number' || Number.isNaN(value)) {
		return 'N/A';
	}

	return `${Math.round(value).toLocaleString()} km`;
}

export function formatFuelUsageEstimate(value?: number) {
	if (typeof value !== 'number' || Number.isNaN(value)) {
		return 'N/A';
	}

	return `${value.toFixed(1)} L/100km`;
}

export function getBodyTypeIcon(bodyTypeValue: string) {
	return bodyTypeIconMap[bodyTypeValue.toLowerCase()];
}

export function getFuelBadgeClasses(fuelValue: string) {
	const normalized = fuelValue.toLowerCase();

	if (normalized === 'petrol') {
		return {
			dot: 'bg-emerald-400',
			text: 'text-emerald-200'
		};
	}

	if (normalized === 'diesel') {
		return {
			dot: 'bg-slate-400',
			text: 'text-slate-300'
		};
	}

	return {
		dot: 'bg-slate-600',
		text: 'text-slate-500'
	};
}
