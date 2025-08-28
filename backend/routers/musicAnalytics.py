from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, extract
from database.connection import get_db
from database.schema import SpotifyStream
from services.spotify_service import spotify_service
from typing import Optional, List
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel

router = APIRouter()


class ImageRequest(BaseModel):
    artists: Optional[List[str]] = None
    tracks: Optional[List[dict]] = None  # [{"track_name": "...", "artist_name": "..."}]


@router.post("/images/batch")
async def get_batch_images(request: ImageRequest):
    """Fetch images for multiple artists and/or tracks in a single request"""
    results = {
        "artist_images": {},
        "track_images": {}
    }
    
    # Fetch artist images
    if request.artists:
        for artist_name in request.artists:
            try:
                spotify_artist = await spotify_service.search_artist(artist_name)
                if spotify_artist and spotify_artist.images:
                    # Get medium size image (usually index 1) or first available
                    image_url = spotify_artist.images[1].url if len(spotify_artist.images) > 1 else spotify_artist.images[0].url
                    results["artist_images"][artist_name] = image_url
                else:
                    results["artist_images"][artist_name] = None
            except Exception as e:
                print(f"Failed to fetch image for artist {artist_name}: {e}")
                results["artist_images"][artist_name] = None
    
    # Fetch track images
    if request.tracks:
        for track_info in request.tracks:
            track_name = track_info["track_name"]
            artist_name = track_info["artist_name"]
            key = f"{track_name}|{artist_name}"
            
            try:
                spotify_track = await spotify_service.search_track(track_name, artist_name)
                if spotify_track and spotify_track.album_images:
                    # Get medium size image (usually index 1) or first available
                    image_url = spotify_track.album_images[1].url if len(spotify_track.album_images) > 1 else spotify_track.album_images[0].url
                    results["track_images"][key] = image_url
                else:
                    results["track_images"][key] = None
            except Exception as e:
                print(f"Failed to fetch image for track {track_name} by {artist_name}: {e}")
                results["track_images"][key] = None
    
    return results

@router.get("/top/artists")
async def get_top_artists(
    db: Session = Depends(get_db),
    period: Optional[str] = Query("all_time", description="Time period: 7d, 1m, 3m, 6m, 1y, all_time, or year (e.g., 2024)"),
    limit: Optional[int] = Query(50, description="Number of results to return"),
    include_images: Optional[bool] = Query(False, description="Include artist images from Spotify API")
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
        # Check if period is a year (4 digits)
        if period.isdigit() and len(period) == 4:
            year = int(period)
            query = query.filter(extract('year', SpotifyStream.ts) == year)
        else:
            cutoff_date = _get_cutoff_date(period)
            if cutoff_date:
                query = query.filter(SpotifyStream.ts >= cutoff_date)
    
    results = query.group_by(
        SpotifyStream.master_metadata_album_artist_name
    ).order_by(
        desc('total_ms')
    ).limit(limit).all()
    
    # Basic artist data (fast)
    artist_data_list = []
    for result in results:
        artist_data = {
            "artist_name": result.artist_name,
            "total_ms": result.total_ms,
            "total_hours": round(result.total_ms / (1000 * 60 * 60), 1),
            "play_count": result.play_count,
            "image_url": None
        }
        artist_data_list.append(artist_data)
    
    # Only fetch images if explicitly requested
    if include_images:
        for artist_data in artist_data_list:
            try:
                spotify_artist = await spotify_service.search_artist(artist_data["artist_name"])
                if spotify_artist and spotify_artist.images:
                    # Get medium size image (usually index 1) or first available
                    image_url = spotify_artist.images[1].url if len(spotify_artist.images) > 1 else spotify_artist.images[0].url
                    artist_data["image_url"] = image_url
            except Exception as e:
                # Continue without image if Spotify API fails
                print(f"Failed to fetch image for artist {artist_data['artist_name']}: {e}")
                pass
    
    return artist_data_list

@router.get("/top/tracks")
async def get_top_tracks(
    db: Session = Depends(get_db),
    period: Optional[str] = Query("all_time", description="Time period: 7d, 1m, 3m, 6m, 1y, all_time, or year (e.g., 2024)"),
    limit: Optional[int] = Query(50, description="Number of results to return"),
    include_images: Optional[bool] = Query(False, description="Include album artwork from Spotify API")
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
        # Check if period is a year (4 digits)
        if period.isdigit() and len(period) == 4:
            year = int(period)
            query = query.filter(extract('year', SpotifyStream.ts) == year)
        else:
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
    
    # Basic track data (fast)
    track_data_list = []
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
        track_data_list.append(track_data)
    
    # Only fetch images if explicitly requested
    if include_images:
        for track_data in track_data_list:
            try:
                spotify_track = await spotify_service.search_track(track_data["track_name"], track_data["artist_name"])
                if spotify_track and spotify_track.album_images:
                    # Get medium size image (usually index 1) or first available
                    image_url = spotify_track.album_images[1].url if len(spotify_track.album_images) > 1 else spotify_track.album_images[0].url
                    track_data["image_url"] = image_url
            except Exception as e:
                # Continue without image if Spotify API fails
                print(f"Failed to fetch image for track {track_data['track_name']} by {track_data['artist_name']}: {e}")
                pass
    
    return track_data_list


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