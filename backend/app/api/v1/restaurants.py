"""GET /restaurants - returns all restaurants (from CSV when Pinecone unavailable)."""

import csv
import logging
import os
from pathlib import Path
from typing import Any

from fastapi import APIRouter

from app.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter()
settings = get_settings()

_CSV_WITH_PEAK = Path(__file__).resolve().parents[4] / "ml" / "data" / "santa_barbara_restaurants_with_peak_day.csv"
_CSV_BASE = Path(__file__).resolve().parents[4] / "ml" / "data" / "santa_barbara_restaurants.csv"


def _load_restaurants_from_csv() -> list[dict[str, Any]]:
    csv_path = _CSV_WITH_PEAK if _CSV_WITH_PEAK.exists() else _CSV_BASE
    if not csv_path.exists():
        return []
    restaurants: list[dict[str, Any]] = []
    with open(csv_path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            try:
                rlat = float(row.get("lat", 0))
                rlng = float(row.get("lng", 0))
            except (ValueError, TypeError):
                continue
            hours_str = row.get("hours_of_operation", "")
            hours_list = [h.strip() for h in hours_str.split("|")] if hours_str else []
            r: dict[str, Any] = {
                "id": row.get("id", ""),
                "name": row.get("restaurant_name", "Unknown"),
                "address": row.get("address", ""),
                "lat": rlat,
                "lng": rlng,
                "rating": float(row.get("rating", 0) or 0),
                "closing_time": row.get("closing_time", "Unknown"),
                "hours_of_operation": hours_list,
            }
            if row.get("peak_surplus_day"):
                r["peak_surplus_day"] = row["peak_surplus_day"]
            if row.get("peak_surplus_kg"):
                try:
                    r["peak_surplus_kg"] = float(row["peak_surplus_kg"])
                except (ValueError, TypeError):
                    pass
            restaurants.append(r)
    return restaurants


@router.get("/restaurants")
async def get_restaurants():
    pinecone_key = settings.PINECONE_API_KEY or os.getenv("PINECONE_API_KEY", "")
    restaurants: list[dict[str, Any]] = []

    if pinecone_key:
        try:
            from pinecone import Pinecone

            pc = Pinecone(api_key=pinecone_key)
            index = pc.Index("food-rescue-menus")

            results = index.query(
                vector=[0.0] * 1536,
                top_k=1000,
                include_metadata=True,
            )

            for match in results.matches:
                md = match.metadata or {}
                restaurants.append({
                    "id": getattr(match, "id", ""),
                    "name": md.get("restaurant_name", ""),
                    "address": md.get("address", ""),
                    "lat": float(md.get("lat", 0)),
                    "lng": float(md.get("lng", 0)),
                    "rating": float(md.get("rating", 0)),
                    "closing_time": md.get("closing_time", "Unknown"),
                    "hours_of_operation": md.get("hours_of_operation", []),
                })
        except Exception as exc:
            logger.warning("Pinecone failed for restaurants, falling back to CSV: %s", exc)

    if not restaurants:
        restaurants = _load_restaurants_from_csv()
    else:
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

    return {"restaurants": restaurants, "total": len(restaurants)}
