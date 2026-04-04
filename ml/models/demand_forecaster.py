"""Surplus demand forecaster using XGBoost.

Predicts surplus_kg by day of week. Evaluated with MAE (Mean Absolute Error).
Supports feature importance for identifying which parameters drive surplus.
"""

import numpy as np
import pandas as pd
from typing import Any

try:
    import xgboost as xgb
except ImportError:
    xgb = None  # type: ignore


def mean_absolute_error(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Compute MAE: mean(|y_true - y_pred|)."""
    return float(np.mean(np.abs(np.asarray(y_true) - np.asarray(y_pred))))


def train_forecaster(
    X: pd.DataFrame,
    y: pd.Series,
    eval_fraction: float = 0.2,
    **kwargs: Any,
) -> tuple[Any, dict[str, float]]:
    """Train XGBoost regressor for surplus prediction.

    Args:
        X: Feature matrix (closing_hour, rating, lat, lng, day_of_week, is_weekend)
        y: Target surplus_kg
        eval_fraction: Fraction of data for evaluation (MAE)
        **kwargs: XGBRegressor params (n_estimators, max_depth, learning_rate, etc.)

    Returns:
        (model, metrics_dict) with keys: train_mae, eval_mae
    """
    if xgb is None:
        raise ImportError("xgboost is required. Install with: pip install xgboost")

    from sklearn.model_selection import train_test_split

    X_train, X_eval, y_train, y_eval = train_test_split(
        X, y, test_size=eval_fraction, random_state=42
    )

    default_params = {
        "n_estimators": 100,
        "max_depth": 4,
        "learning_rate": 0.1,
        "objective": "reg:squarederror",
        "random_state": 42,
    }
    default_params.update(kwargs)

    model = xgb.XGBRegressor(**default_params)
    model.fit(X_train, y_train)

    train_mae = evaluate_mae(model, X_train, y_train)
    eval_mae = evaluate_mae(model, X_eval, y_eval)

    return model, {"train_mae": train_mae, "eval_mae": eval_mae}


def evaluate_mae(model: Any, X: pd.DataFrame, y: pd.Series) -> float:
    """Evaluate model with MAE on given data."""
    y_pred = model.predict(X)
    return mean_absolute_error(y.values, y_pred)


def get_feature_importance(model: Any, feature_names: list[str]) -> pd.DataFrame:
    """Get feature importance (which features drive surplus prediction)."""
    imp = model.feature_importances_
    return pd.DataFrame({
        "feature": feature_names,
        "importance": imp,
    }).sort_values("importance", ascending=False)


def predict_peak_day(
    model: Any,
    restaurant: dict[str, Any],
    feature_names: list[str],
) -> tuple[str, float]:
    """Predict the day with highest surplus for a restaurant.

    Returns (day_name, predicted_kg).
    """
    from ..data.collectors import DAY_ORDER

    rows = []
    closing_hour = float(restaurant.get("closing_hour", 21.0))
    rating = float(restaurant.get("rating", 0))
    lat = float(restaurant.get("lat", 0))
    lng = float(restaurant.get("lng", 0))

    for day_idx, day_name in enumerate(DAY_ORDER):
        is_weekend = 1 if day_idx >= 5 else 0
        rows.append({
            "closing_hour": closing_hour,
            "rating": rating,
            "lat": lat,
            "lng": lng,
            "day_of_week": day_idx,
            "is_weekend": is_weekend,
        })

    X = pd.DataFrame(rows)[feature_names]
    preds = model.predict(X)
    best_idx = int(np.argmax(preds))
    return DAY_ORDER[best_idx], float(preds[best_idx])
