from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database.connection import get_db
from database.schema import SpotifyStream

router = APIRouter()

@router.get("/stats/overview")
async def get_overview_stats(db: Session = Depends(get_db)):
    """Get basic listening statistics using ORM."""
    
    result = db.query(
        func.count(SpotifyStream.id).label('total_streams'),
        func.count(func.distinct(SpotifyStream.master_metadata_album_artist_name)).label('unique_artists'),
        func.sum(SpotifyStream.ms_played).label('total_ms_played')
    ).filter(
        SpotifyStream.spotify_track_uri.isnot(None)  # Only music tracks
    ).first()
    
    total_hours = (result.total_ms_played or 0) / (1000 * 60 * 60)
    
    return {
        "total_streams": result.total_streams,
        "unique_artists": result.unique_artists,
        "total_listening_hours": round(total_hours, 2)
    }

@router.get("/stats/totalTime")
async def get_total_listing_time(db: Session = Depends(get_db)):
    """Get total listing time stats"""

    result = db.query(func.sum(SpotifyStream.ms_played).label('total_ms_played'))