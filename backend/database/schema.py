from sqlalchemy import Column, String, Text, Integer, BigInteger, Boolean, TIMESTAMP, ForeignKey, CheckConstraint, Index
from sqlalchemy.dialects.postgresql import INET
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

Base = declarative_base()


class Track(Base):
    __tablename__ = 'tracks'
    
    spotify_uri = Column(String(255), primary_key=True)
    name = Column(Text)
    artist_name = Column(Text)
    album_name = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    
    # Relationship to streams
    streams = relationship("SpotifyStream", back_populates="track")
    
    __table_args__ = (
        CheckConstraint("spotify_uri ~ '^spotify:track:'", name='chk_track_uri_format'),
    )


class Episode(Base):
    __tablename__ = 'episodes'
    
    spotify_uri = Column(String(255), primary_key=True)
    name = Column(Text)
    show_name = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    
    # Relationship to streams
    streams = relationship("SpotifyStream", back_populates="episode")
    
    __table_args__ = (
        CheckConstraint("spotify_uri ~ '^spotify:episode:'", name='chk_episode_uri_format'),
    )


class AudiobookChapter(Base):
    __tablename__ = 'audiobook_chapters'
    
    chapter_uri = Column(String(255), primary_key=True)
    chapter_title = Column(Text)
    audiobook_title = Column(Text)
    audiobook_uri = Column(String(255))
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    
    # Relationship to streams
    streams = relationship("SpotifyStream", back_populates="audiobook_chapter")
    
    __table_args__ = (
        CheckConstraint("chapter_uri ~ '^spotify:'", name='chk_audiobook_chapter_uri_format'),
    )


class SpotifyStream(Base):
    __tablename__ = 'spotify_streams'
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    ts = Column(TIMESTAMP(timezone=True), nullable=False)
    platform = Column(String(100), nullable=False)
    ms_played = Column(Integer, nullable=False)
    conn_country = Column(String(2), nullable=False)
    ip_addr = Column(INET, nullable=False)
    
    # Track-related fields (nullable, for music tracks)
    master_metadata_track_name = Column(Text)
    master_metadata_album_artist_name = Column(Text)
    master_metadata_album_album_name = Column(Text)
    spotify_track_uri = Column(String(255), ForeignKey('tracks.spotify_uri'))
    
    # Episode-related fields (nullable, for podcast episodes)
    episode_name = Column(Text)
    episode_show_name = Column(Text)
    spotify_episode_uri = Column(String(255), ForeignKey('episodes.spotify_uri'))
    
    # Audiobook-related fields (nullable, for audiobook chapters)
    audiobook_title = Column(Text)
    audiobook_uri = Column(String(255))
    audiobook_chapter_uri = Column(String(255), ForeignKey('audiobook_chapters.chapter_uri'))
    audiobook_chapter_title = Column(Text)
    
    # Playback metadata
    reason_start = Column(String(100), nullable=False)
    reason_end = Column(String(100), nullable=False)
    shuffle = Column(Boolean, nullable=False)
    skipped = Column(Boolean, nullable=False)
    offline = Column(Boolean, nullable=False)
    offline_timestamp = Column(BigInteger, nullable=True)
    incognito_mode = Column(Boolean, nullable=False)
    
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    
    # Relationships
    track = relationship("Track", back_populates="streams")
    episode = relationship("Episode", back_populates="streams")
    audiobook_chapter = relationship("AudiobookChapter", back_populates="streams")
    
    __table_args__ = (
        # Check constraints
        CheckConstraint("LENGTH(conn_country) = 2", name='chk_conn_country_length'),
        CheckConstraint("ms_played >= 0", name='chk_ms_played_positive'),
        
        # Indexes for performance
        Index('idx_spotify_streams_ts', 'ts'),
        Index('idx_spotify_streams_platform', 'platform'),
        Index('idx_spotify_streams_country', 'conn_country'),
        Index('idx_spotify_streams_track_uri', 'spotify_track_uri'),
        Index('idx_spotify_streams_episode_uri', 'spotify_episode_uri'),
        Index('idx_spotify_streams_audiobook_chapter_uri', 'audiobook_chapter_uri'),
        Index('idx_spotify_streams_ms_played', 'ms_played'),
        
        # Composite indexes for common queries
        Index('idx_spotify_streams_ts_platform', 'ts', 'platform'),
        Index('idx_spotify_streams_country_ts', 'conn_country', 'ts'),
    )