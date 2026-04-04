"""Preprocess restaurant data for surplus prediction.

Builds feature matrix from vector DB parameters: closing_hour, rating,
day_of_week, etc. Creates training targets from peak_surplus_day/peak_surplus_kg.
"""

import numpy as np
import pandas as pd
from typing import Any

from .collectors import DAY_ORDER, load_restaurants


def build_training_data(
    restaurants: list[dict[str, Any]] | None = None,
    non_peak_ratio: tuple[float, float] = (0.4, 0.85),
    seed: int = 42,
) -> tuple[pd.DataFrame, pd.Series]:
    """Build regression dataset for surplus prediction.

    Each restaurant is expanded to 7 rows (one per day). Target surplus_kg:
    - Peak day: actual peak_surplus_kg
    - Other days: peak_surplus_kg * random factor in non_peak_ratio

    Features: closing_hour, rating, lat, lng, day_of_week (0-6), is_weekend, etc.
    """
    rng = np.random.default_rng(seed)
    if restaurants is None:
        restaurants = load_restaurants(use_pinecone=False)

    rows = []
    for r in restaurants:
        peak_day = r.get("peak_surplus_day", "")
        peak_kg = r.get("peak_surplus_kg")
        if not peak_kg or peak_kg <= 0:
            continue

        rid = r.get("id", "")
        closing_hour = float(r.get("closing_hour", 21.0))
        rating = float(r.get("rating", 0))
        lat = float(r.get("lat", 0))
        lng = float(r.get("lng", 0))

        for day_idx, day_name in enumerate(DAY_ORDER):
            if day_name == peak_day:
                target = peak_kg
            else:
                ratio = rng.uniform(non_peak_ratio[0], non_peak_ratio[1])
                target = peak_kg * ratio

            is_weekend = 1 if day_idx >= 5 else 0
            rows.append({
                "restaurant_id": rid,
                "restaurant_name": r.get("restaurant_name", ""),
                "closing_hour": closing_hour,
                "rating": rating,
                "lat": lat,
                "lng": lng,
                "day_of_week": day_idx,
                "day_name": day_name,
                "is_weekend": is_weekend,
                "surplus_kg": target,
            })

    df = pd.DataFrame(rows)
    X = df[["closing_hour", "rating", "lat", "lng", "day_of_week", "is_weekend"]]
    y = df["surplus_kg"]
    return X, y


def get_feature_names() -> list[str]:
    """Return feature names for model interpretation."""
    return ["closing_hour", "rating", "lat", "lng", "day_of_week", "is_weekend"]
