from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional
import ipaddress


class SpotifyStreamRecord(BaseModel):
    """Pydantic model for Spotify streaming history records."""
    
    ts: datetime
    platform: str
    ms_played: int
    conn_country: str
    ip_addr: str
    master_metadata_track_name: Optional[str] = None
    master_metadata_album_artist_name: Optional[str] = None
    master_metadata_album_album_name: Optional[str] = None
    spotify_track_uri: Optional[str] = None
    episode_name: Optional[str] = None
    episode_show_name: Optional[str] = None
    spotify_episode_uri: Optional[str] = None
    audiobook_title: Optional[str] = None
    audiobook_uri: Optional[str] = None
    audiobook_chapter_uri: Optional[str] = None
    audiobook_chapter_title: Optional[str] = None
    reason_start: str
    reason_end: str
    shuffle: bool
    skipped: bool
    offline: bool
    offline_timestamp: int
    incognito_mode: bool

    @field_validator('ts', pre=True)
    def parse_timestamp(cls, v):
        """Convert ISO timestamp string to datetime object."""
        if isinstance(v, str):
            return datetime.fromisoformat(v.replace('Z', '+00:00'))
        return v

    @field_validator('ip_addr')
    def validate_ip(cls, v):
        """Validate IP address format."""
        try:
            ipaddress.ip_address(v)
            return v
        except ValueError:
            raise ValueError(f"Invalid IP address: {v}")

    @field_validator('conn_country')
    def validate_country_code(cls, v):
        """Validate country code is 2 characters."""
        if len(v) != 2:
            raise ValueError(f"Country code must be 2 characters: {v}")
        return v.upper()

    @property
    def is_track(self) -> bool:
        """Check if this is a music track (not podcast/audiobook)."""
        return self.spotify_track_uri is not None

    @property
    def is_episode(self) -> bool:
        """Check if this is a podcast episode."""
        return self.spotify_episode_uri is not None

    @property
    def is_audiobook(self) -> bool:
        """Check if this is an audiobook chapter."""
        return self.audiobook_chapter_uri is not None

    model_config = {
        "json_encoders": {
            datetime: lambda v: v.isoformat()
        }
    }


class TrackRecord(BaseModel):
    """Pydantic model for track dimension table."""
    
    spotify_uri: str
    name: Optional[str] = None
    artist_name: Optional[str] = None
    album_name: Optional[str] = None

    @field_validator('spotify_uri')
    def validate_spotify_uri(cls, v):
        """Validate Spotify URI format."""
        if not v.startswith('spotify:track:'):
            raise ValueError(f"Invalid Spotify track URI: {v}")
        return v


class EpisodeRecord(BaseModel):
    """Pydantic model for podcast episode dimension table."""
    
    spotify_uri: str
    name: Optional[str] = None
    show_name: Optional[str] = None

    @field_validator('spotify_uri')
    def validate_spotify_uri(cls, v):
        """Validate Spotify episode URI format."""
        if not v.startswith('spotify:episode:'):
            raise ValueError(f"Invalid Spotify episode URI: {v}")
        return v


class AudiobookChapterRecord(BaseModel):
    """Pydantic model for audiobook chapter dimension table."""
    
    chapter_uri: str
    chapter_title: Optional[str] = None
    audiobook_title: Optional[str] = None
    audiobook_uri: Optional[str] = None

    @field_validator('chapter_uri')
    def validate_chapter_uri(cls, v):
        """Validate audiobook chapter URI format."""
        if not v.startswith('spotify:'):
            raise ValueError(f"Invalid audiobook chapter URI: {v}")
        return v