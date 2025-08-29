from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config.settings import get_settings
from routers import basicAnalytics, musicAnalytics, podcastAnalytics, listeningPatternsAnalytics

settings = get_settings()

app = FastAPI(
    title="Spotify Analytics API",
    description="API for analyzing personal Spotify streaming data",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(basicAnalytics.router, prefix="/api/v1/basicStats", tags=["basicStats"])
app.include_router(musicAnalytics.router, prefix="/api/v1/music", tags=["music"])
app.include_router(podcastAnalytics.router, prefix="/api/v1/podcasts", tags=["podcasts"])
app.include_router(listeningPatternsAnalytics.router, prefix="/api/v1/listening-patterns", tags=["listening-patterns"])

@app.get("/")
async def root():
    return {"message": "Spotify Analytics API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
