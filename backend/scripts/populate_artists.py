#!/usr/bin/env python3
"""
Script to populate the artists table with Spotify artist IDs.

This script:
1. Extracts unique artist names from existing tracks
2. Uses Spotify Web API to search for artist IDs
3. Populates the artists table
4. Updates tracks table with artist_spotify_id references
"""

import sys
import asyncio
import json
from pathlib import Path
from typing import List, Dict, Optional, Tuple
import httpx

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import text
from sqlalchemy.orm import sessionmaker
from database.connection import engine
from services.spotify_base_service import SpotifyBaseService


class ArtistPopulator(SpotifyBaseService):
    """Service to populate artists table with Spotify data."""
    
    def __init__(self):
        super().__init__()
        self.session_factory = sessionmaker(bind=engine)
        
    async def search_artist(self, artist_name: str, max_retries: int = 3) -> Optional[Dict]:
        """Search for an artist using Spotify Web API with rate limiting and retries."""
        if not artist_name or artist_name.strip() == "":
            return None
            
        cache_key = self._get_cache_key("artist_search", artist_name.lower())
        cached_result = self._get_from_cache(cache_key)
        if cached_result is not None:
            return cached_result
        
        for attempt in range(max_retries):
            try:
                token = await self.get_client_credentials_token()
                headers = {"Authorization": f"Bearer {token}"}
                
                # Search for the artist
                params = {
                    "q": artist_name,
                    "type": "artist",
                    "limit": 1
                }
                
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.get(
                        f"{self.base_url}/search",
                        headers=headers,
                        params=params
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        artists = data.get("artists", {}).get("items", [])
                        
                        if artists:
                            artist = artists[0]
                            result = {
                                "spotify_id": artist["id"],
                                "name": artist["name"],
                                "genres": artist.get("genres", []),
                                "href": artist.get("href")
                            }
                            self._set_cache(cache_key, result)
                            return result
                        else:
                            # No artist found - cache this result
                            self._set_cache(cache_key, None)
                            return None
                            
                    elif response.status_code == 429:
                        # Rate limited - wait and retry
                        retry_after = int(response.headers.get('Retry-After', 1))
                        print(f"Rate limited for '{artist_name}', waiting {retry_after}s (attempt {attempt + 1}/{max_retries})")
                        await asyncio.sleep(retry_after)
                        continue
                        
                    else:
                        print(f"Error searching for artist '{artist_name}': {response.status_code}")
                        if attempt == max_retries - 1:
                            return None
                        await asyncio.sleep(2 ** attempt)  # Exponential backoff
                        continue
                        
            except Exception as e:
                print(f"Exception searching for artist '{artist_name}' (attempt {attempt + 1}): {e}")
                if attempt == max_retries - 1:
                    return None
                await asyncio.sleep(2 ** attempt)  # Exponential backoff
        
        return None
    
    def get_unique_artists_from_tracks(self) -> List[str]:
        """Get unique artist names from tracks table."""
        with self.session_factory() as session:
            # Get unique non-null artist names
            result = session.execute(
                text("""
                    SELECT DISTINCT artist_name 
                    FROM tracks 
                    WHERE artist_name IS NOT NULL 
                    AND artist_name != ''
                    AND artist_spotify_id IS NULL
                    ORDER BY artist_name
                """)
            )
            return [row[0] for row in result.fetchall()]
    
    async def populate_artists(self, batch_size: int = 10, delay_between_requests: float = 0.3) -> Dict[str, int]:
        """
        Populate artists table with Spotify IDs using conservative rate limiting.
        
        Spotify recommends:
        - Conservative request pacing for development apps
        - Proper backoff-retry when receiving 429 errors
        - Sequential processing instead of parallel to avoid overwhelming the API
        """
        print("Getting unique artists from tracks table...")
        unique_artists = self.get_unique_artists_from_tracks()
        
        if not unique_artists:
            print("No artists found to process.")
            return {"processed": 0, "found": 0, "errors": 0}
        
        print(f"Found {len(unique_artists)} unique artists to process")
        print(f"Using conservative rate limiting: {delay_between_requests}s between requests")
        print("Processing artists sequentially to respect API limits...")
        
        stats = {"processed": 0, "found": 0, "errors": 0}
        artists_to_insert = []
        artist_updates = []
        
        # Process artists one by one with rate limiting
        for i, artist_name in enumerate(unique_artists):
            if i > 0:
                await asyncio.sleep(delay_between_requests)  # Wait between requests
            
            # Progress reporting every 50 artists
            if i % 50 == 0:
                print(f"Processing artist {i+1}/{len(unique_artists)} ({(i+1)/len(unique_artists)*100:.1f}%): '{artist_name}'")
            
            result = await self.search_artist(artist_name)
            stats["processed"] += 1
            
            if isinstance(result, Exception):
                print(f"Error processing {artist_name}: {result}")
                stats["errors"] += 1
                continue
                
            if result:
                artists_to_insert.append(result)
                artist_updates.append((artist_name, result["spotify_id"]))
                stats["found"] += 1
            
            # Insert in batches to avoid memory issues and provide checkpoints
            if len(artists_to_insert) >= batch_size:
                self._insert_artists_batch(artists_to_insert, artist_updates)
                print(f"  -> Inserted batch of {len(artists_to_insert)} artists")
                artists_to_insert = []
                artist_updates = []
        
        # Insert remaining artists
        if artists_to_insert:
            self._insert_artists_batch(artists_to_insert, artist_updates)
            print(f"  -> Inserted final batch of {len(artists_to_insert)} artists")
        
        print(f"\nFinal stats: {stats}")
        return stats
    
    def _insert_artists_batch(self, artists: List[Dict], updates: List[Tuple[str, str]]):
        """Insert artists and update tracks table in a single transaction."""
        with self.session_factory() as session:
            try:
                successfully_inserted = []
                
                # Insert artists (ignore duplicates)
                for artist in artists:
                    # Use raw SQL with ON CONFLICT to handle duplicates
                    result = session.execute(
                        text("""
                            INSERT INTO artists (spotify_id, name, genres, href) 
                            VALUES (:spotify_id, :name, :genres, :href)
                            ON CONFLICT (spotify_id) DO NOTHING
                            RETURNING spotify_id
                        """),
                        {
                            "spotify_id": artist["spotify_id"], 
                            "name": artist["name"],
                            "genres": json.dumps(artist.get("genres")) if artist.get("genres") else None,
                            "href": artist.get("href")
                        }
                    )
                    
                    # Check if this artist was actually inserted or already existed
                    if result.rowcount > 0 or self._artist_exists(session, artist["spotify_id"]):
                        successfully_inserted.append(artist["spotify_id"])
                
                # Only update tracks for successfully inserted/existing artists
                successful_updates = []
                for artist_name, spotify_id in updates:
                    if spotify_id in successfully_inserted:
                        session.execute(
                            text("""
                                UPDATE tracks 
                                SET artist_spotify_id = :spotify_id 
                                WHERE artist_name = :artist_name 
                                AND artist_spotify_id IS NULL
                            """),
                            {"spotify_id": spotify_id, "artist_name": artist_name}
                        )
                        successful_updates.append((artist_name, spotify_id))
                
                session.commit()
                print(f"Successfully processed {len(successfully_inserted)} artists, updated {len(successful_updates)} track relationships")
                
            except Exception as e:
                session.rollback()
                print(f"Error inserting batch: {e}")
                raise
    
    def _artist_exists(self, session, spotify_id: str) -> bool:
        """Check if artist exists in database."""
        result = session.execute(
            text("SELECT 1 FROM artists WHERE spotify_id = :spotify_id"),
            {"spotify_id": spotify_id}
        )
        return result.fetchone() is not None


async def main():
    """Main function."""
    print("Starting artist population process...")
    print("=" * 50)
    
    try:
        populator = ArtistPopulator()
        
        # Show cache stats if any
        cache_stats = populator.get_cache_stats()
        if cache_stats["total_entries"] > 0:
            print(f"Cache stats: {cache_stats}")
        
        stats = await populator.populate_artists()
        
        print("\n" + "=" * 50)
        print("POPULATION SUMMARY")
        print("=" * 50)
        print(f"Artists processed: {stats['processed']}")
        print(f"Artists found: {stats['found']}")
        print(f"Errors: {stats['errors']}")
        print(f"Success rate: {stats['found']/stats['processed']*100:.1f}%" if stats['processed'] > 0 else "N/A")
        
        print("\nArtist population completed successfully!")
        
    except Exception as e:
        print(f"Error during artist population: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())