from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, extract
from database.connection import get_db
from database.schema import SpotifyStream, Artist
from services.spotify_service import spotify_service
from services.spotify_batch_service import spotify_batch_service
from typing import Optional, List, Dict
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel, Field, field_validator, computed_field, ConfigDict
from enum import Enum

router = APIRouter()


# Enums
class TimePeriod(str, Enum):
    SEVEN_DAYS = "7d"
    ONE_MONTH = "1m"
    THREE_MONTHS = "3m"
    SIX_MONTHS = "6m"
    ONE_YEAR = "1y"
    ALL_TIME = "all_time"


# Base models
class TrackInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    track_name: str = Field(..., min_length=1, max_length=500, description="Track name")
    artist_name: str = Field(..., min_length=1, max_length=500, description="Artist name")
    
    @field_validator('track_name', 'artist_name')
    @classmethod
    def validate_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError('Field cannot be empty or whitespace only')
        return v.strip()


class ImageRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    
    artists: Optional[List[str]] = Field(
        None, 
        description="List of artist names to fetch images for",
        max_length=100
    )
    tracks: Optional[List[TrackInfo]] = Field(
        None,
        description="List of tracks to fetch album artwork for",
        max_length=100
    )
    
    @field_validator('artists')
    @classmethod
    def validate_artists(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is not None:
            if not v:
                raise ValueError('Artists list cannot be empty if provided')
            cleaned = [artist.strip() for artist in v if artist and artist.strip()]
            if not cleaned:
                raise ValueError('Artists list must contain at least one non-empty artist name')
            if len(set(cleaned)) != len(cleaned):
                raise ValueError('Duplicate artist names are not allowed')
            return cleaned
        return v
    
    @field_validator('tracks')
    @classmethod
    def validate_tracks(cls, v: Optional[List[TrackInfo]]) -> Optional[List[TrackInfo]]:
        if v is not None and not v:
            raise ValueError('Tracks list cannot be empty if provided')
        return v


# Query parameter models
class TopArtistsQuery(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    period: str = Field(
        "all_time", 
        description="Time period: 7d, 1m, 3m, 6m, 1y, all_time, or year (e.g., 2024)"
    )
    limit: int = Field(
        50, 
        ge=1, 
        le=500, 
        description="Number of results to return"
    )
    include_images: bool = Field(
        False, 
        description="Include artist images from Spotify API"
    )
    refresh_cache: bool = Field(
        False, 
        description="Force refresh of cached image data"
    )
    
    @field_validator('period')
    @classmethod
    def validate_period(cls, v: str) -> str:
        valid_periods = {"7d", "1m", "3m", "6m", "1y", "all_time"}
        if v not in valid_periods and not (v.isdigit() and len(v) == 4):
            raise ValueError(f'Period must be one of {valid_periods} or a 4-digit year')
        return v


class TopTracksQuery(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    period: str = Field(
        "all_time", 
        description="Time period: 7d, 1m, 3m, 6m, 1y, all_time, or year (e.g., 2024)"
    )
    limit: int = Field(
        50, 
        ge=1, 
        le=500, 
        description="Number of results to return"
    )
    include_images: bool = Field(
        False, 
        description="Include album artwork from Spotify API"
    )
    refresh_cache: bool = Field(
        False, 
        description="Force refresh of cached image data"
    )
    
    @field_validator('period')
    @classmethod
    def validate_period(cls, v: str) -> str:
        valid_periods = {"7d", "1m", "3m", "6m", "1y", "all_time"}
        if v not in valid_periods and not (v.isdigit() and len(v) == 4):
            raise ValueError(f'Period must be one of {valid_periods} or a 4-digit year')
        return v


# Response models
class ArtistData(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    artist_name: str = Field(..., description="Artist name")
    total_ms: int = Field(..., description="Total milliseconds played")
    play_count: int = Field(..., description="Number of times played")
    image_url: Optional[str] = Field(None, description="Artist image URL from Spotify")
    genres: Optional[List[str]] = Field(None, description="Artist genres from Spotify")
    
    @computed_field
    @property
    def total_hours(self) -> float:
        return round(self.total_ms / (1000 * 60 * 60), 1)
    
    @computed_field
    @property
    def total_minutes(self) -> float:
        return round(self.total_ms / (1000 * 60), 1)
    
    @computed_field
    @property
    def average_play_duration_ms(self) -> float:
        return round(self.total_ms / self.play_count if self.play_count > 0 else 0, 1)


class TrackData(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    track_name: str = Field(..., description="Track name")
    artist_name: str = Field(..., description="Artist name")
    album_name: str = Field(..., description="Album name")
    total_ms: int = Field(..., description="Total milliseconds played")
    play_count: int = Field(..., description="Number of times played")
    image_url: Optional[str] = Field(None, description="Album artwork URL from Spotify")
    
    @computed_field
    @property
    def total_hours(self) -> float:
        return round(self.total_ms / (1000 * 60 * 60), 1)
    
    @computed_field
    @property
    def total_minutes(self) -> float:
        return round(self.total_ms / (1000 * 60), 1)
    
    @computed_field
    @property
    def average_play_duration_ms(self) -> float:
        return round(self.total_ms / self.play_count if self.play_count > 0 else 0, 1)


class ImageBatchResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    artist_images: Dict[str, Optional[str]] = Field(
        ..., 
        description="Mapping of artist names to their image URLs"
    )
    track_images: Dict[str, Optional[str]] = Field(
        ..., 
        description="Mapping of track keys to their album artwork URLs"
    )


class CacheStats(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    total_entries: int = Field(..., description="Total number of cache entries")
    artist_cache_size: int = Field(..., description="Number of artist cache entries")
    track_cache_size: int = Field(..., description="Number of track cache entries")
    null_entries: int = Field(..., description="Number of null cache entries")
    cache_hit_rate: Optional[float] = Field(None, description="Cache hit rate percentage")


class CacheClearResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    message: str = Field(..., description="Success message")
    stats: CacheStats = Field(..., description="Updated cache statistics")


# Error response models
class ErrorDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    field: Optional[str] = Field(None, description="Field that caused the error")
    message: str = Field(..., description="Error message")
    error_code: Optional[str] = Field(None, description="Application-specific error code")


class ErrorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    detail: str = Field(..., description="Main error message")
    errors: Optional[List[ErrorDetail]] = Field(None, description="Detailed validation errors")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    @computed_field
    @property
    def error_count(self) -> int:
        return len(self.errors) if self.errors else 0


@router.post("/images/batch", response_model=ImageBatchResponse)
async def get_batch_images(request: ImageRequest) -> ImageBatchResponse:
    results = {
        "artist_images": {},
        "track_images": {}
    }
    
    # Fetch artist images using optimized batch approach
    if request.artists:
        try:
            # Use the optimized batch approach with database + batch API
            artist_batch_data = await spotify_service.get_artists_batch_by_names(request.artists)
            
            for artist_name in request.artists:
                if artist_name in artist_batch_data:
                    spotify_artist = artist_batch_data[artist_name]
                    if spotify_artist.images:
                        image_url = spotify_artist.images[1].url if len(spotify_artist.images) > 1 else spotify_artist.images[0].url
                        results["artist_images"][artist_name] = image_url
                    else:
                        results["artist_images"][artist_name] = None
                else:
                    results["artist_images"][artist_name] = None
        except Exception as e:
            print(f"Batch artist fetching failed: {e}")
            # Fallback to individual searches
            for artist_name in request.artists:
                try:
                    spotify_artist = await spotify_service.search_artist(artist_name)
                    if spotify_artist and spotify_artist.images:
                        image_url = spotify_artist.images[1].url if len(spotify_artist.images) > 1 else spotify_artist.images[0].url
                        results["artist_images"][artist_name] = image_url
                    else:
                        results["artist_images"][artist_name] = None
                except Exception as e2:
                    print(f"Failed to fetch image for artist {artist_name}: {e2}")
                    results["artist_images"][artist_name] = None
    
    # Fetch track images
    if request.tracks:
        for track_info in request.tracks:
            track_name = track_info.track_name
            artist_name = track_info.artist_name
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
    
    return ImageBatchResponse(**results)

@router.get("/top/artists", response_model=List[ArtistData])
async def get_top_artists(
    db: Session = Depends(get_db),
    period: str = Query("all_time", description="Time period: 7d, 1m, 3m, 6m, 1y, all_time, or year (e.g., 2024)"),
    limit: int = Query(50, ge=1, le=500, description="Number of results to return"),
    include_images: bool = Query(False, description="Include artist images from Spotify API"),
    refresh_cache: bool = Query(False, description="Force refresh of cached image data")
) -> List[ArtistData]:
    
    # Validate query parameters
    try:
        query_params = TopArtistsQuery(
            period=period,
            limit=limit,
            include_images=include_images,
            refresh_cache=refresh_cache
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    
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
    ).limit(query_params.limit).all()
    
    # Basic artist data using Pydantic models
    artist_data_list = []
    for result in results:
        artist_data = ArtistData(
            artist_name=result.artist_name,
            total_ms=result.total_ms,
            play_count=result.play_count
        )
        artist_data_list.append(artist_data)
    
    # Only fetch images if explicitly requested
    if query_params.include_images:
        try:
            # Fast: get artist names for ID lookup
            artist_names = [artist_data.artist_name for artist_data in artist_data_list]
            
            # Fast: batch lookup of artist IDs from database
            artist_id_data = db.query(Artist.name, Artist.spotify_id).filter(
                Artist.name.in_(artist_names),
                Artist.spotify_id.isnot(None)
            ).all()
            
            # Create name -> ID mapping
            name_to_id = {artist.name: artist.spotify_id for artist in artist_id_data}
            artist_ids = list(name_to_id.values())
            
            if artist_ids:
                # Batch API call
                batch_artists = await spotify_batch_service.get_several_artists(artist_ids)
                spotify_artist_map = {artist.id: artist for artist in batch_artists}
                
                # Update artist data with images and genres
                for artist_data in artist_data_list:
                    artist_name = artist_data.artist_name
                    if artist_name in name_to_id:
                        spotify_id = name_to_id[artist_name]
                        if spotify_id in spotify_artist_map:
                            spotify_artist = spotify_artist_map[spotify_id]
                            artist_data.genres = spotify_artist.genres
                            if spotify_artist.images:
                                image_url = (spotify_artist.images[1].url if len(spotify_artist.images) > 1 
                                           else spotify_artist.images[0].url)
                                artist_data.image_url = image_url
        
        except Exception as e:
            print(f"Database + batch artist fetching failed, falling back to individual searches: {e}")
            # Fallback to individual searches if batch fails
            for artist_data in artist_data_list:
                try:
                    spotify_artist = await spotify_service.search_artist(
                        artist_data.artist_name, 
                        refresh_cache=query_params.refresh_cache
                    )
                    if spotify_artist and spotify_artist.images:
                        image_url = spotify_artist.images[1].url if len(spotify_artist.images) > 1 else spotify_artist.images[0].url
                        artist_data.image_url = image_url
                except Exception as e2:
                    print(f"Failed to fetch image for artist {artist_data.artist_name}: {e2}")
                    pass
    
    return artist_data_list

@router.get("/top/tracks", response_model=List[TrackData])
async def get_top_tracks(
    db: Session = Depends(get_db),
    period: str = Query("all_time", description="Time period: 7d, 1m, 3m, 6m, 1y, all_time, or year (e.g., 2024)"),
    limit: int = Query(50, ge=1, le=500, description="Number of results to return"),
    include_images: bool = Query(False, description="Include album artwork from Spotify API"),
    refresh_cache: bool = Query(False, description="Force refresh of cached image data")
) -> List[TrackData]:
    
    # Validate query parameters
    try:
        query_params = TopTracksQuery(
            period=period,
            limit=limit,
            include_images=include_images,
            refresh_cache=refresh_cache
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    
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
    if query_params.period != "all_time":
        # Check if period is a year (4 digits)
        if query_params.period.isdigit() and len(query_params.period) == 4:
            year = int(query_params.period)
            query = query.filter(extract('year', SpotifyStream.ts) == year)
        else:
            cutoff_date = _get_cutoff_date(query_params.period)
            if cutoff_date:
                query = query.filter(SpotifyStream.ts >= cutoff_date)
    
    results = query.group_by(
        SpotifyStream.master_metadata_track_name,
        SpotifyStream.master_metadata_album_artist_name,
        SpotifyStream.master_metadata_album_album_name,
        SpotifyStream.spotify_track_uri
    ).order_by(
        desc('total_ms')
    ).limit(query_params.limit).all()
    
    # Basic track data using Pydantic models
    track_data_list = []
    track_uris = []
    
    for result in results:
        track_data = TrackData(
            track_name=result.track_name,
            artist_name=result.artist_name,
            album_name=result.album_name,
            total_ms=result.total_ms,
            play_count=result.play_count
        )
        track_data_list.append(track_data)
        if result.track_uri:
            track_uris.append(result.track_uri)
    
    # Only fetch images if explicitly requested
    if query_params.include_images:
        try:
            # Batch API using existing URIs - ~50x faster than individual searches
            batch_tracks = await spotify_batch_service.get_tracks_from_uris(track_uris)
            
            track_lookup = {f"spotify:track:{track.id}": track for track in batch_tracks}
            for i, track_data in enumerate(track_data_list):
                track_uri = track_uris[i] if i < len(track_uris) else None
                if track_uri in track_lookup:
                    spotify_track = track_lookup[track_uri]
                    if spotify_track.album_images:
                        # Get medium size image (usually index 1) or first available
                        image_url = spotify_track.album_images[1].url if len(spotify_track.album_images) > 1 else spotify_track.album_images[0].url
                        track_data.image_url = image_url
        
        except Exception as e:
            print(f"Batch track fetching failed, falling back to individual searches: {e}")
            # Fallback to individual searches if batch fails
            for track_data in track_data_list:
                try:
                    spotify_track = await spotify_service.search_track(
                        track_data.track_name, 
                        track_data.artist_name, 
                        refresh_cache=query_params.refresh_cache
                    )
                    if spotify_track and spotify_track.album_images:
                        image_url = spotify_track.album_images[1].url if len(spotify_track.album_images) > 1 else spotify_track.album_images[0].url
                        track_data.image_url = image_url
                except Exception as e2:
                    print(f"Failed to fetch image for track {track_data.track_name}: {e2}")
                    pass
    
    return track_data_list

@router.get("/cache/stats", response_model=CacheStats)
async def get_cache_stats() -> CacheStats:
    cache_stats = spotify_service.get_cache_stats()
    return CacheStats(**cache_stats)

@router.post("/cache/clear-null", response_model=CacheClearResponse)
async def clear_null_caches() -> CacheClearResponse:
    spotify_service.clear_null_caches()
    updated_stats = spotify_service.get_cache_stats()
    return CacheClearResponse(
        message="Null cache entries cleared",
        stats=CacheStats(**updated_stats)
    )

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