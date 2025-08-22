import json
import logging
from pathlib import Path
from typing import List, Optional, Dict, Any
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import IntegrityError
from pydantic import ValidationError

from database.schema import Base, Track, Episode, AudiobookChapter, SpotifyStream
from models.models import SpotifyStreamRecord, TrackRecord, EpisodeRecord, AudiobookChapterRecord
from config.settings import get_settings


class SpotifyDataLoader:
    """Loads Spotify streaming data into PostgreSQL database."""
    
    def __init__(self):
        self.settings = get_settings()
        self.engine = create_engine(self.settings.database.connection_string)
        self.Session = sessionmaker(bind=self.engine)
        
        # Setup logging
        logging.basicConfig(
            level=getattr(logging, self.settings.etl.log_level),
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)
    
    def create_tables(self):
        """Create database tables if they don't exist."""
        self.logger.info("Creating database tables...")
        Base.metadata.create_all(self.engine)
        self.logger.info("Database tables created successfully")
    
    def load_json_file(self, file_path: Path) -> List[Dict[str, Any]]:
        """Load and parse a JSON file."""
        self.logger.info(f"Loading JSON file: {file_path}")
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            self.logger.info(f"Loaded {len(data)} records from {file_path.name}")
            return data
        
        except Exception as e:
            self.logger.error(f"Error loading {file_path}: {e}")
            raise
    
    def validate_and_parse_records(self, raw_data: List[Dict[str, Any]]) -> List[SpotifyStreamRecord]:
        """Validate and parse raw JSON data into Pydantic models."""
        valid_records = []
        error_count = 0
        
        for i, record in enumerate(raw_data):
            try:
                validated_record = SpotifyStreamRecord(**record)
                valid_records.append(validated_record)
            except ValidationError as e:
                error_count += 1
                self.logger.warning(f"Validation error in record {i}: {e}")
                continue
        
        self.logger.info(f"Validated {len(valid_records)} records, {error_count} errors")
        return valid_records
    
    def extract_dimension_data(self, records: List[SpotifyStreamRecord]) -> tuple:
        """Extract unique tracks, episodes, and audiobook chapters from stream records."""
        tracks = {}
        episodes = {}
        audiobook_chapters = {}
        
        for record in records:
            # Extract track data
            if record.is_track and record.spotify_track_uri:
                if record.spotify_track_uri not in tracks:
                    tracks[record.spotify_track_uri] = TrackRecord(
                        spotify_uri=record.spotify_track_uri,
                        name=record.master_metadata_track_name,
                        artist_name=record.master_metadata_album_artist_name,
                        album_name=record.master_metadata_album_album_name
                    )
            
            # Extract episode data
            if record.is_episode and record.spotify_episode_uri:
                if record.spotify_episode_uri not in episodes:
                    episodes[record.spotify_episode_uri] = EpisodeRecord(
                        spotify_uri=record.spotify_episode_uri,
                        name=record.episode_name,
                        show_name=record.episode_show_name
                    )
            
            # Extract audiobook chapter data
            if record.is_audiobook and record.audiobook_chapter_uri:
                if record.audiobook_chapter_uri not in audiobook_chapters:
                    audiobook_chapters[record.audiobook_chapter_uri] = AudiobookChapterRecord(
                        chapter_uri=record.audiobook_chapter_uri,
                        chapter_title=record.audiobook_chapter_title,
                        audiobook_title=record.audiobook_title,
                        audiobook_uri=record.audiobook_uri
                    )
        
        self.logger.info(f"Extracted {len(tracks)} tracks, {len(episodes)} episodes, {len(audiobook_chapters)} audiobook chapters")
        return list(tracks.values()), list(episodes.values()), list(audiobook_chapters.values())
    
    def load_dimension_tables(self, session: Session, tracks: List[TrackRecord], 
                            episodes: List[EpisodeRecord], 
                            audiobook_chapters: List[AudiobookChapterRecord]):
        """Load dimension table data, handling duplicates gracefully."""
        
        # Load tracks
        for track in tracks:
            try:
                existing = session.get(Track, track.spotify_uri)
                if not existing:
                    db_track = Track(
                        spotify_uri=track.spotify_uri,
                        name=track.name,
                        artist_name=track.artist_name,
                        album_name=track.album_name
                    )
                    session.add(db_track)
            except Exception as e:
                self.logger.warning(f"Error adding track {track.spotify_uri}: {e}")
        
        # Load episodes
        for episode in episodes:
            try:
                existing = session.get(Episode, episode.spotify_uri)
                if not existing:
                    db_episode = Episode(
                        spotify_uri=episode.spotify_uri,
                        name=episode.name,
                        show_name=episode.show_name
                    )
                    session.add(db_episode)
            except Exception as e:
                self.logger.warning(f"Error adding episode {episode.spotify_uri}: {e}")
        
        # Load audiobook chapters
        for chapter in audiobook_chapters:
            try:
                existing = session.get(AudiobookChapter, chapter.chapter_uri)
                if not existing:
                    db_chapter = AudiobookChapter(
                        chapter_uri=chapter.chapter_uri,
                        chapter_title=chapter.chapter_title,
                        audiobook_title=chapter.audiobook_title,
                        audiobook_uri=chapter.audiobook_uri
                    )
                    session.add(db_chapter)
            except Exception as e:
                self.logger.warning(f"Error adding audiobook chapter {chapter.chapter_uri}: {e}")
        
        try:
            session.commit()
            self.logger.info("Successfully loaded dimension table data")
        except IntegrityError as e:
            session.rollback()
            self.logger.warning(f"Integrity error in dimension tables: {e}")
    
    def load_stream_data(self, session: Session, records: List[SpotifyStreamRecord]):
        """Load streaming history data in batches."""
        batch_size = self.settings.etl.batch_size
        total_records = len(records)
        loaded_count = 0
        
        for i in range(0, total_records, batch_size):
            batch = records[i:i + batch_size]
            batch_streams = []
            
            for record in batch:
                try:
                    # Set foreign keys to None if the referenced record doesn't exist
                    track_uri = record.spotify_track_uri if record.is_track else None
                    episode_uri = record.spotify_episode_uri if record.is_episode else None
                    audiobook_uri = record.audiobook_chapter_uri if record.is_audiobook else None
                    
                    db_stream = SpotifyStream(
                        ts=record.ts,
                        platform=record.platform,
                        ms_played=record.ms_played,
                        conn_country=record.conn_country,
                        ip_addr=record.ip_addr,
                        master_metadata_track_name=record.master_metadata_track_name,
                        master_metadata_album_artist_name=record.master_metadata_album_artist_name,
                        master_metadata_album_album_name=record.master_metadata_album_album_name,
                        spotify_track_uri=track_uri,
                        episode_name=record.episode_name,
                        episode_show_name=record.episode_show_name,
                        spotify_episode_uri=episode_uri,
                        audiobook_title=record.audiobook_title,
                        audiobook_uri=record.audiobook_uri,
                        audiobook_chapter_uri=audiobook_uri,
                        audiobook_chapter_title=record.audiobook_chapter_title,
                        reason_start=record.reason_start,
                        reason_end=record.reason_end,
                        shuffle=record.shuffle,
                        skipped=record.skipped,
                        offline=record.offline,
                        offline_timestamp=record.offline_timestamp,
                        incognito_mode=record.incognito_mode
                    )
                    batch_streams.append(db_stream)
                
                except Exception as e:
                    self.logger.warning(f"Error creating stream record: {e}")
                    continue
            
            try:
                session.add_all(batch_streams)
                session.commit()
                loaded_count += len(batch_streams)
                self.logger.info(f"Loaded batch {i//batch_size + 1}/{(total_records + batch_size - 1)//batch_size} "
                               f"({loaded_count}/{total_records} records)")
            
            except Exception as e:
                session.rollback()
                self.logger.error(f"Error loading batch: {e}")
                continue
        
        self.logger.info(f"Successfully loaded {loaded_count} streaming records")
        return loaded_count
    
    def load_file(self, file_path: Path) -> Dict[str, int]:
        """Load a single JSON file into the database."""
        self.logger.info(f"Starting load for file: {file_path}")
        
        # Load and validate data
        raw_data = self.load_json_file(file_path)
        records = self.validate_and_parse_records(raw_data)
        
        if not records:
            self.logger.warning(f"No valid records found in {file_path}")
            return {"total": 0, "loaded": 0}
        
        # Sort records by timestamp to ensure proper chronological order
        records.sort(key=lambda x: x.ts)
        self.logger.info(f"Sorted {len(records)} records by timestamp")
        
        # Extract dimension data
        tracks, episodes, audiobook_chapters = self.extract_dimension_data(records)
        
        # Load data
        with self.Session() as session:
            # Load dimension tables first
            self.load_dimension_tables(session, tracks, episodes, audiobook_chapters)
            
            # Load streaming data
            loaded_count = self.load_stream_data(session, records)
        
        stats = {
            "total": len(raw_data),
            "valid": len(records),
            "loaded": loaded_count,
            "tracks": len(tracks),
            "episodes": len(episodes),
            "audiobook_chapters": len(audiobook_chapters)
        }
        
        self.logger.info(f"Completed load for {file_path.name}: {stats}")
        return stats
    
    def load_all_files(self, data_dir: Optional[Path] = None) -> Dict[str, Any]:
        """Load all JSON files from the data directory with global timestamp ordering."""
        if data_dir is None:
            data_dir = Path(self.settings.etl.data_directory)
        
        json_files = list(data_dir.glob("*.json"))
        if not json_files:
            self.logger.warning(f"No JSON files found in {data_dir}")
            return {}
        
        # Filter to audio files only and sort by number suffix
        audio_files = [f for f in json_files if "Audio" in f.name and "Video" not in f.name]
        
        def get_file_number(file_path):
            """Extract the number suffix from audio file names for proper ordering."""
            import re
            match = re.search(r'_(\d+)\.json$', file_path.name)
            return int(match.group(1)) if match else 0
        
        audio_files.sort(key=get_file_number)
        
        self.logger.info(f"Found {len(audio_files)} audio files to process (ignoring video files)")
        
        # Create tables
        self.create_tables()
        
        # Load and collect all records from all files first
        all_records = []
        all_tracks = {}
        all_episodes = {}
        all_audiobook_chapters = {}
        
        total_stats = {
            "files_processed": 0,
            "total_records": 0,
            "total_loaded": 0
        }
        
        self.logger.info("Loading all files into memory for global timestamp sorting...")
        
        for file_path in audio_files:
            try:
                self.logger.info(f"Loading file: {file_path}")
                raw_data = self.load_json_file(file_path)
                records = self.validate_and_parse_records(raw_data)
                
                if records:
                    all_records.extend(records)
                    
                    # Collect dimension data
                    tracks, episodes, audiobook_chapters = self.extract_dimension_data(records)
                    
                    # Merge dimension data
                    for track in tracks:
                        all_tracks[track.spotify_uri] = track
                    for episode in episodes:
                        all_episodes[episode.spotify_uri] = episode  
                    for chapter in audiobook_chapters:
                        all_audiobook_chapters[chapter.chapter_uri] = chapter
                
                total_stats["files_processed"] += 1
                total_stats["total_records"] += len(raw_data)
                
            except Exception as e:
                self.logger.error(f"Failed to process {file_path}: {e}")
                continue
        
        if not all_records:
            self.logger.warning("No valid records found across all files")
            return total_stats
        
        # Sort all records globally by timestamp for proper chronological order
        self.logger.info(f"Sorting {len(all_records)} records globally by timestamp...")
        all_records.sort(key=lambda x: x.ts)
        
        # Load dimension tables first
        with self.Session() as session:
            self.load_dimension_tables(session, list(all_tracks.values()), 
                                     list(all_episodes.values()), 
                                     list(all_audiobook_chapters.values()))
            
            # Load all streaming data in timestamp order
            loaded_count = self.load_stream_data(session, all_records)
            
        total_stats["total_loaded"] = loaded_count
        total_stats["tracks"] = len(all_tracks)
        total_stats["episodes"] = len(all_episodes)
        total_stats["audiobook_chapters"] = len(all_audiobook_chapters)
        
        self.logger.info(f"Load complete: {total_stats}")
        return total_stats