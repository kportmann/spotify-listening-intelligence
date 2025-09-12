# Spotify Listening Intelligence

> Note: This project is under active development and new features are planed.

## Demo Video

Here is a quick Demovideo of the current state (09/12/2025). Hope you like it:

[![Watch the demo](Demo/Thumbnail.png)](Demo/DemoVideo.mp4)


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
