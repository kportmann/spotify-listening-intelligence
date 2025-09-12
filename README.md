# Spotify Listening Intelligence

> Note: This project is under active development and new features are planed.

## Introduction

Spotify Listening Intelligence is a personal analytics app that turns your extended Spotify streaming history into clear, visual insights. Explore your top artists and tracks, dig into listening patterns across time and geography, measure discovery and variety, or enjoy a Wrapped-style storytelling experience. Your data stays in your environment; optional Spotify API credentials are used only to enrich artists with metadata (e.g., genres and Artist ID).

This is a personal project I really enjoyed creating. Unfortunately, Spotify’s API has changed over time and some track‑level endpoints are restricted or no longer available for third‑party apps. Where data is missing, the app leans on your extended streaming history and locally computed metrics (e.g., listening sessions, daypart patterns, discovery ratio, repeat rate). When available, the official API is used to enrich artists with genres and IDs. The goal is to provide insights to your streaming data with nice visuals. 

### Key Features
- Dashboard: Top artists, tracks, and genres with quick-glance stats
- Listening patterns: Hourly/daily trends, sessions, and daypart insights
- Discovery & variety: New-artist ratio, repeat rate, and diversity indicators
- Wrapped: Story-style highlights of your listening year (in developement)


## Demo Video

Here is a quick Demo of the current state (09/12/2025). Hope you like it:

![Watch the demo](Demo/DemoVideo.gif)

## Tech Stack

- Frontend: React 19, React Router 7
- Backend: FastAPI (Python 3.10+), Pydantic v2, SQLAlchemy 2
- Database: PostgreSQL
- HTTP: Uvicorn, httpx
- Containerization: Docker

## Setup Instructions

### 1. Get Your Spotify Data
1. Request your Spotify data from [Spotify Privacy Settings](https://www.spotify.com/account/privacy/)
2. Select "Extended streaming history" when requesting
3. Download the extended streaming history (JSON files) when received

### 2. Add Your Data
1. Create a `data/` folder in the project root (if it doesn't exist)
2. Copy all your `Streaming_History_Audio_*.json` files into the `data/` folder

### 3. Configure Environment
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Edit `.env` and add your Spotify API credentials (required for artist enrichment):
   - Get credentials from [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Set `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`

### 4. Start Services
```bash
# Start all services
docker compose up -d
```

### 5. Connect to Database (pgAdmin)
1. Go to http://localhost:8080
2. Login with credentials from your `.env` file:
   - Email: `PGADMIN_DEFAULT_EMAIL`
   - Password: `PGADMIN_DEFAULT_PASSWORD`
3. Add server connection:
   - Host: `spotify-listening-intelligence-db`
   - Port: `5432`
   - Database: `spotify_listening_intelligence`
   - Username: `your_user_name`
   - Password: `your_password`

### 6. Populate Database
```bash
# Populate database with your streaming data
docker compose exec backend python scripts/populate_db.py

# Enrich with Spotify artist data (genres, metadata) via Spotify API
docker compose exec backend python scripts/populate_artists.py
```

### Expected Data Format
Your `data/` folder should contain files like:
- `Streaming_History_Audio_2023_0.json`
- `Streaming_History_Audio_2024_1.json`
- etc.

### Access the App
- Web App: http://localhost:3000
- API Docs: http://localhost:8000/docs
- Database Admin (pgAdmin): http://localhost:8080
