from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from database.connection import get_db
from database.schema import SpotifyStream
from pydantic import BaseModel, Field, computed_field, ConfigDict
from typing import Optional, List

router = APIRouter()

# Query parameter models
class StatsOverviewQuery(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    year: Optional[int] = Field(
        None, 
        ge=2000, 
        le=2100, 
        description="Optional year filter"
    )

# Response models
class TimeUnits(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    hours: int = Field(..., description="Total hours")
    days: float = Field(..., description="Total days (with decimal)")

class TimePeriod(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    first_stream: Optional[str] = Field(None, description="ISO timestamp of first stream")
    last_stream: Optional[str] = Field(None, description="ISO timestamp of last stream")
    streaming_days: int = Field(..., description="Number of days between first and last stream")

class ContentStats(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    listening_time: TimeUnits = Field(..., description="Time units breakdown")
    total_ms: int = Field(..., description="Total milliseconds played")
    stream_count: int = Field(..., description="Number of streams")
    
    @computed_field
    @property
    def average_ms_per_stream(self) -> float:
        return round(self.total_ms / self.stream_count if self.stream_count > 0 else 0, 1)

class StatsOverviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    time_period: TimePeriod = Field(..., description="Time period of the data")
    total: ContentStats = Field(..., description="Total listening statistics")
    music: ContentStats = Field(..., description="Music listening statistics")
    episodes: ContentStats = Field(..., description="Podcast episode statistics")
    audiobooks: ContentStats = Field(..., description="Audiobook statistics")

class AvailableYearsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    years: List[int] = Field(..., description="List of available years")
    total_years: int = Field(..., description="Number of available years")
    
    @computed_field
    @property
    def year_range(self) -> Optional[str]:
        if not self.years:
            return None
        return f"{min(self.years)}-{max(self.years)}" if len(self.years) > 1 else str(self.years[0])

@router.get("/stats/overview", response_model=StatsOverviewResponse)
async def get_stats_overview(
    year: Optional[int] = None, 
    db: Session = Depends(get_db)
) -> StatsOverviewResponse:
    """Get comprehensive listening statistics overview"""
    
    # Validate parameters
    try:
        query_params = StatsOverviewQuery(year=year)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    
    # Base query with optional year filter
    base_query = db.query(SpotifyStream)
    if query_params.year:
        base_query = base_query.filter(extract('year', SpotifyStream.ts) == query_params.year)
    
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
            return TimeUnits(hours=0, days=0.0)
        hours = round(ms / (1000 * 60 * 60))
        days = round(hours / 24, 1)
        return TimeUnits(hours=hours, days=days)
    
    return StatsOverviewResponse(
        time_period=TimePeriod(
            first_stream=date_range.first_stream.isoformat() if date_range.first_stream else None,
            last_stream=date_range.last_stream.isoformat() if date_range.last_stream else None,
            streaming_days=streaming_days
        ),
        total=ContentStats(
            listening_time=ms_to_time_units(total_stats.total_ms or 0),
            total_ms=total_stats.total_ms or 0,
            stream_count=total_stats.total_streams or 0
        ),
        music=ContentStats(
            listening_time=ms_to_time_units(music_stats.music_ms or 0),
            total_ms=music_stats.music_ms or 0,
            stream_count=music_stats.music_streams or 0
        ),
        episodes=ContentStats(
            listening_time=ms_to_time_units(episode_stats.episode_ms or 0),
            total_ms=episode_stats.episode_ms or 0,
            stream_count=episode_stats.episode_streams or 0
        ),
        audiobooks=ContentStats(
            listening_time=ms_to_time_units(audiobook_stats.audiobook_ms or 0),
            total_ms=audiobook_stats.audiobook_ms or 0,
            stream_count=audiobook_stats.audiobook_streams or 0
        )
    )

@router.get("/stats/available-years", response_model=AvailableYearsResponse)
async def get_available_years(db: Session = Depends(get_db)) -> AvailableYearsResponse:
    """Get list of years with streaming data"""
    
    # Get distinct years from streaming data
    years_query = db.query(
        extract('year', SpotifyStream.ts).label('year')
    ).distinct().order_by(extract('year', SpotifyStream.ts).desc())
    
    years = [int(year[0]) for year in years_query.all()]
    
    return AvailableYearsResponse(
        years=years,
        total_years=len(years)
    )