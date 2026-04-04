"""Load restaurant data from Pinecone (vector DB) or CSV fallback.

Provides features for surplus prediction: closing_hour, rating, lat, lng, etc.
"""

import csv
import logging
import os
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_ML_ROOT = Path(__file__).resolve().parents[1]
_CSV_WITH_PEAK = _ML_ROOT / "data" / "santa_barbara_restaurants_with_peak_day.csv"
_CSV_BASE = _ML_ROOT / "data" / "santa_barbara_restaurants.csv"

DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def load_from_pinecone() -> list[dict[str, Any]]:
    """Load restaurant metadata from Pinecone vector DB."""
    api_key = os.getenv("PINECONE_API_KEY", "")
    if not api_key:
        return []

    try:
        from pinecone import Pinecone

        pc = Pinecone(api_key=api_key)
        index = pc.Index("food-rescue-menus")
        results = index.query(
            vector=[0.0] * 1536,
            top_k=1000,
            include_metadata=True,
        )

        restaurants = []
        for match in results.matches:
            md = match.metadata or {}
            rid = getattr(match, "id", "")
            r = {
                "id": rid,
                "restaurant_name": md.get("restaurant_name", "Unknown"),
                "address": md.get("address", ""),
                "lat": float(md.get("lat", 0)),
                "lng": float(md.get("lng", 0)),
                "rating": float(md.get("rating", 0)),
                "closing_time": md.get("closing_time", "Unknown"),
                "hours_of_operation": md.get("hours_of_operation", []),
                "closing_hour": _parse_closing_hour(md.get("closing_time")),
            }
            restaurants.append(r)
        return restaurants
    except Exception as exc:
        logger.warning("Pinecone load failed: %s", exc)
        return []


def _parse_closing_hour(closing_time: str | None) -> float:
    """Parse closing_time string to numeric hour (0-24)."""
    if not closing_time or closing_time == "Unknown":
        return 21.0  # default
    try:
        parts = closing_time.split(" ")
        time_part = parts[0] if parts else "9:00"
        modifier = parts[1] if len(parts) >= 2 else "PM"
        h, m = map(int, time_part.split(":"))
        if modifier.upper() == "PM" and h != 12:
            h += 12
        elif modifier.upper() == "AM" and h == 12:
            h = 0
        return h + m / 60.0
    except (ValueError, IndexError):
        return 21.0


def load_from_csv() -> list[dict[str, Any]]:
    """Load restaurant data from CSV (with peak_surplus_day, peak_surplus_kg)."""
    csv_path = _CSV_WITH_PEAK if _CSV_WITH_PEAK.exists() else _CSV_BASE
    if not csv_path.exists():
        return []

    restaurants = []
    with open(csv_path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            try:
                rlat = float(row.get("lat", 0))
                rlng = float(row.get("lng", 0))
            except (ValueError, TypeError):
                continue

            closing_hour = row.get("closing_hour")
            if closing_hour:
                try:
                    ch = float(closing_hour)
                except (ValueError, TypeError):
                    ch = _parse_closing_hour(row.get("closing_time"))
            else:
                ch = _parse_closing_hour(row.get("closing_time"))

            r: dict[str, Any] = {
                "id": row.get("id", ""),
                "restaurant_name": row.get("restaurant_name", "Unknown"),
                "address": row.get("address", ""),
                "lat": rlat,
                "lng": rlng,
                "rating": float(row.get("rating", 0) or 0),
                "closing_time": row.get("closing_time", "Unknown"),
                "hours_of_operation": row.get("hours_of_operation", ""),
                "closing_hour": ch,
                "peak_surplus_day": row.get("peak_surplus_day", ""),
                "peak_surplus_kg": None,
            }
            if row.get("peak_surplus_kg"):
                try:
                    r["peak_surplus_kg"] = float(row["peak_surplus_kg"])
                except (ValueError, TypeError):
                    pass
            restaurants.append(r)
    return restaurants


def load_restaurants(use_pinecone: bool = True) -> list[dict[str, Any]]:
    """Load restaurants from Pinecone (vector DB) or CSV fallback."""
    if use_pinecone:
        restaurants = load_from_pinecone()
        if restaurants:
            peak_lookup: dict[str, dict[str, Any]] = {}
            if _CSV_WITH_PEAK.exists():
                with open(_CSV_WITH_PEAK, newline="", encoding="utf-8") as f:
                    for row in csv.DictReader(f):
                        rid = row.get("id", "").strip()
                        if rid:
                            peak_lookup[rid] = {
                                "peak_surplus_day": row.get("peak_surplus_day", ""),
                                "peak_surplus_kg": row.get("peak_surplus_kg", ""),
                            }
            for r in restaurants:
                peak = peak_lookup.get(r.get("id", ""), {})
                if peak.get("peak_surplus_day"):
                    r["peak_surplus_day"] = peak["peak_surplus_day"]
                if peak.get("peak_surplus_kg"):
                    try:
                        r["peak_surplus_kg"] = float(peak["peak_surplus_kg"])
                    except (ValueError, TypeError):
                        pass
            return restaurants

    return load_from_csv()
