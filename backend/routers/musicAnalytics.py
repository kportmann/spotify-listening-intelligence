from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, extract
from database.connection import get_db
from database.schema import SpotifyStream
from services.spotify_service import spotify_service
from services.spotify_batch_service import spotify_batch_service
from typing import Optional, List
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel

router = APIRouter()


class ImageRequest(BaseModel):
    artists: Optional[List[str]] = None
    tracks: Optional[List[dict]] = None  # [{"track_name": "...", "artist_name": "..."}]


@router.post("/images/batch")
async def get_batch_images(request: ImageRequest):
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
    include_images: Optional[bool] = Query(False, description="Include artist images from Spotify API"),
    refresh_cache: Optional[bool] = Query(False, description="Force refresh of cached image data")
):
    
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
        try:
            # Use batch artist lookup by names - combines individual searches with batch API
            artist_names = [artist_data["artist_name"] for artist_data in artist_data_list]
            batch_artists = await spotify_service.get_artists_batch_by_names(artist_names)
            
            # Enhance artist data with images from batch results
            for artist_data in artist_data_list:
                artist_name = artist_data["artist_name"]
                if artist_name in batch_artists:
                    spotify_artist = batch_artists[artist_name]
                    if spotify_artist.images:
                        image_url = spotify_artist.images[1].url if len(spotify_artist.images) > 1 else spotify_artist.images[0].url
                        artist_data["image_url"] = image_url
        
        except Exception as e:
            print(f"Batch artist fetching failed, falling back to individual searches: {e}")
            # Fallback to individual searches if batch fails
            for artist_data in artist_data_list:
                try:
                    spotify_artist = await spotify_service.search_artist(
                        artist_data["artist_name"], 
                        refresh_cache=refresh_cache
                    )
                    if spotify_artist and spotify_artist.images:
                        image_url = spotify_artist.images[1].url if len(spotify_artist.images) > 1 else spotify_artist.images[0].url
                        artist_data["image_url"] = image_url
                except Exception as e2:
                    print(f"Failed to fetch image for artist {artist_data['artist_name']}: {e2}")
                    pass
    
    return artist_data_list

@router.get("/top/tracks")
async def get_top_tracks(
    db: Session = Depends(get_db),
    period: Optional[str] = Query("all_time", description="Time period: 7d, 1m, 3m, 6m, 1y, all_time, or year (e.g., 2024)"),
    limit: Optional[int] = Query(50, description="Number of results to return"),
    include_images: Optional[bool] = Query(False, description="Include album artwork from Spotify API"),
    refresh_cache: Optional[bool] = Query(False, description="Force refresh of cached image data")
):
    
    query = db.query(
        SpotifyStream.master_metadata_track_name.label('track_name'),
        SpotifyStream.master_metadata_album_artist_name.label('artist_name'),
        SpotifyStream.master_metadata_album_album_name.label('album_name'),
        SpotifyStream.spotify_track_uri.label('track_uri'),
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
        SpotifyStream.master_metadata_album_album_name,
        SpotifyStream.spotify_track_uri
    ).order_by(
        desc('total_ms')
    ).limit(limit).all()
    
    # Basic track data (fast)
    track_data_list = []
    track_uris = []
    
    for result in results:
        track_data = {
            "track_name": result.track_name,
            "artist_name": result.artist_name,
            "album_name": result.album_name,
            "total_ms": result.total_ms,
            "total_hours": round(result.total_ms / (1000 * 60 * 60), 1),
            "play_count": result.play_count,
            "track_uri": result.track_uri,
            "image_url": None
        }
        track_data_list.append(track_data)
        if result.track_uri:
            track_uris.append(result.track_uri)
    
    # Only fetch images if explicitly requested
    if include_images:
        try:
            # Batch API using existing URIs - ~50x faster than individual searches
            batch_tracks = await spotify_batch_service.get_tracks_from_uris(track_uris)
            
            track_lookup = {f"spotify:track:{track.id}": track for track in batch_tracks}
            for track_data in track_data_list:
                if track_data["track_uri"] in track_lookup:
                    spotify_track = track_lookup[track_data["track_uri"]]
                    if spotify_track.album_images:
                        # Get medium size image (usually index 1) or first available
                        image_url = spotify_track.album_images[1].url if len(spotify_track.album_images) > 1 else spotify_track.album_images[0].url
                        track_data["image_url"] = image_url
        
        except Exception as e:
            print(f"Batch track fetching failed, falling back to individual searches: {e}")
            # Fallback to individual searches if batch fails
            for track_data in track_data_list:
                try:
                    spotify_track = await spotify_service.search_track(
                        track_data["track_name"], 
                        track_data["artist_name"], 
                        refresh_cache=refresh_cache
                    )
                    if spotify_track and spotify_track.album_images:
                        image_url = spotify_track.album_images[1].url if len(spotify_track.album_images) > 1 else spotify_track.album_images[0].url
                        track_data["image_url"] = image_url
                except Exception as e2:
                    print(f"Failed to fetch image for track {track_data['track_name']}: {e2}")
                    pass
    
    # Remove internal track_uri field
    for track_data in track_data_list:
        track_data.pop("track_uri", None)
    
    return track_data_list

@router.get("/cache/stats")
async def get_cache_stats():
    return spotify_service.get_cache_stats()

@router.post("/cache/clear-null")
async def clear_null_caches():
    spotify_service.clear_null_caches()
    return {"message": "Null cache entries cleared", "stats": spotify_service.get_cache_stats()}

def _get_cutoff_date(period: str) -> Optional[datetime]:
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