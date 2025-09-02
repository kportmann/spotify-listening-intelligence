from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, case
from database.connection import get_db
from database.schema import SpotifyStream
from pydantic import BaseModel, Field, field_validator, computed_field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone as dt_timezone
from enum import Enum

router = APIRouter()

# Enums
class Season(str, Enum):
    SPRING = "Spring"
    SUMMER = "Summer"
    FALL = "Fall"
    WINTER = "Winter"

class DayOfWeek(str, Enum):
    MONDAY = "Monday"
    TUESDAY = "Tuesday"
    WEDNESDAY = "Wednesday"
    THURSDAY = "Thursday"
    FRIDAY = "Friday"
    SATURDAY = "Saturday"
    SUNDAY = "Sunday"

# Query parameter models
class ListeningAnalyticsQuery(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    year: Optional[int] = Field(
        None, 
        ge=2000, 
        le=2100, 
        description="Optional year filter"
    )
    timezone: str = Field(
        "UTC", 
        description="Timezone for conversion (e.g., 'Europe/Zurich', 'America/New_York', 'UTC')"
    )
    
    @field_validator('timezone')
    @classmethod
    def validate_timezone(cls, v: str) -> str:
        # Basic timezone validation - you could expand this with pytz
        valid_timezones = [
            "UTC", "Europe/Zurich", "America/New_York", "America/Los_Angeles",
            "Europe/London", "Asia/Tokyo", "Australia/Sydney"
        ]
        if v not in valid_timezones and not v.startswith(('America/', 'Europe/', 'Asia/', 'Australia/', 'UTC')):
            raise ValueError(f'Invalid timezone. Common timezones: {valid_timezones}')
        return v


# Response models
class HourData(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    stream_count: int = Field(..., description="Number of streams in this hour")
    total_ms: int = Field(..., description="Total milliseconds played in this hour")
    
    @computed_field
    @property
    def total_minutes(self) -> int:
        return round(self.total_ms / (1000 * 60))

class PeakHourInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    day: DayOfWeek = Field(..., description="Day of the week")
    hour: int = Field(..., ge=0, le=23, description="Hour of day (0-23)")
    stream_count: int = Field(..., description="Number of streams")
    total_minutes: int = Field(..., description="Total minutes played")

class HeatmapSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    total_streams: int = Field(..., description="Total streams across all time periods")
    peak_hour: Optional[PeakHourInfo] = Field(None, description="Peak listening hour information")

class HeatmapMaxValues(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    streams: int = Field(..., description="Maximum streams in any hour")
    minutes: int = Field(..., description="Maximum minutes in any hour")

class ListeningHeatmapResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    heatmap_data: List[List[HourData]] = Field(..., description="7x24 matrix of listening data")
    day_names: List[DayOfWeek] = Field(..., description="Names of days of the week")
    max_values: HeatmapMaxValues = Field(..., description="Maximum values for visualization scaling")
    summary: HeatmapSummary = Field(..., description="Summary statistics")

class MonthlyTrendData(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    year: int = Field(..., description="Year")
    month: int = Field(..., ge=1, le=12, description="Month number (1-12)")
    month_name: str = Field(..., description="Month name")
    stream_count: int = Field(..., description="Number of streams")
    total_ms: int = Field(..., description="Total milliseconds played")
    avg_ms_per_stream: float = Field(..., description="Average milliseconds per stream")
    
    @computed_field
    @property
    def total_minutes(self) -> int:
        return round(self.total_ms / (1000 * 60))
    
    @computed_field
    @property
    def avg_minutes_per_stream(self) -> float:
        return round(self.avg_ms_per_stream / (1000 * 60), 2)

class PeakMonthInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    month_name: Optional[str] = Field(None, description="Month name")
    year: Optional[int] = Field(None, description="Year")
    total_minutes: Optional[int] = Field(None, description="Total minutes")
    stream_count: Optional[int] = Field(None, description="Stream count")

class PeakMonthData(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    by_minutes: PeakMonthInfo = Field(..., description="Peak month by minutes")
    by_streams: PeakMonthInfo = Field(..., description="Peak month by streams")

class MonthlyTrendsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    monthly_trends: List[MonthlyTrendData] = Field(..., description="Monthly listening trends data")
    total_months: int = Field(..., description="Number of months covered")
    peak_month: PeakMonthData = Field(..., description="Peak month information")

class SeasonalTrendData(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    season: Season = Field(..., description="Season name")
    total_streams: int = Field(..., description="Total streams in this season")
    total_ms: int = Field(..., description="Total milliseconds played")
    years_covered: int = Field(..., description="Number of years with data for this season")
    avg_streams_per_year: int = Field(..., description="Average streams per year")
    avg_minutes_per_year: int = Field(..., description="Average minutes per year")
    
    @computed_field
    @property
    def total_minutes(self) -> int:
        return round(self.total_ms / (1000 * 60))

class PeakSeasonInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    season: Optional[Season] = Field(None, description="Season name")
    total_minutes: Optional[int] = Field(None, description="Total minutes")
    total_streams: Optional[int] = Field(None, description="Total streams")

class PeakSeasonData(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    by_minutes: PeakSeasonInfo = Field(..., description="Peak season by minutes")
    by_streams: PeakSeasonInfo = Field(..., description="Peak season by streams")

class SeasonalTrendsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    seasonal_trends: List[SeasonalTrendData] = Field(..., description="Seasonal listening trends data")
    peak_season: PeakSeasonData = Field(..., description="Peak season information")








# Error response models
class ErrorDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    field: Optional[str] = Field(None, description="Field that caused the error")
    message: str = Field(..., description="Error message")

class ErrorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    detail: str = Field(..., description="Main error message")
    errors: Optional[List[ErrorDetail]] = Field(None, description="Detailed validation errors")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(dt_timezone.utc))

@router.get("/listening-heatmap", response_model=ListeningHeatmapResponse)
async def get_listening_heatmap(
    year: Optional[int] = None, 
    timezone: str = "UTC", 
    db: Session = Depends(get_db)
) -> ListeningHeatmapResponse:
    """Get listening heatmap data organized by hour of day and day of week"""
    
    # Validate parameters
    try:
        query_params = ListeningAnalyticsQuery(year=year, timezone=timezone)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    
    # Base query with optional year filter
    base_query = db.query(SpotifyStream).filter(
      SpotifyStream.spotify_track_uri.isnot(None)
      )
    
    if query_params.year:
        base_query = base_query.filter(extract('year', SpotifyStream.ts) == query_params.year)
    
    # Convert timestamps to specified timezone for analysis
    if query_params.timezone == "UTC":
        # Use timestamps as-is (they're already in UTC)
        ts_converted = SpotifyStream.ts
    else:
        # Convert UTC timestamps to specified timezone
        ts_converted = func.timezone(query_params.timezone, SpotifyStream.ts)
    
    # Get listening data grouped by day of week (0=Monday) and hour of day
    heatmap_data = base_query.with_entities(
        extract('dow', ts_converted).label('day_of_week'),  # 0=Sunday, 1=Monday, etc.
        extract('hour', ts_converted).label('hour_of_day'),
        func.count(SpotifyStream.id).label('stream_count'),
        func.sum(SpotifyStream.ms_played).label('total_ms')
    ).group_by(
        extract('dow', ts_converted),
        extract('hour', ts_converted)
    ).all()
    
    # Initialize 7x24 matrix (7 days x 24 hours)
    # Convert Sunday (0) to index 6, Monday (1) to 0, etc.
    heatmap_matrix = []
    day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    
    for day_idx in range(7):  # Days: Mon=0 to Sun=6
        day_data = []
        for hour in range(24):  # Hours: 0-23
            day_data.append(HourData(stream_count=0, total_ms=0))
        heatmap_matrix.append(day_data)
    
    # Fill the matrix with actual data
    max_streams = 0
    max_minutes = 0
    
    for row in heatmap_data:
        dow_postgres = int(row.day_of_week)  # PostgreSQL: 0=Sunday, 1=Monday, ..., 6=Saturday
        # Convert PostgreSQL day of week to our array index (Monday=0, Sunday=6)
        day_idx = (dow_postgres + 6) % 7  # Sunday(0)->6, Monday(1)->0, Tuesday(2)->1, etc.
        hour = int(row.hour_of_day)
        
        stream_count = row.stream_count or 0
        total_ms = row.total_ms or 0
        total_minutes = round(total_ms / (1000 * 60))
        
        heatmap_matrix[day_idx][hour] = HourData(
            stream_count=stream_count,
            total_ms=total_ms
        )
        
        max_streams = max(max_streams, stream_count)
        max_minutes = max(max_minutes, total_minutes)
    
    # Calculate summary statistics
    total_streams = sum(row.stream_count for row in heatmap_data)
    peak_hour_data = max(heatmap_data, key=lambda x: x.stream_count) if heatmap_data else None
    
    peak_hour_info = None
    if peak_hour_data:
        dow_postgres = int(peak_hour_data.day_of_week)
        day_idx = (dow_postgres + 6) % 7
        peak_hour_info = PeakHourInfo(
            day=day_names[day_idx],
            hour=int(peak_hour_data.hour_of_day),
            stream_count=peak_hour_data.stream_count,
            total_minutes=round(peak_hour_data.total_ms / (1000 * 60))
        )
    
    return ListeningHeatmapResponse(
        heatmap_data=heatmap_matrix,
        day_names=[DayOfWeek(day) for day in day_names],
        max_values=HeatmapMaxValues(
            streams=max_streams,
            minutes=max_minutes
        ),
        summary=HeatmapSummary(
            total_streams=total_streams,
            peak_hour=peak_hour_info
        )
    )


@router.get("/monthly-trends", response_model=MonthlyTrendsResponse)
async def get_monthly_trends(
    year: Optional[int] = None, 
    timezone: str = "UTC", 
    db: Session = Depends(get_db)
) -> MonthlyTrendsResponse:
    """Get monthly listening trends showing activity by month"""
    
    # Validate parameters
    try:
        query_params = ListeningAnalyticsQuery(year=year, timezone=timezone)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    
    # Base query
    base_query = db.query(SpotifyStream).filter(
        SpotifyStream.spotify_track_uri.isnot(None)
    )
    
    if year:
        base_query = base_query.filter(extract('year', SpotifyStream.ts) == year)
    
    # Convert timestamps to specified timezone for analysis
    if timezone == "UTC":
        ts_converted = SpotifyStream.ts
    else:
        ts_converted = func.timezone(timezone, SpotifyStream.ts)
    
    # Get monthly data
    monthly_data = base_query.with_entities(
        extract('year', ts_converted).label('year'),
        extract('month', ts_converted).label('month'),
        func.count(SpotifyStream.id).label('stream_count'),
        func.sum(SpotifyStream.ms_played).label('total_ms'),
        func.avg(SpotifyStream.ms_played).label('avg_ms_per_stream')
    ).group_by(
        extract('year', ts_converted),
        extract('month', ts_converted)
    ).order_by(
        extract('year', ts_converted),
        extract('month', ts_converted)
    ).all()
    
    # Format the data
    monthly_trends = []
    month_names = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ]
    
    for row in monthly_data:
        total_ms = row.total_ms or 0
        avg_ms_per_stream = row.avg_ms_per_stream or 0
        
        monthly_trends.append(MonthlyTrendData(
            year=int(row.year),
            month=int(row.month),
            month_name=month_names[int(row.month) - 1],
            stream_count=row.stream_count,
            total_ms=total_ms,
            avg_ms_per_stream=avg_ms_per_stream
        ))
    
    # Calculate peak month by minutes and streams
    peak_month_by_minutes = None
    peak_month_by_streams = None
    
    if monthly_trends:
        peak_month_by_minutes = max(monthly_trends, key=lambda x: x.total_minutes)
        peak_month_by_streams = max(monthly_trends, key=lambda x: x.stream_count)
    
    return MonthlyTrendsResponse(
        monthly_trends=monthly_trends,
        total_months=len(monthly_trends),
        peak_month=PeakMonthData(
            by_minutes=PeakMonthInfo(
                month_name=peak_month_by_minutes.month_name if peak_month_by_minutes else None,
                year=peak_month_by_minutes.year if peak_month_by_minutes else None,
                total_minutes=peak_month_by_minutes.total_minutes if peak_month_by_minutes else None,
                stream_count=None
            ),
            by_streams=PeakMonthInfo(
                month_name=peak_month_by_streams.month_name if peak_month_by_streams else None,
                year=peak_month_by_streams.year if peak_month_by_streams else None,
                total_minutes=None,
                stream_count=peak_month_by_streams.stream_count if peak_month_by_streams else None
            )
        )
    )

@router.get("/seasonal-trends", response_model=SeasonalTrendsResponse)
async def get_seasonal_trends(
    year: Optional[int] = None, 
    timezone: str = "UTC", 
    db: Session = Depends(get_db)
) -> SeasonalTrendsResponse:
    """Get seasonal listening trends (Spring, Summer, Fall, Winter)"""
    
    # Validate parameters
    try:
        query_params = ListeningAnalyticsQuery(year=year, timezone=timezone)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    
    # Base query
    base_query = db.query(SpotifyStream).filter(
        SpotifyStream.spotify_track_uri.isnot(None)
    )
    
    if year:
        base_query = base_query.filter(extract('year', SpotifyStream.ts) == year)
    
    # Convert timestamps to specified timezone for analysis
    if timezone == "UTC":
        ts_converted = SpotifyStream.ts
    else:
        ts_converted = func.timezone(timezone, SpotifyStream.ts)
    
    # Get data grouped by month first
    monthly_data = base_query.with_entities(
        extract('year', ts_converted).label('year'),
        extract('month', ts_converted).label('month'),
        func.count(SpotifyStream.id).label('stream_count'),
        func.sum(SpotifyStream.ms_played).label('total_ms')
    ).group_by(
        extract('year', ts_converted),
        extract('month', ts_converted)
    ).all()
    
    # Group by seasons
    # Spring: March, April, May (3, 4, 5)
    # Summer: June, July, August (6, 7, 8)
    # Fall: September, October, November (9, 10, 11)
    # Winter: December, January, February (12, 1, 2)
    
    seasonal_data = {
        'Spring': {'stream_count': 0, 'total_ms': 0, 'years': set()},
        'Summer': {'stream_count': 0, 'total_ms': 0, 'years': set()},
        'Fall': {'stream_count': 0, 'total_ms': 0, 'years': set()},
        'Winter': {'stream_count': 0, 'total_ms': 0, 'years': set()}
    }
    
    for row in monthly_data:
        month = int(row.month)
        stream_count = row.stream_count or 0
        total_ms = row.total_ms or 0
        year = int(row.year)
        
        if month in [3, 4, 5]:  # Spring
            seasonal_data['Spring']['stream_count'] += stream_count
            seasonal_data['Spring']['total_ms'] += total_ms
            seasonal_data['Spring']['years'].add(year)
        elif month in [6, 7, 8]:  # Summer
            seasonal_data['Summer']['stream_count'] += stream_count
            seasonal_data['Summer']['total_ms'] += total_ms
            seasonal_data['Summer']['years'].add(year)
        elif month in [9, 10, 11]:  # Fall
            seasonal_data['Fall']['stream_count'] += stream_count
            seasonal_data['Fall']['total_ms'] += total_ms
            seasonal_data['Fall']['years'].add(year)
        else:  # Winter (12, 1, 2)
            seasonal_data['Winter']['stream_count'] += stream_count
            seasonal_data['Winter']['total_ms'] += total_ms
            seasonal_data['Winter']['years'].add(year)
    
    # Format the results
    seasonal_trends = []
    for season, data in seasonal_data.items():
        avg_streams_per_year = data['stream_count'] / max(len(data['years']), 1)
        total_minutes = round(data['total_ms'] / (1000 * 60))
        avg_minutes_per_year = total_minutes / max(len(data['years']), 1)
        
        seasonal_trends.append(SeasonalTrendData(
            season=Season(season),
            total_streams=data['stream_count'],
            total_ms=data['total_ms'],
            years_covered=len(data['years']),
            avg_streams_per_year=round(avg_streams_per_year),
            avg_minutes_per_year=round(avg_minutes_per_year)
        ))
    
    # Calculate peak season by minutes and streams
    peak_season_by_minutes = None
    peak_season_by_streams = None
    
    if seasonal_trends:
        peak_season_by_minutes = max(seasonal_trends, key=lambda x: x.total_minutes)
        peak_season_by_streams = max(seasonal_trends, key=lambda x: x.total_streams)
    
    return SeasonalTrendsResponse(
        seasonal_trends=seasonal_trends,
        peak_season=PeakSeasonData(
            by_minutes=PeakSeasonInfo(
                season=peak_season_by_minutes.season if peak_season_by_minutes else None,
                total_minutes=peak_season_by_minutes.total_minutes if peak_season_by_minutes else None,
                total_streams=None
            ),
            by_streams=PeakSeasonInfo(
                season=peak_season_by_streams.season if peak_season_by_streams else None,
                total_minutes=None,
                total_streams=peak_season_by_streams.total_streams if peak_season_by_streams else None
            )
        )
    )

