"""POST /semantic-search – find restaurants by food type via Pinecone vector similarity.

Uses the Pinecone REST API and OpenRouter embeddings directly (no SDK).
"""

import logging
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter()
settings = get_settings()

PINECONE_HOST = "food-rescue-menus-xpxejgx.svc.aped-4627-b74a.pinecone.io"
EMBEDDING_MODEL = "google/gemini-embedding-001"
EMBEDDING_DIM = 768


class SemanticSearchRequest(BaseModel):
    query: str
    top_k: int = 20


def _get_embedding(text: str) -> list[float]:
    resp = httpx.post(
        f"{settings.OPENROUTER_BASE_URL}/embeddings",
        headers={
            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "input": [text],
            "model": EMBEDDING_MODEL,
            "dimensions": EMBEDDING_DIM,
        },
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["data"][0]["embedding"]


def _query_pinecone(vector: list[float], top_k: int) -> list[dict[str, Any]]:
    resp = httpx.post(
        f"https://{PINECONE_HOST}/query",
        headers={
            "Api-Key": settings.PINECONE_API_KEY,
            "Content-Type": "application/json",
        },
        json={
            "vector": vector,
            "topK": top_k,
            "namespace": "san_diego",
            "includeMetadata": True,
        },
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json().get("matches", [])


def _load_menu_lookup() -> dict[str, list[str]]:
    sb_url = settings.NEXT_PUBLIC_SUPABASE_URL
    sb_key = settings.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if not sb_url or not sb_key:
        return {}
    try:
        url = f"{sb_url}/rest/v1/san_diego_restaurants?select=name,menu_items"
        headers = {"apikey": sb_key, "Authorization": f"Bearer {sb_key}"}
        with httpx.Client(timeout=10) as client:
            resp = client.get(url, headers=headers)
            resp.raise_for_status()
        lookup: dict[str, list[str]] = {}
        for row in resp.json():
            raw = row.get("menu_items", "") or ""
            items = [m.strip() for m in raw.split(",") if m.strip()]
            if items:
                lookup[row.get("name", "")] = items
        return lookup
    except Exception:
        return {}


@router.post("/semantic-search")
async def semantic_search(req: SemanticSearchRequest):
    if not req.query.strip():
        raise HTTPException(400, "Query must not be empty.")

    if not settings.PINECONE_API_KEY or not settings.OPENROUTER_API_KEY:
        raise HTTPException(
            503, "Semantic search is not configured (missing PINECONE or OPENROUTER keys)."
        )

    try:
        query_vec = _get_embedding(req.query.strip())
        matches = _query_pinecone(query_vec, req.top_k)
        menu_lookup = _load_menu_lookup()

        restaurants: list[dict[str, Any]] = []
        for match in matches:
            md = match.get("metadata", {})
            hours = md.get("hours_of_operation", [])
            if isinstance(hours, str):
                hours = [h.strip() for h in hours.split("|") if h.strip()]

            name = md.get("restaurant_name", "Unknown")
            restaurants.append({
                "restaurant_name": name,
                "address": md.get("address", ""),
                "lat": float(md.get("lat", 0)),
                "lng": float(md.get("lng", 0)),
                "rating": float(md.get("rating", 0)),
                "cuisine": md.get("cuisine", ""),
                "price_level": md.get("price_level", ""),
                "phone": md.get("phone", ""),
                "closing_time": md.get("closing_time", "Unknown"),
                "hours_of_operation": hours,
                "menu_items": menu_lookup.get(name, []),
                "score": round(float(match.get("score", 0)), 4),
            })

        return {
            "query": req.query,
            "restaurants": restaurants,
            "total": len(restaurants),
        }

    except httpx.HTTPStatusError as exc:
        logger.exception("API call failed: %s", exc)
        raise HTTPException(502, f"Upstream API error: {exc.response.status_code}")
    except Exception as exc:
        logger.exception("Semantic search failed: %s", exc)
        raise HTTPException(500, f"Semantic search failed: {exc}")
