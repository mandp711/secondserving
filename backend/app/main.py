from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.api.v1 import search, restaurants

settings = get_settings()


@asynccontextmanager
async def lifespan(application: FastAPI):
    yield


app = FastAPI(title="Food Rescue API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search.router, prefix="/api/v1", tags=["search"])
app.include_router(restaurants.router, prefix="/api/v1", tags=["restaurants"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "food-rescue-api"}
