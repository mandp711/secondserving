# Surplus Prediction Training (RapidFire-style)

Uses **testing parameters from the vector DB (Pinecone)** and CSV to determine the **day with the most surplus food** per restaurant. Evaluates with **MAE (Mean Absolute Error)** and runs multi-config experiments.

## How It Works

1. **Data**: Loads restaurant metadata from Pinecone (lat, lng, rating, closing_hour, etc.) or CSV fallback
2. **Features**: `closing_hour`, `rating`, `lat`, `lng`, `day_of_week`, `is_weekend`
3. **Target**: Surplus kg per restaurant per day (from `peak_surplus_day` / `peak_surplus_kg`)
4. **Model**: XGBoost regressor
5. **Evaluation**: MAE (Mean Absolute Error) on held-out data
6. **RapidFire-style**: Tests 6 configs (n_estimators, max_depth, learning_rate), picks best by MAE
7. **Feature importance**: Shows which parameters drive surplus prediction

## Setup

```bash
pip install -r ml/requirements.txt
```

## Run

```bash
cd /path/to/food_app
PYTHONPATH=. python -m ml.training.train_surplus
```

Output: `./rapidfire_experiments/peak_surplus_predictions.json` and updated CSV.

## Environment

- `RF_EXPERIMENT_PATH`: Where to save artifacts (default: `./rapidfire_experiments`)
- `PINECONE_API_KEY`: Optional; use vector DB for restaurant data when set
