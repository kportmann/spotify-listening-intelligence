from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from database.connection import get_db
from database.schema import SpotifyStream
from pydantic import BaseModel, Field, field_validator, computed_field, ConfigDict, ValidationError
from typing import Optional, List

router = APIRouter()

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

# Geography Models
class GeoCountryStat(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    country: str = Field(..., min_length=2, max_length=2, description="ISO 3166-1 alpha-2 country code")
    stream_count: int = Field(..., ge=0, description="Number of streams from this country")
    total_ms: int = Field(..., ge=0, description="Total milliseconds played from this country")

    @computed_field
    @property
    def total_minutes(self) -> int:
        return round(self.total_ms / (1000 * 60))

class GeoListeningResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    countries: List[GeoCountryStat] = Field(..., description="Per-country listening stats")
    total_countries: int = Field(..., ge=0, description="Number of distinct countries")
    max_streams: int = Field(..., ge=0, description="Maximum streams among countries")
    max_minutes: int = Field(..., ge=0, description="Maximum minutes among countries")



@router.get("/geography", response_model=GeoListeningResponse)
async def get_listening_geography(
    year: Optional[int] = None,
    db: Session = Depends(get_db)
) -> GeoListeningResponse:
    """Aggregate listening by connection country (ISO alpha-2), optionally filtered by year.

    This endpoint includes all content types (music, podcasts, audiobooks).
    """

    # Validate parameters (reuse existing query model for year bounds)
    try:
        _ = ListeningAnalyticsQuery(year=year)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # Base query with optional year filter
    base_query = db.query(SpotifyStream)
    if year:
        base_query = base_query.filter(extract('year', SpotifyStream.ts) == year)

    # Aggregate by country
    rows = base_query.with_entities(
        func.upper(SpotifyStream.conn_country).label('country'),
        func.count(SpotifyStream.id).label('stream_count'),
        func.sum(SpotifyStream.ms_played).label('total_ms')
    ).group_by(
        func.upper(SpotifyStream.conn_country)
    ).order_by(
        func.sum(SpotifyStream.ms_played).desc()
    ).all()

    countries: List[GeoCountryStat] = []
    max_streams = 0
    max_minutes = 0

    for row in rows:
        total_ms = int(row.total_ms or 0)
        stream_count = int(row.stream_count or 0)
        country_code = (row.country or '').strip().upper()
        if not country_code:
            continue
        stat = GeoCountryStat(
            country=country_code,
            stream_count=stream_count,
            total_ms=total_ms
        )
        countries.append(stat)
        max_streams = max(max_streams, stream_count)
        max_minutes = max(max_minutes, stat.total_minutes)

    return GeoListeningResponse(
        countries=countries,
        total_countries=len(countries),
        max_streams=max_streams,
        max_minutes=max_minutes
    )