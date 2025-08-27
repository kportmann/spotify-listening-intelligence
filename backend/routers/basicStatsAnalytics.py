from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database.connection import get_db
from database.schema import SpotifyStream

router = APIRouter()

@router.get("/stats/overview")
async def get_stats_overview(db: Session = Depends(get_db)):
    """Get comprehensive listening statistics overview"""
    
    # Get date range of streaming data
    date_range = db.query(
        func.min(SpotifyStream.ts).label('first_stream'),
        func.max(SpotifyStream.ts).label('last_stream')
    ).first()
    
    # Total stats for all content
    total_stats = db.query(
        func.sum(SpotifyStream.ms_played).label('total_ms'),
        func.count(SpotifyStream.id).label('total_streams')
    ).first()
    
    # Music tracks stats  
    music_stats = db.query(
        func.sum(SpotifyStream.ms_played).label('music_ms'),
        func.count(SpotifyStream.id).label('music_streams')
    ).filter(SpotifyStream.spotify_track_uri.isnot(None)).first()
    
    # Episodes stats
    episode_stats = db.query(
        func.sum(SpotifyStream.ms_played).label('episode_ms'),
        func.count(SpotifyStream.id).label('episode_streams')
    ).filter(SpotifyStream.spotify_episode_uri.isnot(None)).first()
    
    # Audiobook stats
    audiobook_stats = db.query(
        func.sum(SpotifyStream.ms_played).label('audiobook_ms'),
        func.count(SpotifyStream.id).label('audiobook_streams')
    ).filter(SpotifyStream.audiobook_chapter_uri.isnot(None)).first()
    
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