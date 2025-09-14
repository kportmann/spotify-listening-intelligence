from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from database.connection import get_db
from database.schema import SpotifyStream, Track, Artist
from pydantic import BaseModel, Field, field_validator, computed_field, ConfigDict, ValidationError
from typing import Optional, List
from services.spotify_batch_service import spotify_batch_service

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

# Top genres
class GenreStat(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    genre: str = Field(..., min_length=1)
    total_ms: int = Field(..., ge=0)
    stream_count: int = Field(..., ge=0)
    share_pct: float = Field(..., ge=0, le=100)
    
    @computed_field
    @property
    def total_minutes(self) -> int:
        return round(self.total_ms / (1000 * 60))

class TopGernesResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    genres: List[GenreStat] = Field(..., description="Top genres by listening time")
    total_genres: int = Field(..., ge=0, description="Number of distinct genres")


@router.get("/worldmap", response_model=GeoListeningResponse)
async def get_listening_worldmap(
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

@router.get("/topGenres", response_model=TopGernesResponse)
async def get_top_genres(
    year: Optional[int] = None,
    limit: int = 50,
    weighting: str = "even",
    db: Session = Depends(get_db)
) -> TopGernesResponse:
    """Get top genres by listening time, optionally filtered by year."""

    # Validate parameters
    try:
        _ = ListeningAnalyticsQuery(year=year)
        if limit < 1 or limit > 500:
            raise ValueError("limit must be between 1 and 500")
        if weighting not in {"even", "full"}:
            raise ValueError("weighting must be 'even' or 'full'")
    except (ValidationError, ValueError) as e:
        raise HTTPException(status_code=422, detail=str(e))

    # Aggregate at artist level (streams -> track -> artist)
    query = db.query(
        Artist.spotify_id.label('artist_id'),
        func.sum(SpotifyStream.ms_played).label('total_ms'),
        func.count(SpotifyStream.id).label('stream_count')
    ).select_from(SpotifyStream).join(
        Track, SpotifyStream.spotify_track_uri == Track.spotify_uri
    ).join(
        Artist, Track.artist_spotify_id == Artist.spotify_id
    ).filter(
        SpotifyStream.spotify_track_uri.isnot(None),
        SpotifyStream.ms_played >= 5000
    )

    if year is not None:
        query = query.filter(extract('year', SpotifyStream.ts) == year)

    artist_rows = query.group_by(
        Artist.spotify_id
    ).all()

    # Build mapping of artist_id -> genres, first from DB
    artist_id_to_genres = {}
    artist_ids = [row.artist_id for row in artist_rows]
    if artist_ids:
        db_artists = db.query(Artist.spotify_id, Artist.genres).filter(Artist.spotify_id.in_(artist_ids)).all()
        for spotify_id, genres in db_artists:
            if isinstance(genres, list) and len(genres) > 0:
                artist_id_to_genres[spotify_id] = genres
    missing_artist_ids = [aid for aid in artist_ids if aid not in artist_id_to_genres]

    if missing_artist_ids:
        try:
            batch_artists = await spotify_batch_service.get_several_artists(missing_artist_ids)
            spotify_id_to_artist = {artist.id: artist for artist in batch_artists}

            # Persist fetched genres back into DB for future queries
            for artist_id in missing_artist_ids:
                spotify_artist = spotify_id_to_artist.get(artist_id)
                if spotify_artist and spotify_artist.genres:
                    artist_id_to_genres[artist_id] = spotify_artist.genres
                    db_artist = db.query(Artist).filter(Artist.spotify_id == artist_id).first()
                    if db_artist:
                        db_artist.genres = spotify_artist.genres
            db.commit()
        except Exception as e:
            # If external fetch fails, proceed with available data
            pass

    # Distribute evenly across each artist's unique genres
    genre_totals = {}
    for row in artist_rows:
        genres = artist_id_to_genres.get(row.artist_id, [])
        if not isinstance(genres, list) or not genres:
            continue
        unique_genres = [g.strip().lower() for g in set(genres) if isinstance(g, str) and g.strip()]
        if not unique_genres:
            continue

        weight = 1.0 / len(unique_genres) if weighting == "even" else 1.0
        total_ms = int(row.total_ms or 0)
        stream_count = int(row.stream_count or 0)

        for g in unique_genres:
            if g not in genre_totals:
                genre_totals[g] = {'total_ms': 0, 'stream_count': 0}
            genre_totals[g]['total_ms'] += int(total_ms * weight)
            genre_totals[g]['stream_count'] += int(stream_count * weight)

    # Sort by total_ms and limit
    sorted_items = sorted(genre_totals.items(), key=lambda kv: kv[1]['total_ms'], reverse=True)[:limit]

    # Denominator: total streamed music time for the selected period (all tracks with Spotify URI)
    total_ms_all_query = db.query(func.sum(SpotifyStream.ms_played)).filter(
        SpotifyStream.spotify_track_uri.isnot(None),
        SpotifyStream.ms_played >= 5000
    )
    if year is not None:
        total_ms_all_query = total_ms_all_query.filter(extract('year', SpotifyStream.ts) == year)
    total_ms_all = int(total_ms_all_query.scalar() or 0) or 1

    genres = [
        GenreStat(
            genre=genre,
            total_ms=stats['total_ms'],
            stream_count=stats['stream_count'],
            share_pct=round((stats['total_ms'] * 100.0) / total_ms_all, 2)
        )
        for genre, stats in sorted_items
    ]

    return TopGernesResponse(
        genres=genres,
        total_genres=len(genres)
    )