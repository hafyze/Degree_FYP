from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Literal

import joblib
import numpy as np
import pandas as pd

UsageType = Literal["daily", "road-trips", "weekend"]

PRICE_CATEGORY_MAP = {
    "Budget": 0,
    "Economy": 1,
    "Mid-Range": 2,
    "Premium": 3,
    "Luxury": 4,
}


@dataclass
class DepreciationRequest:
    manufacturer_name: str
    model_name: str
    body_type: str
    year_produced: int
    price_usd: float
    usage_type: UsageType
    horizon_years: int = 5


class CarPriceModelService:
    def __init__(self, base_dir: Path) -> None:
        self.base_dir = base_dir
        self.data_path = base_dir / "data" / "processed" / "cleaned_cars.csv"
        self.model_path = base_dir / "notebooks" / "best_car_price_model.pkl"
        self._dataset: pd.DataFrame | None = None
        self._model = None
        self._current_year: int | None = None
        self._feature_columns = [f"feature_{index}" for index in range(10)]

    @property
    def dataset(self) -> pd.DataFrame:
        if self._dataset is None:
            dataset = pd.read_csv(self.data_path)
            dataset["model_name_grouped"] = self._build_grouped_models(dataset)
            self._dataset = dataset
            self._current_year = int(dataset["year_produced"].max())
        return self._dataset

    @property
    def model(self):
        if self._model is None:
            self._model = joblib.load(self.model_path)
        return self._model

    @property
    def current_year(self) -> int:
        if self._current_year is None:
            _ = self.dataset
        return int(self._current_year)

    def _build_grouped_models(self, dataset: pd.DataFrame) -> pd.Series:
        model_counts = dataset["model_name"].value_counts()
        rare_models = model_counts[model_counts < 30].index
        return dataset["model_name"].replace(rare_models, "OTHER")

    def _find_reference_row(self, request: DepreciationRequest) -> pd.Series:
        dataset = self.dataset
        matches = dataset[
            (dataset["manufacturer_name"].astype(str).str.lower() == request.manufacturer_name.lower())
            & (dataset["model_name"].astype(str).str.lower() == request.model_name.lower())
            & (dataset["year_produced"].astype(int) == request.year_produced)
        ].copy()

        if request.body_type:
            body_matches = matches[
                matches["body_type"].astype(str).str.lower() == request.body_type.lower()
            ]
            if not body_matches.empty:
                matches = body_matches

        if matches.empty:
            raise ValueError("No matching car record found in dataset for depreciation prediction.")

        matches["price_distance"] = (matches["price_usd"].astype(float) - request.price_usd).abs()
        return matches.sort_values("price_distance").iloc[0]

    def _projected_odometer(self, base_odometer: float, usage_type: UsageType, year_offset: int) -> float:
        yearly_mileage = {
            "daily": 18_000,
            "road-trips": 24_000,
            "weekend": 8_000,
        }[usage_type]
        return max(0.0, base_odometer + yearly_mileage * year_offset)

    def _price_category_from_value(self, value: float) -> str:
        if value < 10_000:
            return "Budget"
        if value < 20_000:
            return "Economy"
        if value < 35_000:
            return "Mid-Range"
        if value < 80_000:
            return "Premium"
        return "Luxury"

    def _luxury_score(
        self,
        total_features: int,
        engine_capacity: float,
        predicted_price: float,
        car_age: int,
    ) -> int:
        return int(
            total_features
            + int(engine_capacity > 2.5)
            + PRICE_CATEGORY_MAP[self._price_category_from_value(predicted_price)]
            + int(car_age < 10)
        )

    def _prediction_frame(
        self,
        reference_row: pd.Series,
        request: DepreciationRequest,
    ) -> pd.DataFrame:
        total_features = int(
            reference_row[self._feature_columns + ["engine_has_gas", "has_warranty", "is_exchangeable"]]
            .fillna(False)
            .astype(int)
            .sum()
        )
        engine_capacity = float(reference_row.get("engine_capacity", 0.0) or 0.0)
        model_name_grouped = str(reference_row.get("model_name_grouped", "OTHER") or "OTHER")
        current_calendar_year = pd.Timestamp.now().year
        base_age_now = max(0, current_calendar_year - int(request.year_produced))
        base_odometer = float(reference_row.get("odometer_value", 0.0) or 0.0)

        rows: list[dict[str, object]] = []
        previous_predicted_price = float(request.price_usd)
        for year_offset in range(request.horizon_years + 1):
            calendar_year = current_calendar_year + year_offset
            car_age = base_age_now + year_offset
            odometer_value = self._projected_odometer(base_odometer, request.usage_type, year_offset)
            luxury_score = self._luxury_score(
                total_features=total_features,
                engine_capacity=engine_capacity,
                predicted_price=previous_predicted_price,
                car_age=car_age,
            )

            row = {
                "manufacturer_name": request.manufacturer_name,
                "model_name_grouped": model_name_grouped,
                "car_age": car_age,
                "engine_capacity": engine_capacity,
                "odometer_value": odometer_value,
                "total_features": total_features,
                "luxury_score": luxury_score,
            }
            predicted_log_price = float(self.model.predict(pd.DataFrame([row]))[0])
            predicted_price = float(np.expm1(predicted_log_price))
            predicted_price = max(100.0, round(predicted_price, 2))
            previous_predicted_price = predicted_price

            rows.append(
                {
                    "year": calendar_year,
                    "predicted_price_usd": predicted_price,
                    "car_age": car_age,
                    "odometer_value": round(odometer_value),
                    "usage_type": request.usage_type,
                }
            )

        return pd.DataFrame(rows)

    def predict_depreciation(self, request: DepreciationRequest) -> dict[str, object]:
        reference_row = self._find_reference_row(request)
        prediction_frame = self._prediction_frame(reference_row, request)

        return {
            "reference": {
                "manufacturer_name": request.manufacturer_name,
                "model_name": request.model_name,
                "body_type": request.body_type,
                "year_produced": request.year_produced,
                "price_usd": request.price_usd,
                "usage_type": request.usage_type,
            },
            "points": prediction_frame.to_dict(orient="records"),
        }
