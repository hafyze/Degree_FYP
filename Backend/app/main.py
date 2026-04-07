from __future__ import annotations

from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.model_service import CarPriceModelService, DepreciationRequest


class DepreciationPayload(BaseModel):
    manufacturer_name: str
    model_name: str
    body_type: str = ""
    year_produced: int = Field(ge=1900, le=2100)
    price_usd: float = Field(gt=0)
    usage_type: Literal["daily", "road-trips", "weekend"]
    horizon_years: int = Field(default=5, ge=1, le=10)


BASE_DIR = Path(__file__).resolve().parents[1]
service = CarPriceModelService(BASE_DIR)

app = FastAPI(title="Car Price Model API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict-depreciation")
def predict_depreciation(payload: DepreciationPayload):
    try:
        return service.predict_depreciation(
            DepreciationRequest(
                manufacturer_name=payload.manufacturer_name,
                model_name=payload.model_name,
                body_type=payload.body_type,
                year_produced=payload.year_produced,
                price_usd=payload.price_usd,
                usage_type=payload.usage_type,
                horizon_years=payload.horizon_years,
            )
        )
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except Exception as error:  # pragma: no cover - defensive API guard
        raise HTTPException(status_code=500, detail=str(error)) from error
