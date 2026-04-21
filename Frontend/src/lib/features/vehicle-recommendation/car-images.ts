import type {
	CarImageEntry,
	CarImageView,
	Recommendation
} from '$lib/features/vehicle-recommendation/types';

const imageViews = ['Front', 'Rear', 'Interior'] as const;

function slugify(value: string) {
	return value
		.trim()
		.toLowerCase()
		.replace(/&/g, 'and')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

export function getRecommendationImageKey(car: Pick<Recommendation, 'manufacturer_name' | 'model_name' | 'year_produced'>) {
	return [car.manufacturer_name, car.model_name, car.year_produced].map((value) => slugify(`${value}`)).join('-');
}

function createImageSet(key: string, title: string): CarImageView[] {
	return imageViews.map((label) => ({
		src: `/car-images/${key}/${label.toLowerCase()}.jpg`,
		alt: `${title} ${label.toLowerCase()} view`,
		label
	}));
}

const carImageManifest: Record<string, CarImageEntry> = {
	'bmw-320-2019': {
		key: 'bmw-320-2019',
		images: createImageSet('bmw-320-2019', '2019 BMW 320'),
		attribution: {
			sourceName: 'Local placeholder seed',
			sourceUrl: '/car-images/bmw-320-2019/',
			licenseNote: 'Replace with manually curated free-to-use photos before production.'
		}
	},
	'toyota-camry-2007': {
		key: 'toyota-camry-2007',
		images: createImageSet('toyota-camry-2007', '2007 Toyota Camry'),
		attribution: {
			sourceName: 'Local placeholder seed',
			sourceUrl: '/car-images/toyota-camry-2007/',
			licenseNote: 'Replace with manually curated free-to-use photos before production.'
		}
	},
	'toyota-rav4-2013': {
		key: 'toyota-rav4-2013',
		images: createImageSet('toyota-rav4-2013', '2013 Toyota RAV4'),
		attribution: {
			sourceName: 'Local placeholder seed',
			sourceUrl: '/car-images/toyota-rav4-2013/',
			licenseNote: 'Replace with manually curated free-to-use photos before production.'
		}
	},
	'toyota-land-cruiser-2014': {
		key: 'toyota-land-cruiser-2014',
		images: createImageSet('toyota-land-cruiser-2014', '2014 Toyota Land Cruiser'),
		attribution: {
			sourceName: 'Local placeholder seed',
			sourceUrl: '/car-images/toyota-land-cruiser-2014/',
			licenseNote: 'Replace with manually curated free-to-use photos before production.'
		}
	}
};

export function getRecommendationImages(car: Recommendation): CarImageEntry | null {
	return carImageManifest[getRecommendationImageKey(car)] ?? null;
}
