from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from config.settings import get_settings
from routers import basicAnalytics, musicAnalytics, podcastAnalytics, listeningPatternsAnalytics
from datetime import datetime, timezone
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

settings = get_settings()

app = FastAPI(
    title="Spotify Listening Intelligence API",
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

# Global error handlers for consistent error responses
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "message": "Internal server error",
            "code": "internal_error",
            "details": None,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "path": request.url.path,
        },
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "message": "Validation error",
            "code": "validation_error",
            "details": exc.errors(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "path": request.url.path,
        },
    )

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "message": exc.detail if isinstance(exc.detail, str) else "HTTP error",
            "code": "http_error",
            "details": None,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "path": request.url.path,
        },
    )

app.include_router(basicAnalytics.router, prefix="/api/v1/basicStats", tags=["basicStats"])
app.include_router(musicAnalytics.router, prefix="/api/v1/music", tags=["music"])
app.include_router(podcastAnalytics.router, prefix="/api/v1/podcasts", tags=["podcasts"])
app.include_router(listeningPatternsAnalytics.router, prefix="/api/v1/listening-patterns", tags=["listening-patterns"])

@app.get("/")
async def root():
    return {"message": "Spotify Listening Intelligence API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
