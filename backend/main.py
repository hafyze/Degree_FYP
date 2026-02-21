import numpy as np
import pandas as pd
import joblib
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

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
    car_age: float
    engine_capacity: float
    odometer_value: float
    total_features: float
    luxury_score: float


# =========================
# Prediction helper
# =========================
def predict_car_price(model, data_dict):
    df_input = pd.DataFrame([data_dict])
    pred_log = model.predict(df_input)
    pred_real = np.expm1(pred_log)
    return float(pred_real[0])


# =========================
# Routes
# =========================
@app.get("/")
def root():
    return {"message": "API running"}


@app.post("/predict")
def predict_price(car: CarInput):
    price = predict_car_price(model, car.dict())
    return {"predicted_price_usd": round(price, 2)}