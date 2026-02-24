import numpy as np
import pandas as pd
import joblib
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path

# =========================
# Load model
# =========================
model = joblib.load("best_car_price_model.pkl")

app = FastAPI(title="Car Price Prediction API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# Request schema
# =========================
class CarInput(BaseModel):
    manufacturer_name: str
    model_name_grouped: str
    car_age: float
    engine_capacity: float
    odometer_value: float

    has_warranty: int
    is_exchangeable: int

    feature_0: int
    feature_1: int
    feature_2: int
    feature_3: int
    feature_4: int
    feature_5: int
    feature_6: int
    feature_7: int
    feature_8: int
    feature_9: int


# =========================
# Prediction helper
# =========================
def prepare_features(data: dict):
    """Compute engineered features"""

    feature_cols = [f"feature_{i}" for i in range(10)]

    total_features = sum(data[f] for f in feature_cols)

    # price category mapping (same as training!)
    price_map = {
        'Budget': 0,
        'Economy': 1,
        'Mid-Range': 2,
        'Premium': 3,
        'Luxury': 4
    }

    # approximate luxury score (same logic as training)
    luxury_score = (
        total_features
        + int(data["engine_capacity"] > 2.5)
        + int(data["car_age"] < 10)
    )

    return total_features, luxury_score

def generate_depreciation_curve(data: dict, max_age: int = 15):
    """Generate predicted price vs age curve"""

    total_features, luxury_score = prepare_features(data)

    prices = []
    ages = list(range(0, max_age + 1))

    for age in ages:
        model_input = {
            "manufacturer_name": data["manufacturer_name"],
            "model_name_grouped": data["model_name_grouped"],
            "car_age": age,
            "engine_capacity": data["engine_capacity"],
            "odometer_value": data["odometer_value"],
            "total_features": total_features,
            "luxury_score": luxury_score,
        }

        df_input = pd.DataFrame([model_input])
        pred_log = model.predict(df_input)
        pred_real = np.expm1(pred_log)

        prices.append(round(float(pred_real[0]), 2))

    return {"ages": ages, "prices": prices}

@app.post("/depreciation")
def get_depreciation(car: CarInput):
    data = car.dict()

    # auto derive gas if you added earlier
    data["engine_has_gas"] = int(data["engine_capacity"] > 0)

    curve = generate_depreciation_curve(data)

    return curve

# =========================
# Routes
# =========================
@app.get("/")
def root():
    return {"message": "API running"}


@app.post("/predict")
def predict_price(car: CarInput):
    data = car.model_dump()
    print("Data: ", data)
    #  compute engineered features
    total_features, luxury_score = prepare_features(data)

    model_input = {
        "manufacturer_name": data["manufacturer_name"],
        "model_name_grouped": data["model_name_grouped"],
        "car_age": data["car_age"],
        "engine_capacity": data["engine_capacity"],
        "odometer_value": data["odometer_value"],
        "total_features": total_features,
        "luxury_score": luxury_score,
    }

    df_input = pd.DataFrame([model_input])

    pred_log = model.predict(df_input)
    pred_real = np.expm1(pred_log)

    return {"predicted_price_usd": round(float(pred_real[0]), 2)}

# =========================
# Load dataset (dropdown)
# =========================
BASE_DIR = Path(__file__).resolve().parent
data_path = BASE_DIR.parent / "data" / "processed" / "cleaned_cars.csv"

df_ref = pd.read_csv(data_path)
manufacturers = sorted(df_ref["manufacturer_name"].dropna().unique())

@app.get("/manufacturers")
def get_manufacturers():
    return {"manufacturers": manufacturers}

# =========================
# Build manufacturer → models map
# =========================
model_map = (
    df_ref.groupby("manufacturer_name")["model_name"]
    .apply(lambda x: sorted(x.dropna().unique()))
    .to_dict()
)

@app.get("/models/{manufacturer}")
def get_models(manufacturer: str):
    models = model_map.get(manufacturer, [])
    return {"models": models}