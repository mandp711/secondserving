# SecondServing — Surplus Food Rescue Platform

A real-time network connecting restaurants, stores, and farms with communities to rescue surplus food. Businesses list items before expiration; nearby households, food banks, or composters claim them instantly via app. AI learns waste patterns to optimize future ordering.

## Architecture

| Service     | Tech              | Port  |
|-------------|-------------------|-------|
| `frontend`  | Next.js 14 + TS   | 3000  |
| `backend`   | FastAPI + Python   | 8000  |
| `scraper`   | Celery + Playwright| —     |
| `ml`        | scikit-learn / XGB | 8001  |
| `rag`       | LangChain + Pinecone| —    |

## Prerequisites

- **Python 3.12+**
- **Node.js 20+**
- **Homebrew** (macOS)

## Setup Instructions

### 1. Clone and configure

```bash
git clone https://github.com/arhub07/foodapp.git
cd foodapp
cp .env.example .env
```

Edit `.env` and add your API keys (Google Maps, OpenAI, etc.). The database and Redis URLs are pre-configured for local Homebrew installs.

### 2. Install PostgreSQL and Redis

```bash
# Add Homebrew to your PATH if not already available
eval "$(/opt/homebrew/bin/brew shellenv)"

# Install
brew install postgresql@16 redis

# Add PostgreSQL binaries to PATH
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"

# Start as background services
brew services start postgresql@16
brew services start redis

# Create the database
createdb foodapp
```

To make the PATH changes permanent, add these to your `~/.zshrc` (or `~/.bashrc`):

```bash
eval "$(/opt/homebrew/bin/brew shellenv)"
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
```

### 3. Start the backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run database migrations (creates tables)
alembic upgrade head

# Start the API server
uvicorn app.main:app --reload
```

The backend runs at **http://localhost:8000**. API docs are at **http://localhost:8000/docs**.

### 4. Start the frontend

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at **http://localhost:3000**.

### 5. (Optional) Start the scraper

Open a new terminal:

```bash
cd scraper
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium

celery -A scraper.main worker --loglevel=info
```

### 6. (Optional) Start the ML service

Open a new terminal:

```bash
cd ml
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

uvicorn ml.serving.predict_api:app --port 8001 --reload
```

The ML service runs at **http://localhost:8001**.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `GOOGLE_MAPS_API_KEY` | For maps/scraper | Google Maps Platform API key |
| `OPENAI_API_KEY` | For RAG | OpenAI API key for embeddings + LLM |
| `PINECONE_API_KEY` | For RAG | Pinecone vector database API key |
| `RAPIDFIRE_API_KEY` | For ML | RapidfireAI training optimization key |
| `APP_SECRET_KEY` | Yes | Secret key for JWT signing |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | For auth | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | For auth | Supabase anon/public key |

For auth: create a Supabase project, run these in the SQL Editor (in order):
1. `supabase/migrations/001_create_restaurants.sql`
2. `supabase/migrations/002_create_profiles.sql`

Then add the env vars. Separate login/register flows exist for **Find Food** (consumers) and **Businesses** (restaurants).

## Project Structure

```
food_app/
├── .env.example            # Environment variable template
├── docker-compose.yml      # Docker setup (optional)
├── frontend/               # Next.js web application
│   ├── src/app/            # Pages (landing, auth, dashboard, listings, map)
│   ├── src/components/     # UI components, listings, map, layout
│   ├── src/hooks/          # useGeolocation, useSocket, useNearbyListings
│   ├── src/lib/            # API client, Google Maps loader, Socket.IO
│   ├── src/store/          # Zustand stores (auth, listings)
│   └── src/types/          # TypeScript interfaces
├── backend/                # FastAPI REST API
│   ├── app/api/v1/         # Route handlers (auth, listings, claims, search, maps)
│   ├── app/models/         # SQLAlchemy ORM models
│   ├── app/schemas/        # Pydantic request/response schemas
│   ├── app/services/       # Business logic layer
│   ├── app/db/             # Database engine and session
│   └── alembic/            # Database migrations
├── scraper/                # Restaurant menu web scraper
│   ├── scraper/spiders/    # Google Places, Yelp, DoorDash, generic
│   ├── scraper/parsers/    # Menu and price parsing
│   └── scraper/pipeline/   # Store to DB, vectorize for Pinecone
├── ml/                     # Waste prediction ML pipeline
│   ├── ml/models/          # WastePredictor (XGBoost), DemandForecaster
│   ├── ml/training/        # Training pipeline, evaluation, RapidfireAI
│   ├── ml/data/            # Data collection and preprocessing
│   └── ml/serving/         # FastAPI prediction endpoints
├── rag/                    # RAG pipeline (Pinecone + LangChain)
│   ├── rag/embeddings.py   # Text → vector embeddings
│   ├── rag/vectorstore.py  # Pinecone read/write
│   ├── rag/chain.py        # LangChain retrieval chain
│   └── rag/prompts/        # Prompt templates
└── shared/                 # Shared Python utilities
    ├── constants.py        # Enums and config constants
    ├── geo_utils.py        # Haversine distance, bounding box
    └── types.py            # Shared dataclasses
```
