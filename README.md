# FyzeUsedCar

FyzeUsedCar is a machine learning-powered web application that helps users make better used-car buying decisions. It combines preference-based vehicle recommendations, side-by-side comparison, fuel-use estimation, and depreciation forecasting in a single full-stack experience.

This repository contains the application code for my Final Year Project. The focus of this repo is the product and system implementation. A separate paper will cover the methodology, model training, evaluation, and research discussion in more detail.

## What the project does

- Filters used cars by budget, age, brand, body type, drivetrain, fuel type, and usage profile
- Recommends matching vehicles from the processed dataset
- Compares shortlisted cars across practical ownership metrics
- Forecasts depreciation over a 5-year horizon
- Estimates fuel usage when direct values are unavailable
- Presents the results through an interactive SvelteKit interface backed by a FastAPI service

## Tech stack

- Frontend: SvelteKit, TypeScript, Tailwind CSS
- Backend: FastAPI, Python
- Data and ML: pandas, scikit-learn, XGBoost, joblib
- Visualization: interactive comparison and depreciation charts

## Repository structure

```text
Degree_FYP/
|- Frontend/          # SvelteKit application and UI logic
|- Backend/           # FastAPI service, model loading, datasets
|- paper.tex          # Draft paper for the accompanying FYP write-up
```

## Key features

### 1. Preference-based car recommendations

Users can search for used cars using filters such as:

- budget range
- car age range
- preferred brand
- body type
- drivetrain
- fuel type
- intended usage such as daily commute, road trips, or weekend use

The frontend reads from the processed dataset and ranks results based on the selected filters and usage profile.

### 2. Vehicle comparison

Users can shortlist cars and compare them side by side using metrics such as:

- current price
- engine capacity
- drivetrain
- fuel type
- odometer value
- estimated fuel usage
- projected 1-year, 3-year, and 5-year value loss

### 3. Depreciation forecasting

The backend exposes a depreciation prediction API that:

- loads the trained model from disk
- finds a matching reference vehicle from the dataset
- projects future odometer growth based on usage type
- forecasts future value across a configurable time horizon

### 4. Fuel-use estimation support

When direct fuel consumption values are not available, the app derives an estimate using vehicle attributes so users still receive practical ownership insights.

## How it works

1. The user selects vehicle preferences in the frontend.
2. SvelteKit filters and ranks matching cars from the processed dataset.
3. When a car is selected, the frontend requests a depreciation forecast.
4. FastAPI loads the saved model and returns projected value points.
5. The UI presents recommendation details, forecast charts, and comparison views.

## Getting started

### Prerequisites

- Node.js and npm
- Python 3

### 1. Start the backend

From `Backend/`:

```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API runs on `http://127.0.0.1:8000` by default.

### 2. Start the frontend

From `Frontend/`:

```powershell
npm install
npm run dev
```

The frontend runs on `http://127.0.0.1:5173` by default.

### 3. Optional environment variable

The frontend depreciation route points to the backend using:

- `DEPRECIATION_API_URL`, or
- `BACKEND_API_URL`

If neither is set, it falls back to:

```text
http://127.0.0.1:8000
```

## Available scripts

From `Frontend/`:

```powershell
npm run dev
npm run build
npm run preview
npm run check
npm run test
```

## API overview

### Backend

- `GET /health` - health check
- `POST /predict-depreciation` - returns projected future value points for a selected car

### Frontend server routes

- `/api/recommend`
- `/api/depreciation`
- `/api/brands`
- `/api/body-types`
- `/api/drivetrains`
- `/api/fuel-types`
- `/api/budget-range`
- `/api/age-range`

## Data and model assets

- Raw dataset: `Backend/data/raw/used_cars.csv`
- Processed dataset: `Backend/data/processed/cleaned_cars.csv`
- Saved model: `Backend/notebooks/best_car_price_model.pkl`

## Notes

- This repository showcases the application and deployment-oriented side of the project.
- The research methodology, train/test workflow, evaluation metrics, and paper details will be shared separately.

## Future improvements

- Add a project demo or deployed preview
- Expand documentation for model training and preprocessing
- Improve test coverage for backend forecasting behavior
- Add clearer benchmarking and model evaluation summaries
