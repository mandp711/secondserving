"""GET /restaurants – returns all restaurants from Supabase san_diego_restaurants."""

import hashlib
import logging
from datetime import date
from typing import Any

import httpx
from fastapi import APIRouter

from app.config import get_settings


MAX_AVAILABLE = 4
MIN_AVAILABLE = 2


def _pick_available(items: list[str], restaurant_name: str) -> list[str]:
    """Deterministically pick a daily-rotating subset of menu items as 'available'."""
    if len(items) <= MIN_AVAILABLE:
        return items
    seed_str = f"{restaurant_name}:{date.today().isoformat()}"
    seed = int(hashlib.md5(seed_str.encode()).hexdigest(), 16)
    import random
    rng = random.Random(seed)
    k = rng.randint(MIN_AVAILABLE, min(MAX_AVAILABLE, len(items)))
    return rng.sample(items, k)

logger = logging.getLogger(__name__)

router = APIRouter()
settings = get_settings()


def _fetch_from_supabase() -> list[dict[str, Any]]:
    sb_url = settings.NEXT_PUBLIC_SUPABASE_URL
    sb_key = settings.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if not sb_url or not sb_key:
        logger.warning("Supabase credentials not configured")
        return []

    url = f"{sb_url}/rest/v1/san_diego_restaurants?select=*&order=name"
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
            lat = float(row.get("lat") or 0)
            lng = float(row.get("lng") or 0)
        except (ValueError, TypeError):
            continue
        hours_raw = row.get("hours_of_operation", "") or ""
        hours_list = [h.strip() for h in hours_raw.split("|")] if hours_raw else []
        menu_raw = row.get("menu_items", "") or ""
        all_items = [m.strip() for m in menu_raw.split(",") if m.strip()]
        name = row.get("name", "Unknown")
        available = _pick_available(all_items, name)
        restaurants.append({
            "id": row.get("id", ""),
            "name": name,
            "address": row.get("address", ""),
            "lat": lat,
            "lng": lng,
            "rating": float(row.get("rating") or 0),
            "cuisine": row.get("cuisine", ""),
            "price_level": row.get("price_level", ""),
            "phone": row.get("phone", ""),
            "closing_time": row.get("closing_time", "Unknown"),
            "hours_of_operation": hours_list,
            "menu_items": all_items,
            "available_items": available,
        })
    return restaurants


@router.get("/restaurants")
async def get_restaurants():
    try:
        restaurants = _fetch_from_supabase()
    except Exception as exc:
        logger.exception("Failed to fetch restaurants from Supabase: %s", exc)
        restaurants = []

    return {"restaurants": restaurants, "total": len(restaurants)}
