"""Search for restaurants near the user's location.

Tries Pinecone + OpenRouter first. Falls back to the local CSV
(ml/data/santa_barbara_restaurants_with_peak_day.csv) when API keys
are missing or the external call fails.
"""

import csv
import logging
import os
from math import radians, cos, sin, asin, sqrt
from pathlib import Path
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter()
settings = get_settings()

GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"
INDEX_NAME = "food-rescue-menus"

_CSV_WITH_PEAK = Path(__file__).resolve().parents[4] / "ml" / "data" / "santa_barbara_restaurants_with_peak_day.csv"
_CSV_BASE = Path(__file__).resolve().parents[4] / "ml" / "data" / "santa_barbara_restaurants.csv"


class SearchRequest(BaseModel):
    address: str | None = None
    lat: float | None = None
    lng: float | None = None
    query: str = "restaurant"
    radius_miles: float = 5.0


def _geocode(address: str) -> tuple[float, float, str]:
    params = {"address": address, "key": settings.GOOGLE_MAPS_API_KEY}
    with httpx.Client(timeout=15) as client:
        resp = client.get(GEOCODE_URL, params=params)
        resp.raise_for_status()
        data = resp.json()
    if data.get("status") != "OK" or not data.get("results"):
        raise HTTPException(400, f"Could not geocode: {address}")
    result = data["results"][0]
    loc = result["geometry"]["location"]
    return loc["lat"], loc["lng"], result.get("formatted_address", address)


def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    lat1, lng1, lat2, lng2 = map(radians, [lat1, lng1, lat2, lng2])
    dlat = lat2 - lat1
    dlng = lng2 - lng1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlng / 2) ** 2
    return 3956 * 2 * asin(sqrt(a))


def _search_csv(user_lat: float, user_lng: float, radius_miles: float) -> list[dict[str, Any]]:
    """Load restaurants from CSV and filter by distance."""
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
            dist = _haversine(user_lat, user_lng, rlat, rlng)
            if dist > radius_miles:
                continue
            hours_str = row.get("hours_of_operation", "")
            hours_list = [h.strip() for h in hours_str.split("|")] if hours_str else []
            r: dict[str, Any] = {
                "restaurant_name": row.get("restaurant_name", "Unknown"),
                "address": row.get("address", ""),
                "lat": rlat,
                "lng": rlng,
                "rating": float(row.get("rating", 0) or 0),
                "closing_time": row.get("closing_time", "Unknown"),
                "hours_of_operation": hours_list,
                "distance_miles": round(dist, 2),
            }
            if row.get("peak_surplus_day"):
                r["peak_surplus_day"] = row["peak_surplus_day"]
            if row.get("peak_surplus_kg"):
                try:
                    r["peak_surplus_kg"] = float(row["peak_surplus_kg"])
                except (ValueError, TypeError):
                    pass
            restaurants.append(r)
    seen: set[str] = set()
    unique: list[dict[str, Any]] = []
    for r in restaurants:
        name = r["restaurant_name"]
        if name not in seen:
            seen.add(name)
            unique.append(r)
    unique.sort(key=lambda x: x["distance_miles"])
    return unique


@router.post("/search")
async def search_nearby(req: SearchRequest):
    if req.address:
        user_lat, user_lng, formatted = _geocode(req.address)
    elif req.lat is not None and req.lng is not None:
        user_lat, user_lng = req.lat, req.lng
        formatted = f"{user_lat:.4f}, {user_lng:.4f}"
    else:
        raise HTTPException(400, "Provide either an address or lat/lng.")

    pinecone_key = settings.PINECONE_API_KEY or os.getenv("PINECONE_API_KEY", "")
    openrouter_key = settings.OPENROUTER_API_KEY or os.getenv("OPENROUTER_API_KEY", "")

    restaurants: list[dict[str, Any]] = []

    if pinecone_key and openrouter_key:
        try:
            from openai import OpenAI
            from pinecone import Pinecone

            oai = OpenAI(api_key=openrouter_key, base_url=settings.OPENROUTER_BASE_URL)
            pc = Pinecone(api_key=pinecone_key)
            index = pc.Index(INDEX_NAME)

            embedding = oai.embeddings.create(
                input=[req.query], model="openai/text-embedding-3-small"
            )
            query_vec = embedding.data[0].embedding

            radius_km = req.radius_miles * 1.60934
            delta = radius_km / 111.0

            results = index.query(
                vector=query_vec,
                top_k=200,
                filter={
                    "$and": [
                        {"lat": {"$gte": user_lat - delta}},
                        {"lat": {"$lte": user_lat + delta}},
                        {"lng": {"$gte": user_lng - delta}},
                        {"lng": {"$lte": user_lng + delta}},
                    ]
                },
                include_metadata=True,
            )

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

            seen: set[str] = set()
            for match in results.matches:
                md = match.metadata or {}
                rlat = float(md.get("lat", 0))
                rlng = float(md.get("lng", 0))
                dist = _haversine(user_lat, user_lng, rlat, rlng)
                if dist > req.radius_miles:
                    continue

                vec_id = getattr(match, "id", None) or ""
                peak = peak_lookup.get(vec_id, {}) if vec_id else {}

                r: dict[str, Any] = {
                    "restaurant_name": md.get("restaurant_name", "Unknown"),
                    "address": md.get("address", ""),
                    "lat": rlat,
                    "lng": rlng,
                    "rating": float(md.get("rating", 0)),
                    "closing_time": md.get("closing_time", "Unknown"),
                    "hours_of_operation": md.get("hours_of_operation", []),
                    "distance_miles": round(dist, 2),
                }
                if peak.get("peak_surplus_day"):
                    r["peak_surplus_day"] = peak["peak_surplus_day"]
                if peak.get("peak_surplus_kg"):
                    try:
                        r["peak_surplus_kg"] = float(peak["peak_surplus_kg"])
                    except (ValueError, TypeError):
                        pass

                name = r["restaurant_name"]
                if name not in seen:
                    seen.add(name)
                    restaurants.append(r)

            restaurants.sort(key=lambda x: x["distance_miles"])
        except Exception as exc:
            logger.warning("Pinecone/OpenRouter failed, falling back to CSV: %s", exc)
            restaurants = []

    if not restaurants:
        restaurants = _search_csv(user_lat, user_lng, req.radius_miles)

    return {
        "user_location": {
            "lat": user_lat,
            "lng": user_lng,
            "formatted_address": formatted,
        },
        "radius_miles": req.radius_miles,
        "restaurants": restaurants,
        "total_restaurants": len(restaurants),
    }
