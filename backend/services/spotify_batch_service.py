import httpx
from typing import List, Dict
from pydantic import BaseModel
from .spotify_base_service import SpotifyBaseService


class SpotifyImage(BaseModel):
    url: str
    height: int = None
    width: int = None


class SpotifyArtist(BaseModel):
    id: str
    name: str
    images: List[SpotifyImage]
    followers: int
    genres: List[str]
    popularity: int


class SpotifyTrack(BaseModel):
    id: str
    name: str
    artists: List[str]
    album_name: str
    album_images: List[SpotifyImage]


class SpotifyShow(BaseModel):
    id: str
    name: str
    description: str
    images: List[SpotifyImage]
    publisher: str


class SpotifyEpisode(BaseModel):
    id: str
    name: str
    description: str
    images: List[SpotifyImage]
    show: SpotifyShow


class SpotifyBatchService(SpotifyBaseService):
    """Service for batch Spotify API operations"""
    
    async def get_several_tracks(self, track_ids: List[str]) -> List[SpotifyTrack]:
        """
        Get multiple tracks using batch API endpoint
        track_ids: List of Spotify track IDs (not URIs)
        Maximum 50 IDs per request
        """
        if not track_ids:
            return []
            
        results = []
        
        # Process in chunks of 50 (Spotify API limit)
        for i in range(0, len(track_ids), 50):
            chunk = track_ids[i:i+50]
            ids_param = ",".join(chunk)
            
            # Check cache first for this chunk
            cache_key = f"batch_tracks:{ids_param}"
            cached_result = self._get_from_cache(cache_key)
            if cached_result is not None:
                results.extend(cached_result)
                continue
            
            access_token = await self.get_client_credentials_token()
            headers = {"Authorization": f"Bearer {access_token}"}
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/tracks",
                    headers=headers,
                    params={"ids": ids_param}
                )
                
                if response.status_code != 200:
                    continue
                
                data = response.json()
                chunk_results = []
                
                for track_data in data.get("tracks", []):
                    if track_data:  # API returns null for invalid IDs
                        track = SpotifyTrack(
                            id=track_data["id"],
                            name=track_data["name"],
                            artists=[artist["name"] for artist in track_data["artists"]],
                            album_name=track_data["album"]["name"],
                            album_images=[SpotifyImage(**img) for img in track_data["album"]["images"]]
                        )
                        chunk_results.append(track)
                
                # Cache this chunk
                self._set_cache(cache_key, chunk_results)
                results.extend(chunk_results)
        
        return results

    async def get_several_artists(self, artist_ids: List[str]) -> List[SpotifyArtist]:
        """
        Get multiple artists using batch API endpoint
        artist_ids: List of Spotify artist IDs (not URIs)
        Maximum 50 IDs per request
        """
        if not artist_ids:
            return []
            
        results = []
        
        # Process in chunks of 50 (Spotify API limit)
        for i in range(0, len(artist_ids), 50):
            chunk = artist_ids[i:i+50]
            ids_param = ",".join(chunk)
            
            # Check cache first for this chunk
            cache_key = f"batch_artists:{ids_param}"
            cached_result = self._get_from_cache(cache_key)
            if cached_result is not None:
                results.extend(cached_result)
                continue
            
            access_token = await self.get_client_credentials_token()
            headers = {"Authorization": f"Bearer {access_token}"}
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/artists",
                    headers=headers,
                    params={"ids": ids_param}
                )
                
                if response.status_code != 200:
                    continue
                
                data = response.json()
                chunk_results = []
                
                for artist_data in data.get("artists", []):
                    if artist_data:  # API returns null for invalid IDs
                        artist = SpotifyArtist(
                            id=artist_data["id"],
                            name=artist_data["name"],
                            images=[SpotifyImage(**img) for img in artist_data["images"]],
                            followers=artist_data["followers"]["total"],
                            genres=artist_data["genres"],
                            popularity=artist_data["popularity"]
                        )
                        chunk_results.append(artist)
                
                # Cache this chunk
                self._set_cache(cache_key, chunk_results)
                results.extend(chunk_results)
        
        return results

    async def get_several_shows(self, show_ids: List[str]) -> List[SpotifyShow]:
        """
        Get multiple shows using batch API endpoint  
        show_ids: List of Spotify show IDs (not URIs)
        Maximum 50 IDs per request
        """
        if not show_ids:
            return []
            
        results = []
        
        # Process in chunks of 50 (Spotify API limit)
        for i in range(0, len(show_ids), 50):
            chunk = show_ids[i:i+50]
            ids_param = ",".join(chunk)
            
            # Check cache first for this chunk
            cache_key = f"batch_shows:{ids_param}"
            cached_result = self._get_from_cache(cache_key)
            if cached_result is not None:
                results.extend(cached_result)
                continue
            
            access_token = await self.get_client_credentials_token()
            headers = {"Authorization": f"Bearer {access_token}"}
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/shows",
                    headers=headers,
                    params={"ids": ids_param}
                )
                
                if response.status_code != 200:
                    continue
                
                data = response.json()
                chunk_results = []
                
                for show_data in data.get("shows", []):
                    if show_data:  # API returns null for invalid IDs
                        show = SpotifyShow(
                            id=show_data["id"],
                            name=show_data["name"],
                            description=show_data["description"],
                            images=[SpotifyImage(**img) for img in show_data["images"]],
                            publisher=show_data["publisher"]
                        )
                        chunk_results.append(show)
                
                # Cache this chunk
                self._set_cache(cache_key, chunk_results)
                results.extend(chunk_results)
        
        return results

    async def get_tracks_from_uris(self, track_uris: List[str]) -> List[SpotifyTrack]:
        """
        Get multiple tracks from Spotify URIs by extracting IDs and using batch API
        track_uris: List of Spotify track URIs (e.g., 'spotify:track:4iV5W9uYEdYUVa79Axb7Rh')
        """
        track_ids = []
        for uri in track_uris:
            spotify_id = self._extract_spotify_id(uri)
            if spotify_id:
                track_ids.append(spotify_id)
        
        return await self.get_several_tracks(track_ids)

    async def get_shows_from_episode_uris(self, episode_uris: List[str]) -> Dict[str, SpotifyShow]:
        """
        Get show information from episode URIs
        This requires individual episode lookups first, then batch show requests
        Returns dict mapping episode_uri -> SpotifyShow
        """
        # For now, we'll need individual episode lookups to get show IDs
        # This could be optimized in the future by caching episode->show mappings
        from .spotify_service import spotify_service
        
        show_ids = set()
        episode_to_show = {}
        
        # First, get show IDs from episodes (this part still requires individual calls)
        for episode_uri in episode_uris:
            episode_id = self._extract_spotify_id(episode_uri)
            if episode_id:
                # We'd need to call individual episode endpoint to get show ID
                # For now, this is a limitation - episodes don't have direct batch show lookup
                pass
        
        # This method would need enhancement once we have episode->show ID mappings
        return {}


# Global instance
spotify_batch_service = SpotifyBatchService()