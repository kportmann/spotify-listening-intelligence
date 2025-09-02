from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, extract
from database.connection import get_db
from database.schema import SpotifyStream
from services.spotify_service import spotify_service
from typing import Optional, List, Dict
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel, Field, field_validator, computed_field, ConfigDict

router = APIRouter()

# Query parameter models
class PodcastQuery(BaseModel):
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
        description="Include images from Spotify API"
    )
    
    @field_validator('period')
    @classmethod
    def validate_period(cls, v: str) -> str:
        valid_periods = {"7d", "1m", "3m", "6m", "1y", "all_time"}
        if v not in valid_periods and not (v.isdigit() and len(v) == 4):
            raise ValueError(f'Period must be one of {valid_periods} or a 4-digit year')
        return v

# Image request models
class EpisodeInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    episode_name: str = Field(..., min_length=1, max_length=500, description="Episode name")
    show_name: Optional[str] = Field(None, max_length=500, description="Show name")
    
    @field_validator('episode_name')
    @classmethod
    def validate_episode_name(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError('Episode name cannot be empty')
        return v.strip()

class PodcastImageRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    episodes: Optional[List[EpisodeInfo]] = Field(
        None, 
        description="List of episodes to fetch images for",
        max_length=100
    )
    shows: Optional[List[str]] = Field(
        None,
        description="List of show names to fetch images for", 
        max_length=100
    )
    
    @field_validator('shows')
    @classmethod
    def validate_shows(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is not None:
            if not v:
                raise ValueError('Shows list cannot be empty if provided')
            cleaned = [show.strip() for show in v if show and show.strip()]
            if not cleaned:
                raise ValueError('Shows list must contain at least one non-empty show name')
            return cleaned
        return v

# Response models  
class EpisodeData(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    episode_name: str = Field(..., description="Episode name")
    show_name: Optional[str] = Field(None, description="Show name")
    total_ms: int = Field(..., description="Total milliseconds played")
    play_count: int = Field(..., description="Number of times played")
    image_url: Optional[str] = Field(None, description="Episode image URL from Spotify")
    
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

class ShowData(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    show_name: str = Field(..., description="Show name")
    total_ms: int = Field(..., description="Total milliseconds played")
    play_count: int = Field(..., description="Number of episodes played")
    image_url: Optional[str] = Field(None, description="Show image URL from Spotify")
    
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
    def average_episode_duration_ms(self) -> float:
        return round(self.total_ms / self.play_count if self.play_count > 0 else 0, 1)

class AudiobookData(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    audiobook_title: str = Field(..., description="Audiobook title")
    total_ms: int = Field(..., description="Total milliseconds played")
    play_count: int = Field(..., description="Number of times played")
    
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

class PodcastImageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    episode_images: Dict[str, Optional[str]] = Field(
        ..., 
        description="Mapping of episode keys to their image URLs"
    )
    show_images: Dict[str, Optional[str]] = Field(
        ..., 
        description="Mapping of show names to their image URLs"
    )


@router.post("/images/batch", response_model=PodcastImageResponse)
async def get_batch_podcast_images(request: PodcastImageRequest) -> PodcastImageResponse:
    results = {
        "episode_images": {},
        "show_images": {}
    }
    
    # Fetch episode images
    if request.episodes:
        for episode_info in request.episodes:
            episode_name = episode_info.episode_name
            show_name = episode_info.show_name
            key = f"{episode_name}|{show_name or ''}"
            
            try:
                spotify_episode = await spotify_service.search_episode(episode_name, show_name)
                if spotify_episode and spotify_episode.images:
                    image_url = spotify_episode.images[1].url if len(spotify_episode.images) > 1 else spotify_episode.images[0].url
                    results["episode_images"][key] = image_url
                else:
                    results["episode_images"][key] = None
            except Exception as e:
                print(f"Failed to fetch image for episode {episode_name}: {e}")
                results["episode_images"][key] = None
    
    # Fetch show images
    if request.shows:
        for show_name in request.shows:
            try:
                spotify_show = await spotify_service.search_show(show_name)
                if spotify_show and spotify_show.images:
                    image_url = spotify_show.images[1].url if len(spotify_show.images) > 1 else spotify_show.images[0].url
                    results["show_images"][show_name] = image_url
                else:
                    results["show_images"][show_name] = None
            except Exception as e:
                print(f"Failed to fetch image for show {show_name}: {e}")
                results["show_images"][show_name] = None
    
    return PodcastImageResponse(**results)


@router.get("/top/episodes", response_model=List[EpisodeData])
async def get_top_episodes(
    db: Session = Depends(get_db),
    period: str = Query("all_time", description="Time period: 7d, 1m, 3m, 6m, 1y, all_time, or year (e.g., 2024)"),
    limit: int = Query(50, ge=1, le=500, description="Number of results to return"),
    include_images: bool = Query(False, description="Include episode images from Spotify API")
) -> List[EpisodeData]:
    
    # Validate parameters
    try:
        query_params = PodcastQuery(period=period, limit=limit, include_images=include_images)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    
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
        SpotifyStream.episode_name,
        SpotifyStream.episode_show_name
    ).order_by(
        desc('total_ms')
    ).limit(query_params.limit).all()
    
    # Basic episode data using Pydantic models
    episode_data_list = []
    for result in results:
        episode_data = EpisodeData(
            episode_name=result.episode_name,
            show_name=result.show_name,
            total_ms=result.total_ms,
            play_count=result.play_count
        )
        episode_data_list.append(episode_data)
    
    # Only fetch images if explicitly requested
    if query_params.include_images:
        for episode_data in episode_data_list:
            try:
                spotify_episode = await spotify_service.search_episode(
                    episode_data.episode_name, 
                    episode_data.show_name
                )
                if spotify_episode and spotify_episode.images:
                    image_url = spotify_episode.images[1].url if len(spotify_episode.images) > 1 else spotify_episode.images[0].url
                    episode_data.image_url = image_url
            except Exception as e:
                # Continue without image if Spotify API fails
                print(f"Failed to fetch image for episode {episode_data.episode_name}: {e}")
                pass
    
    return episode_data_list


@router.get("/top/shows", response_model=List[ShowData])
async def get_top_shows(
    db: Session = Depends(get_db),
    period: str = Query("all_time", description="Time period: 7d, 1m, 3m, 6m, 1y, all_time, or year (e.g., 2024)"),
    limit: int = Query(50, ge=1, le=500, description="Number of results to return"),
    include_images: bool = Query(False, description="Include show images from Spotify API")
) -> List[ShowData]:
    
    # Validate parameters
    try:
        query_params = PodcastQuery(period=period, limit=limit, include_images=include_images)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    
    query = db.query(
        SpotifyStream.episode_show_name.label('show_name'),
        func.sum(SpotifyStream.ms_played).label('total_ms'),
        func.count(SpotifyStream.id).label('play_count')
    ).filter(
        SpotifyStream.spotify_episode_uri.isnot(None),
        SpotifyStream.episode_show_name.isnot(None)
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
        SpotifyStream.episode_show_name
    ).order_by(
        desc('total_ms')
    ).limit(query_params.limit).all()
    
    # Basic show data using Pydantic models
    show_data_list = []
    for result in results:
        show_data = ShowData(
            show_name=result.show_name,
            total_ms=result.total_ms,
            play_count=result.play_count
        )
        show_data_list.append(show_data)
    
    # Only fetch images if explicitly requested
    if query_params.include_images:
        try:
            # Use batch show lookup by names - combines individual searches with batch API
            show_names = [show_data.show_name for show_data in show_data_list]
            batch_shows = await spotify_service.get_shows_batch_by_names(show_names)
            
            # Enhance show data with images from batch results
            for show_data in show_data_list:
                show_name = show_data.show_name
                if show_name in batch_shows:
                    spotify_show = batch_shows[show_name]
                    if spotify_show.images:
                        # Get medium size image (usually index 1) or first available
                        image_url = spotify_show.images[1].url if len(spotify_show.images) > 1 else spotify_show.images[0].url
                        show_data.image_url = image_url
        
        except Exception as e:
            print(f"Batch show fetching failed, falling back to individual searches: {e}")
            # Fallback to individual searches if batch fails
            for show_data in show_data_list:
                try:
                    spotify_show = await spotify_service.search_show(show_data.show_name)
                    if spotify_show and spotify_show.images:
                        image_url = spotify_show.images[1].url if len(spotify_show.images) > 1 else spotify_show.images[0].url
                        show_data.image_url = image_url
                except Exception as e2:
                    print(f"Failed to fetch image for show {show_data.show_name}: {e2}")
                    pass
    
    return show_data_list


@router.get("/top/audiobooks", response_model=List[AudiobookData])
async def get_top_audiobooks(
    db: Session = Depends(get_db),
    period: str = Query("all_time", description="Time period: 7d, 1m, 3m, 6m, 1y, all_time, or year (e.g., 2024)"),
    limit: int = Query(50, ge=1, le=500, description="Number of results to return")
) -> List[AudiobookData]:
    
    # Validate parameters - create PodcastQuery but only use period and limit
    try:
        query_params = PodcastQuery(period=period, limit=limit, include_images=False)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    
    query = db.query(
        SpotifyStream.audiobook_title.label('audiobook_title'),
        func.sum(SpotifyStream.ms_played).label('total_ms'),
        func.count(SpotifyStream.id).label('play_count')
    ).filter(
        SpotifyStream.audiobook_chapter_uri.isnot(None),
        SpotifyStream.audiobook_title.isnot(None)
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
        SpotifyStream.audiobook_title
    ).order_by(
        desc('total_ms')
    ).limit(query_params.limit).all()
    
    return [
        AudiobookData(
            audiobook_title=result.audiobook_title,
            total_ms=result.total_ms,
            play_count=result.play_count
        )
        for result in results
    ]


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