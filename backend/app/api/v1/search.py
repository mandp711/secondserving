"""Search for restaurants near the user's location.

Queries Supabase san_diego_restaurants and filters by distance.
"""

import hashlib
import logging
import random
from datetime import date
from math import radians, cos, sin, asin, sqrt
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import get_settings

MAX_AVAILABLE = 4
MIN_AVAILABLE = 2


def _pick_available(items: list[str], restaurant_name: str) -> list[str]:
    if len(items) <= MIN_AVAILABLE:
        return items
    seed_str = f"{restaurant_name}:{date.today().isoformat()}"
    seed = int(hashlib.md5(seed_str.encode()).hexdigest(), 16)
    rng = random.Random(seed)
    k = rng.randint(MIN_AVAILABLE, min(MAX_AVAILABLE, len(items)))
    return rng.sample(items, k)

logger = logging.getLogger(__name__)

router = APIRouter()
settings = get_settings()

GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"


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


def _search_supabase(user_lat: float, user_lng: float, radius_miles: float) -> list[dict[str, Any]]:
    sb_url = settings.NEXT_PUBLIC_SUPABASE_URL
    sb_key = settings.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if not sb_url or not sb_key:
        return []

    url = f"{sb_url}/rest/v1/san_diego_restaurants?select=*"
    headers = {
        "apikey": sb_key,
        "Authorization": f"Bearer {sb_key}",
    }

    with httpx.Client(timeout=15) as client:
        resp = client.get(url, headers=headers)
        resp.raise_for_status()
        rows = resp.json()

    restaurants: list[dict[str, Any]] = []
    for row in rows:
        try:
            rlat = float(row.get("lat") or 0)
            rlng = float(row.get("lng") or 0)
        except (ValueError, TypeError):
            continue
        dist = _haversine(user_lat, user_lng, rlat, rlng)
        if dist > radius_miles:
            continue
        hours_raw = row.get("hours_of_operation", "") or ""
        hours_list = [h.strip() for h in hours_raw.split("|")] if hours_raw else []
        menu_raw = row.get("menu_items", "") or ""
        all_items = [m.strip() for m in menu_raw.split(",") if m.strip()]
        rname = row.get("name", "Unknown")
        available = _pick_available(all_items, rname)
        restaurants.append({
            "restaurant_name": rname,
            "address": row.get("address", ""),
            "lat": rlat,
            "lng": rlng,
            "rating": float(row.get("rating") or 0),
            "closing_time": row.get("closing_time", "Unknown"),
            "hours_of_operation": hours_list,
            "menu_items": all_items,
            "available_items": available,
            "distance_miles": round(dist, 2),
        })

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

    try:
        restaurants = _search_supabase(user_lat, user_lng, req.radius_miles)
    except Exception as exc:
        logger.exception("Supabase search failed: %s", exc)
        restaurants = []

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
