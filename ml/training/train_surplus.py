"""RapidFire-style surplus prediction training.

Uses testing parameters from the vector DB (Pinecone) / CSV to determine
the day with the most surplus food per restaurant. Evaluates with MAE
(Mean Absolute Error) and runs multi-config experiments to find the best
hyperparameters.

Usage:
    cd /path/to/food_app && PYTHONPATH=. python -m ml.training.train_surplus
"""

import csv as csv_module
import json
import logging
import os
from pathlib import Path
from typing import Any

from ml.data.collectors import load_restaurants
from ml.data.preprocessors import build_training_data, get_feature_names
from ml.models.demand_forecaster import (
    get_feature_importance,
    predict_peak_day,
    train_forecaster,
)

logging.basicConfig(level=logging.INFO, format="%(message)s")
log = logging.getLogger(__name__)

# RapidFire-style config grid: test multiple hyperparameter combinations
CONFIG_GRID = [
    {"n_estimators": 50, "max_depth": 3, "learning_rate": 0.1},
    {"n_estimators": 100, "max_depth": 4, "learning_rate": 0.1},
    {"n_estimators": 150, "max_depth": 5, "learning_rate": 0.08},
    {"n_estimators": 100, "max_depth": 4, "learning_rate": 0.05},
    {"n_estimators": 200, "max_depth": 4, "learning_rate": 0.1},
    {"n_estimators": 100, "max_depth": 6, "learning_rate": 0.1},
]


def run_single_config(config: dict[str, Any], config_id: int) -> dict[str, Any]:
    """Train one config and return metrics (MAE)."""
    X, y = build_training_data(seed=42)
    model, metrics = train_forecaster(X, y, **config)
    return {
        "config_id": config_id,
        "config": config,
        "eval_mae": metrics["eval_mae"],
        "train_mae": metrics["train_mae"],
    }


def run_experiment() -> tuple[dict[str, Any], Any]:
    """Run RapidFire-style multi-config experiment.

    Tests all configs, selects best by eval MAE, returns best config and model.
    """
    log.info("Loading data from vector DB / CSV...")
    X, y = build_training_data(seed=42)
    log.info("Training data: %d samples, %d features", len(X), X.shape[1])

    results = []
    for i, config in enumerate(CONFIG_GRID):
        log.info("Config %d/%d: %s", i + 1, len(CONFIG_GRID), config)
        out = run_single_config(config, i)
        results.append(out)
        log.info("  -> eval_mae=%.4f", out["eval_mae"])

    best = min(results, key=lambda r: r["eval_mae"])
    log.info("Best config (lowest MAE): %s", best["config"])
    log.info("Best eval_mae: %.4f", best["eval_mae"])

    # Retrain best config on full data
    model, _ = train_forecaster(X, y, eval_fraction=0.2, **best["config"])
    return best, model


def main() -> None:
    experiment_path = Path(os.getenv("RF_EXPERIMENT_PATH", "./rapidfire_experiments"))
    experiment_path.mkdir(parents=True, exist_ok=True)

    log.info("=== RapidFire-style Surplus Prediction Experiment ===")
    log.info("Using parameters from vector DB (Pinecone) / CSV")
    log.info("Metric: MAE (Mean Absolute Error)")
    log.info("")

    best_result, model = run_experiment()

    # Feature importance: which parameters drive surplus?
    feature_names = get_feature_names()
    importance_df = get_feature_importance(model, feature_names)
    log.info("")
    log.info("Feature importance (what drives surplus prediction):")
    for _, row in importance_df.iterrows():
        log.info("  %s: %.4f", row["feature"], row["importance"])

    # Predict peak day for all restaurants and save
    restaurants = load_restaurants(use_pinecone=False)
    predictions = []
    for r in restaurants:
        if not r.get("id"):
            continue
        peak_day, peak_kg = predict_peak_day(model, r, feature_names)
        predictions.append({
            "id": r["id"],
            "restaurant_name": r.get("restaurant_name", ""),
            "peak_surplus_day": peak_day,
            "peak_surplus_kg": round(peak_kg, 2),
        })

    output_path = experiment_path / "peak_surplus_predictions.json"
    with open(output_path, "w") as f:
        json.dump({
            "best_config": best_result["config"],
            "eval_mae": best_result["eval_mae"],
            "feature_importance": importance_df.to_dict(orient="records"),
            "predictions": predictions,
        }, f, indent=2)
    log.info("")
    log.info("Saved predictions to %s", output_path)

    # Optionally write updated CSV for backend consumption
    csv_path = Path(__file__).resolve().parents[1] / "data" / "santa_barbara_restaurants_with_peak_day.csv"
    if csv_path.exists():
        pred_lookup = {p["id"]: p for p in predictions}
        rows = []
        with open(csv_path, newline="", encoding="utf-8") as f:
            reader = csv_module.DictReader(f)
            fieldnames = reader.fieldnames or []
            for row in reader:
                rid = row.get("id", "")
                if rid in pred_lookup:
                    row["peak_surplus_day"] = pred_lookup[rid]["peak_surplus_day"]
                    row["peak_surplus_kg"] = str(pred_lookup[rid]["peak_surplus_kg"])
                rows.append(row)
        out_csv = experiment_path / "santa_barbara_restaurants_with_peak_day.csv"
        with open(out_csv, "w", newline="", encoding="utf-8") as f:
            writer = csv_module.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)
        log.info("Saved updated CSV to %s", out_csv)


if __name__ == "__main__":
    main()
