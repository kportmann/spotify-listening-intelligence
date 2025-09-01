# Spotify Listening Intelligence

## Setup Instructions

### 1. Get Your Spotify Data
1. Request your Spotify data from [Spotify Privacy Settings](https://www.spotify.com/account/privacy/)
2. Select "Extended streaming history" when requesting
3. Download the extended streaming history (JSON files) when received

### 2. Add Your Data
1. Create a `data/` folder in the project root (if it doesn't exist)
2. Copy all your `Streaming_History_Audio_*.json` files into the `data/` folder

### 3. Run the Application
```bash
# Start all services
docker compose up -d

# Populate database with your data
docker compose exec backend python scripts/populate_db.py
```

### Expected Data Format
Your `data/` folder should contain files like:
- `Streaming_History_Audio_2023_0.json`
- `Streaming_History_Audio_2024_1.json`
- etc.

### Access the App
- Web App: http://localhost:3000
- API Docs: http://localhost:8000/docs