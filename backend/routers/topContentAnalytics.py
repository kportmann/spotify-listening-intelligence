from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from database.connection import get_db
from database.schema import SpotifyStream
from services.spotify_service import spotify_service
from typing import Optional
from datetime import datetime, timedelta, timezone

router = APIRouter()

@router.get("/top/artists")
async def get_top_artists(
    db: Session = Depends(get_db),
    period: Optional[str] = Query("all_time", description="Time period: 7d, 1m, 3m, 6m, 1y, all_time"),
    limit: Optional[int] = Query(50, description="Number of results to return")
):
    """Get top artists by listening time"""
    
    query = db.query(
        SpotifyStream.master_metadata_album_artist_name.label('artist_name'),
        func.sum(SpotifyStream.ms_played).label('total_ms'),
        func.count(SpotifyStream.id).label('play_count')
    ).filter(
        SpotifyStream.spotify_track_uri.isnot(None),
        SpotifyStream.master_metadata_album_artist_name.isnot(None)
    )
    
    # Apply time filter
    if period != "all_time":
        cutoff_date = _get_cutoff_date(period)
        if cutoff_date:
            query = query.filter(SpotifyStream.ts >= cutoff_date)
    
    results = query.group_by(
        SpotifyStream.master_metadata_album_artist_name
    ).order_by(
        desc('total_ms')
    ).limit(limit).all()
    
    # Enrich with Spotify artist images
    enriched_results = []
    for result in results:
        artist_data = {
            "artist_name": result.artist_name,
            "total_ms": result.total_ms,
            "total_hours": round(result.total_ms / (1000 * 60 * 60), 1),
            "play_count": result.play_count,
            "image_url": None
        }
        
        # Try to get artist image from Spotify API
        try:
            spotify_artist = await spotify_service.search_artist(result.artist_name)
            if spotify_artist and spotify_artist.images:
                # Get medium size image (usually index 1) or first available
                image_url = spotify_artist.images[1].url if len(spotify_artist.images) > 1 else spotify_artist.images[0].url
                artist_data["image_url"] = image_url
        except Exception as e:
            # Continue without image if Spotify API fails
            print(f"Failed to fetch image for artist {result.artist_name}: {e}")
            pass
        
        enriched_results.append(artist_data)
    
    return enriched_results

@router.get("/top/tracks")
async def get_top_tracks(
    db: Session = Depends(get_db),
    period: Optional[str] = Query("all_time", description="Time period: 7d, 1m, 3m, 6m, 1y, all_time"),
    limit: Optional[int] = Query(50, description="Number of results to return")
):
    """Get top tracks by listening time"""
    
    query = db.query(
        SpotifyStream.master_metadata_track_name.label('track_name'),
        SpotifyStream.master_metadata_album_artist_name.label('artist_name'),
        SpotifyStream.master_metadata_album_album_name.label('album_name'),
        func.sum(SpotifyStream.ms_played).label('total_ms'),
        func.count(SpotifyStream.id).label('play_count')
    ).filter(
        SpotifyStream.spotify_track_uri.isnot(None),
        SpotifyStream.master_metadata_track_name.isnot(None)
    )
    
    # Apply time filter
    if period != "all_time":
        cutoff_date = _get_cutoff_date(period)
        if cutoff_date:
            query = query.filter(SpotifyStream.ts >= cutoff_date)
    
    results = query.group_by(
        SpotifyStream.master_metadata_track_name,
        SpotifyStream.master_metadata_album_artist_name,
        SpotifyStream.master_metadata_album_album_name
    ).order_by(
        desc('total_ms')
    ).limit(limit).all()
    
    # Enrich with Spotify track album artwork
    enriched_results = []
    for result in results:
        track_data = {
            "track_name": result.track_name,
            "artist_name": result.artist_name,
            "album_name": result.album_name,
            "total_ms": result.total_ms,
            "total_hours": round(result.total_ms / (1000 * 60 * 60), 1),
            "play_count": result.play_count,
            "image_url": None
        }
        
        # Try to get track album artwork from Spotify API
        try:
            spotify_track = await spotify_service.search_track(result.track_name, result.artist_name)
            if spotify_track and spotify_track.album_images:
                # Get medium size image (usually index 1) or first available
                image_url = spotify_track.album_images[1].url if len(spotify_track.album_images) > 1 else spotify_track.album_images[0].url
                track_data["image_url"] = image_url
        except Exception as e:
            # Continue without image if Spotify API fails
            print(f"Failed to fetch image for track {result.track_name} by {result.artist_name}: {e}")
            pass
        
        enriched_results.append(track_data)
    
    return enriched_results

@router.get("/top/episodes")
async def get_top_episodes(
    db: Session = Depends(get_db),
    period: Optional[str] = Query("all_time", description="Time period: 7d, 1m, 3m, 6m, 1y, all_time"),
    limit: Optional[int] = Query(50, description="Number of results to return")
):
    """Get top podcast episodes by listening time"""
    
    query = db.query(
        SpotifyStream.episode_name.label('episode_name'),
        SpotifyStream.episode_show_name.label('show_name'),
        func.sum(SpotifyStream.ms_played).label('total_ms'),
        func.count(SpotifyStream.id).label('play_count')
    ).filter(
        SpotifyStream.spotify_episode_uri.isnot(None),
        SpotifyStream.episode_name.isnot(None)
    )
    
    # Apply time filter
    if period != "all_time":
        cutoff_date = _get_cutoff_date(period)
        if cutoff_date:
            query = query.filter(SpotifyStream.ts >= cutoff_date)
    
    results = query.group_by(
        SpotifyStream.episode_name,
        SpotifyStream.episode_show_name
    ).order_by(
        desc('total_ms')
    ).limit(limit).all()
    
    return [
        {
            "episode_name": result.episode_name,
            "show_name": result.show_name,
            "total_ms": result.total_ms,
            "total_hours": round(result.total_ms / (1000 * 60 * 60), 1),
            "play_count": result.play_count
        }
        for result in results
    ]

@router.get("/top/shows")
async def get_top_shows(
    db: Session = Depends(get_db),
    period: Optional[str] = Query("all_time", description="Time period: 7d, 1m, 3m, 6m, 1y, all_time"),
    limit: Optional[int] = Query(50, description="Number of results to return")
):
    """Get top podcast shows by listening time"""
    
    query = db.query(
        SpotifyStream.episode_show_name.label('show_name'),
        func.sum(SpotifyStream.ms_played).label('total_ms'),
        func.count(SpotifyStream.id).label('play_count')
    ).filter(
        SpotifyStream.spotify_episode_uri.isnot(None),
        SpotifyStream.episode_show_name.isnot(None)
    )
    
    # Apply time filter
    if period != "all_time":
        cutoff_date = _get_cutoff_date(period)
        if cutoff_date:
            query = query.filter(SpotifyStream.ts >= cutoff_date)
    
    results = query.group_by(
        SpotifyStream.episode_show_name
    ).order_by(
        desc('total_ms')
    ).limit(limit).all()
    
    return [
        {
            "show_name": result.show_name,
            "total_ms": result.total_ms,
            "total_hours": round(result.total_ms / (1000 * 60 * 60), 1),
            "play_count": result.play_count
        }
        for result in results
    ]

@router.get("/top/audiobooks")
async def get_top_audiobooks(
    db: Session = Depends(get_db),
    period: Optional[str] = Query("all_time", description="Time period: 7d, 1m, 3m, 6m, 1y, all_time"),
    limit: Optional[int] = Query(50, description="Number of results to return")
):
    """Get top audiobooks by listening time"""
    
    query = db.query(
        SpotifyStream.audiobook_title.label('audiobook_title'),
        func.sum(SpotifyStream.ms_played).label('total_ms'),
        func.count(SpotifyStream.id).label('play_count')
    ).filter(
        SpotifyStream.audiobook_chapter_uri.isnot(None),
        SpotifyStream.audiobook_title.isnot(None)
    )
    
    # Apply time filter
    if period != "all_time":
        cutoff_date = _get_cutoff_date(period)
        if cutoff_date:
            query = query.filter(SpotifyStream.ts >= cutoff_date)
    
    results = query.group_by(
        SpotifyStream.audiobook_title
    ).order_by(
        desc('total_ms')
    ).limit(limit).all()
    
    return [
        {
            "audiobook_title": result.audiobook_title,
            "total_ms": result.total_ms,
            "total_hours": round(result.total_ms / (1000 * 60 * 60), 1),
            "play_count": result.play_count
        }
        for result in results
    ]

def _get_cutoff_date(period: str) -> Optional[datetime]:
    """Helper function to calculate cutoff date based on period"""
    now = datetime.now(timezone.utc)
    
    period_mapping = {
        "7d": timedelta(days=7),
        "1m": timedelta(days=30),
        "3m": timedelta(days=90),
        "6m": timedelta(days=180),
        "1y": timedelta(days=365)
    }
    
    if period in period_mapping:
        return now - period_mapping[period]
    
    return None