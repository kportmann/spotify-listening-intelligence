-- Dimension table for tracks
CREATE TABLE tracks (
    spotify_uri VARCHAR(255) PRIMARY KEY,
    name TEXT,
    artist_name TEXT,
    album_name TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dimension table for podcast episodes
CREATE TABLE episodes (
    spotify_uri VARCHAR(255) PRIMARY KEY,
    name TEXT,
    show_name TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dimension table for audiobook chapters
CREATE TABLE audiobook_chapters (
    chapter_uri VARCHAR(255) PRIMARY KEY,
    chapter_title TEXT,
    audiobook_title TEXT,
    audiobook_uri VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Main fact table for streaming history
CREATE TABLE spotify_streams (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    ts TIMESTAMP WITH TIME ZONE NOT NULL,
    platform VARCHAR(50) NOT NULL,
    ms_played INTEGER NOT NULL,
    conn_country CHAR(2) NOT NULL,
    ip_addr INET NOT NULL,
    
    -- Track-related fields (nullable, for music tracks)
    master_metadata_track_name TEXT,
    master_metadata_album_artist_name TEXT,
    master_metadata_album_album_name TEXT,
    spotify_track_uri VARCHAR(255),
    
    -- Episode-related fields (nullable, for podcast episodes)
    episode_name TEXT,
    episode_show_name TEXT,
    spotify_episode_uri VARCHAR(255),
    
    -- Audiobook-related fields (nullable, for audiobook chapters)
    audiobook_title TEXT,
    audiobook_uri VARCHAR(255),
    audiobook_chapter_uri VARCHAR(255),
    audiobook_chapter_title TEXT,
    
    -- Playback metadata
    reason_start VARCHAR(50) NOT NULL,
    reason_end VARCHAR(50) NOT NULL,
    shuffle BOOLEAN NOT NULL,
    skipped BOOLEAN NOT NULL,
    offline BOOLEAN NOT NULL,
    offline_timestamp BIGINT NOT NULL,
    incognito_mode BOOLEAN NOT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Foreign key constraints
ALTER TABLE spotify_streams 
ADD CONSTRAINT fk_spotify_streams_track 
FOREIGN KEY (spotify_track_uri) REFERENCES tracks(spotify_uri);

ALTER TABLE spotify_streams 
ADD CONSTRAINT fk_spotify_streams_episode 
FOREIGN KEY (spotify_episode_uri) REFERENCES episodes(spotify_uri);

ALTER TABLE spotify_streams 
ADD CONSTRAINT fk_spotify_streams_audiobook_chapter 
FOREIGN KEY (audiobook_chapter_uri) REFERENCES audiobook_chapters(chapter_uri);

-- Indexes for performance
CREATE INDEX idx_spotify_streams_ts ON spotify_streams(ts);
CREATE INDEX idx_spotify_streams_platform ON spotify_streams(platform);
CREATE INDEX idx_spotify_streams_country ON spotify_streams(conn_country);
CREATE INDEX idx_spotify_streams_track_uri ON spotify_streams(spotify_track_uri);
CREATE INDEX idx_spotify_streams_episode_uri ON spotify_streams(spotify_episode_uri);
CREATE INDEX idx_spotify_streams_audiobook_chapter_uri ON spotify_streams(audiobook_chapter_uri);
CREATE INDEX idx_spotify_streams_ms_played ON spotify_streams(ms_played);

-- Composite indexes for common queries
CREATE INDEX idx_spotify_streams_ts_platform ON spotify_streams(ts, platform);
CREATE INDEX idx_spotify_streams_country_ts ON spotify_streams(conn_country, ts);

-- Check constraints
ALTER TABLE spotify_streams 
ADD CONSTRAINT chk_conn_country_length 
CHECK (LENGTH(conn_country) = 2);

ALTER TABLE spotify_streams 
ADD CONSTRAINT chk_ms_played_positive 
CHECK (ms_played >= 0);

ALTER TABLE tracks 
ADD CONSTRAINT chk_track_uri_format 
CHECK (spotify_uri ~ '^spotify:track:');

ALTER TABLE episodes 
ADD CONSTRAINT chk_episode_uri_format 
CHECK (spotify_uri ~ '^spotify:episode:');

ALTER TABLE audiobook_chapters 
ADD CONSTRAINT chk_audiobook_chapter_uri_format 
CHECK (chapter_uri ~ '^spotify:');