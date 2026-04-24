export type UsageType = 'daily' | 'road-trips' | 'weekend';

export type Recommendation = {
	manufacturer_name: string;
	model_name: string;
	body_type: string;
	drivetrain?: string;
	price_usd: number;
	year_produced: string;
	odometer_value?: number;
	transmission: string;
	engine_fuel: string;
	engine_capacity?: number;
	engine_type?: string;
	engine_has_gas?: boolean;
	estimated_fuel_usage_l_per_100km?: number;
	fuel_estimate_note?: string;
};

export type CarImageView = {
	src: string;
	alt: string;
	label: 'Front' | 'Rear' | 'Interior';
};

export type CarImageAttribution = {
	sourceName: string;
	sourceUrl: string;
	photographer?: string;
	licenseNote: string;
};

export type CarImageEntry = {
	key: string;
	images: CarImageView[];
	attribution?: CarImageAttribution;
};

export type DepreciationPoint = {
	year: string;
	predicted_price_usd: number;
	car_age?: number;
	odometer_value?: number;
	usage_type?: UsageType;
};

export type DepreciationMetric = 'price' | 'depreciation';

export type DepreciationViewPoint = DepreciationPoint & {
	chart_value: number;
	depreciation_percent: number;
	annual_loss_usd: number;
	value_retention_percent: number;
};

export type RecommendationSort =
	| 'recommended'
	| 'price-asc'
	| 'price-desc'
	| 'year-asc'
	| 'year-desc';

export type UsageOption = {
	value: UsageType;
	label: string;
	description: string;
};

export type RecommendationSortOption = {
	value: RecommendationSort;
	label: string;
};

export type SelectOption = {
	value: string;
	label: string;
	icon?: string;
};

export type TickLabel = {
	label: string;
};
