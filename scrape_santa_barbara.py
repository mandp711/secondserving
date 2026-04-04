"""
Scrape restaurants in Santa Barbara — store name + closing hours in Pinecone.
Runs multiple search queries to maximize coverage, deduplicates by place_id,
and appends to the existing Pinecone index (preserving previous data).

Usage:
    source backend/.venv/bin/activate
    python3 scrape_santa_barbara.py
"""

import os
import time
import logging
from datetime import datetime
from typing import Any

import httpx
from dotenv import load_dotenv
from openai import OpenAI
from pinecone import Pinecone, ServerlessSpec

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(message)s")
log = logging.getLogger(__name__)

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY", "")
INDEX_NAME = "food-rescue-menus"

TEXT_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"
DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json"

SB_CENTER_LAT = 34.4208
SB_CENTER_LNG = -119.6982
SB_RADIUS_METERS = 8000

SB_BOUNDS = {
    "lat_min": 34.38,
    "lat_max": 34.46,
    "lng_min": -119.88,
    "lng_max": -119.63,
}

SEARCH_QUERIES = [
    "restaurants in Isla Vista CA",
    "best restaurants Isla Vista",
    "restaurants near UCSB",
    "food in Isla Vista CA",
    "pizza Isla Vista CA",
    "Mexican food Isla Vista CA",
    "tacos Isla Vista CA",
    "burrito Isla Vista CA",
    "sushi Isla Vista CA",
    "Thai food Isla Vista CA",
    "Chinese food Isla Vista CA",
    "Indian food Isla Vista CA",
    "burger Isla Vista CA",
    "sandwich shop Isla Vista CA",
    "poke bowl Isla Vista CA",
    "ramen Isla Vista CA",
    "breakfast Isla Vista CA",
    "coffee shop Isla Vista CA",
    "cafe Isla Vista CA",
    "bakery Isla Vista CA",
    "late night food Isla Vista CA",
    "cheap eats Isla Vista CA",
    "vegan food Isla Vista CA",
    "Mediterranean food Isla Vista CA",
    "wings Isla Vista CA",
    "ice cream Isla Vista CA",
    "smoothie Isla Vista CA",
    "restaurants Pardall Road Isla Vista",
    "restaurants Embarcadero del Norte Isla Vista",
    "restaurants Embarcadero del Mar Isla Vista",
    "food Goleta CA",
    "restaurants Goleta CA",
    "pizza Goleta CA",
    "Mexican restaurant Goleta CA",
    "sushi Goleta CA",
    "Thai restaurant Goleta CA",
    "Chinese restaurant Goleta CA",
    "burger Goleta CA",
    "cafe Goleta CA",
    "breakfast Goleta CA",
]

REJECT_TYPES = {
    "shopping_mall", "department_store", "lodging", "gas_station",
    "car_dealer", "car_repair", "car_wash", "clothing_store",
    "convenience_store", "drugstore", "electronics_store",
    "furniture_store", "gym", "hardware_store", "home_goods_store",
    "hospital", "laundry", "movie_theater", "parking", "school",
    "shoe_store", "spa", "stadium", "supermarket", "transit_station",
    "university", "veterinary_care", "grocery_or_supermarket",
}

FOOD_TYPES = {
    "restaurant", "cafe", "bakery", "bar", "meal_delivery",
    "meal_takeaway", "food",
}


def is_in_santa_barbara(lat: float, lng: float) -> bool:
    return (
        SB_BOUNDS["lat_min"] <= lat <= SB_BOUNDS["lat_max"]
        and SB_BOUNDS["lng_min"] <= lng <= SB_BOUNDS["lng_max"]
    )


# ---------------------------------------------------------------------------
# Step 1: Find restaurants via multiple Text Search queries
# ---------------------------------------------------------------------------

def search_all_restaurants() -> list[dict]:
    all_results: list[dict] = []
    seen_ids: set[str] = set()
    skipped_outside = 0

    for query in SEARCH_QUERIES:
        log.info(f'  Searching: "{query}"')
        params: dict[str, Any] = {
            "query": query,
            "location": f"{SB_CENTER_LAT},{SB_CENTER_LNG}",
            "radius": str(SB_RADIUS_METERS),
            "key": GOOGLE_MAPS_API_KEY,
        }

        for page in range(1, 4):
            with httpx.Client(timeout=30) as client:
                resp = client.get(TEXT_SEARCH_URL, params=params)
                resp.raise_for_status()
                data = resp.json()

            for place in data.get("results", []):
                pid = place.get("place_id", "")
                if pid in seen_ids:
                    continue
                seen_ids.add(pid)

                types = set(place.get("types", []))
                if types & REJECT_TYPES:
                    continue
                if not types & FOOD_TYPES:
                    continue

                loc = place.get("geometry", {}).get("location", {})
                lat = loc.get("lat", 0.0)
                lng = loc.get("lng", 0.0)

                if not is_in_santa_barbara(lat, lng):
                    skipped_outside += 1
                    continue

                all_results.append({
                    "name": place.get("name", ""),
                    "place_id": pid,
                    "lat": lat,
                    "lng": lng,
                    "address": place.get("formatted_address", ""),
                    "rating": place.get("rating", 0.0),
                    "types": list(types),
                })

            next_token = data.get("next_page_token")
            if not next_token:
                break
            time.sleep(2)
            params = {"pagetoken": next_token, "key": GOOGLE_MAPS_API_KEY}

        log.info(f"    → Running total: {len(all_results)} unique restaurants")
        time.sleep(0.5)

    log.info(f"\n    Total unique restaurants in Santa Barbara: {len(all_results)}")
    if skipped_outside:
        log.info(f"    Skipped (outside Santa Barbara bounds): {skipped_outside}")
    return all_results


# ---------------------------------------------------------------------------
# Step 2: Get closing hours from Place Details
# ---------------------------------------------------------------------------

def get_details(place_id: str) -> dict:
    params = {
        "place_id": place_id,
        "fields": "name,formatted_address,opening_hours",
        "key": GOOGLE_MAPS_API_KEY,
    }
    with httpx.Client(timeout=15) as client:
        resp = client.get(DETAILS_URL, params=params)
        resp.raise_for_status()
        result = resp.json().get("result", {})

    hours_data = result.get("opening_hours", {})
    weekday_text = hours_data.get("weekday_text", [])
    periods = hours_data.get("periods", [])
    today_open, today_close = _parse_today_hours(periods)

    return {
        "full_address": result.get("formatted_address", ""),
        "hours_of_operation": weekday_text,
        "opening_time": today_open,
        "closing_time": today_close,
    }


def _parse_today_hours(periods: list[dict]) -> tuple[str, str]:
    if not periods:
        return "Unknown", "Unknown"

    today_dow = datetime.now().weekday()
    google_dow = (today_dow + 1) % 7

    for period in periods:
        open_info = period.get("open", {})
        close_info = period.get("close", {})
        if open_info.get("day") == google_dow:
            open_time = _fmt_time(open_info.get("time", ""))
            close_time = _fmt_time(close_info.get("time", "")) if close_info else "Open 24 hours"
            return open_time, close_time

    if len(periods) == 1 and not periods[0].get("close"):
        return "Open 24 hours", "Open 24 hours"

    return "Unknown", "Unknown"


def _fmt_time(time_str: str) -> str:
    if not time_str or len(time_str) != 4:
        return "Unknown"
    try:
        hour, minute = int(time_str[:2]), int(time_str[2:])
        dt = datetime.now().replace(hour=hour, minute=minute)
        return dt.strftime("%-I:%M %p")
    except ValueError:
        return time_str


# ---------------------------------------------------------------------------
# Step 3: Store in Pinecone (append to existing index)
# ---------------------------------------------------------------------------

def store_in_pinecone(restaurants: list[dict]) -> int:
    log.info(f"\n[3] Appending {len(restaurants)} new restaurants to Pinecone...")

    client = OpenAI(api_key=OPENROUTER_API_KEY, base_url=OPENROUTER_BASE_URL)
    pc = Pinecone(api_key=PINECONE_API_KEY)

    existing_indexes = [idx.name for idx in pc.list_indexes()]
    if INDEX_NAME not in existing_indexes:
        pc.create_index(
            name=INDEX_NAME, dimension=1536, metric="cosine",
            spec=ServerlessSpec(cloud="aws", region="us-east-1"),
        )
        log.info(f"    Created new index '{INDEX_NAME}'")
        time.sleep(15)
    else:
        log.info(f"    Using existing index '{INDEX_NAME}'")

    index = pc.Index(INDEX_NAME)
    stats = index.describe_index_stats()
    log.info(f"    Existing vectors in index: {stats.total_vector_count}")

    texts: list[str] = []
    records: list[dict] = []

    for rest in restaurants:
        hours_str = "; ".join(rest.get("hours_of_operation", []))
        text = (
            f"Restaurant: {rest['name']}. "
            f"Address: {rest.get('address', '')}. "
            f"Closing time today: {rest.get('closing_time', 'Unknown')}. "
            f"Hours: {hours_str}."
        )
        texts.append(text)
        records.append({
            "id": f"sb-{rest['place_id'][:16]}",
            "restaurant_name": rest["name"],
            "address": rest.get("address", ""),
            "lat": rest["lat"],
            "lng": rest["lng"],
            "rating": rest.get("rating", 0),
            "closing_time": rest.get("closing_time", "Unknown"),
            "hours_of_operation": rest.get("hours_of_operation", []),
        })

    log.info(f"    Vectors to store: {len(texts)}")

    BATCH = 40
    total = 0
    for i in range(0, len(texts), BATCH):
        batch_texts = texts[i:i + BATCH]
        batch_recs = records[i:i + BATCH]

        resp = client.embeddings.create(input=batch_texts, model="openai/text-embedding-3-small")
        vectors = [emb.embedding for emb in resp.data]

        upserts = []
        for rec, vec in zip(batch_recs, vectors):
            upserts.append({
                "id": rec["id"],
                "values": vec,
                "metadata": {
                    "restaurant_name": rec["restaurant_name"],
                    "address": rec["address"],
                    "lat": rec["lat"],
                    "lng": rec["lng"],
                    "rating": rec["rating"],
                    "closing_time": rec["closing_time"],
                    "hours_of_operation": rec["hours_of_operation"],
                },
            })

        index.upsert(vectors=upserts)
        total += len(upserts)
        log.info(f"    Batch {i // BATCH + 1}: {len(upserts)} vectors (total: {total})")
        time.sleep(1)

    return total


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print("=" * 70)
    print("  FOOD RESCUE — SANTA BARBARA RESTAURANTS (EXPANDED SEARCH)")
    print("=" * 70)

    log.info("\n[1] Running multiple search queries to find restaurants...\n")
    restaurants = search_all_restaurants()

    pc = Pinecone(api_key=PINECONE_API_KEY)
    existing_indexes = [idx.name for idx in pc.list_indexes()]
    existing_ids: set[str] = set()
    if INDEX_NAME in existing_indexes:
        index = pc.Index(INDEX_NAME)
        stats = index.describe_index_stats()
        log.info(f"\n    Existing vectors in Pinecone: {stats.total_vector_count}")

    new_restaurants = []
    for rest in restaurants:
        vec_id = f"sb-{rest['place_id'][:16]}"
        if vec_id not in existing_ids:
            new_restaurants.append(rest)

    log.info(f"    New restaurants to add: {len(new_restaurants)} (skipping {len(restaurants) - len(new_restaurants)} already stored)\n")

    if not new_restaurants:
        log.info("    All restaurants are already in Pinecone. Nothing to add.")
        return

    log.info(f"[2] Fetching closing hours for {len(new_restaurants)} new restaurants...\n")

    valid: list[dict] = []
    for i, rest in enumerate(new_restaurants):
        try:
            details = get_details(rest["place_id"])
            rest["address"] = details.get("full_address", rest.get("address", ""))
            rest["hours_of_operation"] = details.get("hours_of_operation", [])
            rest["opening_time"] = details.get("opening_time", "Unknown")
            rest["closing_time"] = details.get("closing_time", "Unknown")
            valid.append(rest)
            log.info(
                f"  {i+1:3d}. ✅ {rest['name'][:50]:<50s} "
                f"| Closes: {rest['closing_time']}"
            )
        except Exception as e:
            log.info(f"  {i+1:3d}. ❌ {rest['name'][:50]:<50s} | Error: {e}")

    log.info(f"\n    New restaurants with details: {len(valid)}")

    if not valid:
        log.info("\n    No new restaurants to add. Exiting.")
        return

    stored = store_in_pinecone(valid)

    log.info(f"\n[4] Waiting for index to sync...")
    time.sleep(10)

    log.info(f"\n[5] Verifying...\n")
    client = OpenAI(api_key=OPENROUTER_API_KEY, base_url=OPENROUTER_BASE_URL)
    pc = Pinecone(api_key=PINECONE_API_KEY)
    idx = pc.Index(INDEX_NAME)

    stats = idx.describe_index_stats()
    log.info(f"    Index stats: {stats.total_vector_count} vectors stored\n")

    queries = ["restaurants on State Street", "Mexican food", "sushi", "Italian restaurant", "coffee shop"]
    for q in queries:
        qr = client.embeddings.create(input=[q], model="openai/text-embedding-3-small")
        results = idx.query(vector=qr.data[0].embedding, top_k=5, include_metadata=True)
        print(f'  "{q}"')
        for m in results.matches:
            md = m.metadata
            print(f"    {m.score:.3f} | {md.get('restaurant_name', '?')} | Closes: {md.get('closing_time', '?')}")
        print()

    print("=" * 70)
    print(f"  DONE — {stored} new restaurants added to Pinecone")
    print(f"  Index now has: {stats.total_vector_count} total vectors")
    print(f"  View: https://app.pinecone.io")
    print("=" * 70)


if __name__ == "__main__":
    main()
