from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from database.connection import get_db
from database.schema import SpotifyStream

router = APIRouter()

@router.get("/stats/overview")
async def get_stats_overview(year: int = None, db: Session = Depends(get_db)):
    """Get comprehensive listening statistics overview"""
    
    # Base query with optional year filter
    base_query = db.query(SpotifyStream)
    if year:
        base_query = base_query.filter(extract('year', SpotifyStream.ts) == year)
    
    # Get date range of streaming data
    date_range = base_query.with_entities(
        func.min(SpotifyStream.ts).label('first_stream'),
        func.max(SpotifyStream.ts).label('last_stream')
    ).first()
    
    # Total stats for all content
    total_stats = base_query.with_entities(
        func.sum(SpotifyStream.ms_played).label('total_ms'),
        func.count(SpotifyStream.id).label('total_streams')
    ).first()
    
    # Music tracks stats  
    music_stats = base_query.filter(
        SpotifyStream.spotify_track_uri.isnot(None)
    ).with_entities(
        func.sum(SpotifyStream.ms_played).label('music_ms'),
        func.count(SpotifyStream.id).label('music_streams')
    ).first()
    
    # Episodes stats
    episode_stats = base_query.filter(
        SpotifyStream.spotify_episode_uri.isnot(None)
    ).with_entities(
        func.sum(SpotifyStream.ms_played).label('episode_ms'),
        func.count(SpotifyStream.id).label('episode_streams')
    ).first()
    
    # Audiobook stats
    audiobook_stats = base_query.filter(
        SpotifyStream.audiobook_chapter_uri.isnot(None)
    ).with_entities(
        func.sum(SpotifyStream.ms_played).label('audiobook_ms'),
        func.count(SpotifyStream.id).label('audiobook_streams')
    ).first()
    
    # Calculate days between first and last stream
    streaming_days = 0
    if date_range.first_stream and date_range.last_stream:
        streaming_days = (date_range.last_stream - date_range.first_stream).days + 1
    
    # Helper function to convert ms to hours and days
    def ms_to_time_units(ms):
        if not ms:
            return {"hours": 0, "days": 0}
        hours = round(ms / (1000 * 60 * 60))
        days = round(hours / 24, 1)
        return {"hours": hours, "days": days}
    
    return {
        "time_period": {
            "first_stream": date_range.first_stream.isoformat() if date_range.first_stream else None,
            "last_stream": date_range.last_stream.isoformat() if date_range.last_stream else None,
            "streaming_days": streaming_days
        },
        "total": {
            "listening_time": ms_to_time_units(total_stats.total_ms or 0),
            "total_ms": total_stats.total_ms or 0,
            "stream_count": total_stats.total_streams or 0
        },
        "music": {
            "listening_time": ms_to_time_units(music_stats.music_ms or 0),
            "total_ms": music_stats.music_ms or 0,
            "stream_count": music_stats.music_streams or 0
        },
        "episodes": {
            "listening_time": ms_to_time_units(episode_stats.episode_ms or 0),
            "total_ms": episode_stats.episode_ms or 0,
            "stream_count": episode_stats.episode_streams or 0
        },
        "audiobooks": {
            "listening_time": ms_to_time_units(audiobook_stats.audiobook_ms or 0),
            "total_ms": audiobook_stats.audiobook_ms or 0,
            "stream_count": audiobook_stats.audiobook_streams or 0
        }
    }

@router.get("/stats/available-years")
async def get_available_years(db: Session = Depends(get_db)):
    """Get list of years with streaming data"""
    
    # Get distinct years from streaming data
    years_query = db.query(
        extract('year', SpotifyStream.ts).label('year')
    ).distinct().order_by(extract('year', SpotifyStream.ts).desc())
    
    years = [int(year[0]) for year in years_query.all()]
    
    return {
        "years": years,
        "total_years": len(years)
    }