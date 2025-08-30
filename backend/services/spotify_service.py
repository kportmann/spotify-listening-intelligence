import httpx
import base64
import time
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from fastapi import HTTPException
from config.settings import get_settings


class SpotifyImage(BaseModel):
    url: str
    height: Optional[int]
    width: Optional[int]


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


class SpotifyService:
    def __init__(self):
        settings = get_settings()
        self.client_id = settings.spotify.client_id
        self.client_secret = settings.spotify.client_secret
        self.redirect_uri = settings.spotify.redirect_uri
        self.base_url = "https://api.spotify.com/v1"
        self.auth_url = "https://accounts.spotify.com/api/token"
        
        # Simple in-memory cache with 15-minute TTL for successful results
        # Null results get shorter TTL to allow retries
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._cache_ttl = 15 * 60  # 15 minutes in seconds for successful results
        self._null_cache_ttl = 5 * 60  # 5 minutes for null results
        
        if not all([self.client_id, self.client_secret, self.redirect_uri]):
            raise ValueError("Missing Spotify API credentials in environment variables")
    
    def clear_null_caches(self) -> None:
        """Clear all cached null results to force retry"""
        keys_to_remove = []
        for key, entry in self._cache.items():
            if entry["data"] is None:
                keys_to_remove.append(key)
        
        for key in keys_to_remove:
            del self._cache[key]
        
        print(f"Cleared {len(keys_to_remove)} null cache entries")
    
    def get_cache_stats(self) -> Dict[str, int]:
        """Get cache statistics for debugging"""
        total_entries = len(self._cache)
        null_entries = sum(1 for entry in self._cache.values() if entry["data"] is None)
        return {
            "total_entries": total_entries,
            "null_entries": null_entries,
            "valid_entries": total_entries - null_entries
        }
    
    def _get_cache_key(self, prefix: str, identifier: str) -> str:
        """Generate cache key for storing API responses"""
        return f"{prefix}:{identifier}"
    
    def _is_cache_valid(self, cache_entry: Dict[str, Any]) -> bool:
        """Check if cache entry is still valid (within TTL)"""
        # Use shorter TTL for null results to allow retries
        ttl = self._null_cache_ttl if cache_entry["data"] is None else self._cache_ttl
        return time.time() - cache_entry["timestamp"] < ttl
    
    def _get_from_cache(self, cache_key: str, refresh_cache: bool = False) -> Optional[Any]:
        """Get item from cache if valid"""
        if refresh_cache and cache_key in self._cache:
            # Force refresh by removing from cache
            del self._cache[cache_key]
            return None
            
        if cache_key in self._cache:
            entry = self._cache[cache_key]
            if self._is_cache_valid(entry):
                return entry["data"]
            else:
                # Remove expired entry
                del self._cache[cache_key]
        return None
    
    def _set_cache(self, cache_key: str, data: Any) -> None:
        """Store item in cache with current timestamp"""
        self._cache[cache_key] = {
            "data": data,
            "timestamp": time.time()
        }
    
    async def get_client_credentials_token(self) -> str:
        """Get access token using Client Credentials flow (for public data only)"""
        auth_string = f"{self.client_id}:{self.client_secret}"
        auth_bytes = auth_string.encode("utf-8")
        auth_b64 = base64.b64encode(auth_bytes).decode("utf-8")
        
        headers = {
            "Authorization": f"Basic {auth_b64}",
            "Content-Type": "application/x-www-form-urlencoded"
        }
        
        data = {"grant_type": "client_credentials"}
        
        async with httpx.AsyncClient() as client:
            response = await client.post(self.auth_url, headers=headers, data=data)
            
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="Failed to get Spotify access token")
            
            return response.json()["access_token"]
    
    async def search_artist(self, artist_name: str, refresh_cache: bool = False) -> Optional[SpotifyArtist]:
        """Search for artist and return artist data with images"""
        # Check cache first
        cache_key = self._get_cache_key("artist", artist_name.lower())
        cached_result = self._get_from_cache(cache_key, refresh_cache)
        if cached_result is not None:
            return cached_result
        
        access_token = await self.get_client_credentials_token()
        
        headers = {"Authorization": f"Bearer {access_token}"}
        params = {
            "q": artist_name,
            "type": "artist",
            "limit": 1
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/search", 
                headers=headers, 
                params=params
            )
            
            if response.status_code != 200:
                return None
            
            data = response.json()
            artists = data.get("artists", {}).get("items", [])
            
            if not artists:
                # Cache negative results too
                self._set_cache(cache_key, None)
                return None
            
            artist = artists[0]
            result = SpotifyArtist(
                id=artist["id"],
                name=artist["name"],
                images=[SpotifyImage(**img) for img in artist["images"]],
                followers=artist["followers"]["total"],
                genres=artist["genres"],
                popularity=artist["popularity"]
            )
            
            # Cache the result
            self._set_cache(cache_key, result)
            return result
    
    async def get_artist_by_id(self, artist_id: str) -> Optional[SpotifyArtist]:
        """Get artist data by Spotify ID"""
        access_token = await self.get_client_credentials_token()
        
        headers = {"Authorization": f"Bearer {access_token}"}
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/artists/{artist_id}", 
                headers=headers
            )
            
            if response.status_code != 200:
                return None
            
            artist = response.json()
            return SpotifyArtist(
                id=artist["id"],
                name=artist["name"],
                images=[SpotifyImage(**img) for img in artist["images"]],
                followers=artist["followers"]["total"],
                genres=artist["genres"],
                popularity=artist["popularity"]
            )
    
    async def search_track(self, track_name: str, artist_name: str, refresh_cache: bool = False) -> Optional[SpotifyTrack]:
        """Search for track and return track data with album artwork"""
        # Check cache first
        cache_key = self._get_cache_key("track", f"{track_name}|{artist_name}".lower())
        cached_result = self._get_from_cache(cache_key, refresh_cache)
        if cached_result is not None:
            return cached_result
        
        access_token = await self.get_client_credentials_token()
        
        headers = {"Authorization": f"Bearer {access_token}"}
        # Search for both track and artist for better accuracy
        query = f"track:{track_name} artist:{artist_name}"
        params = {
            "q": query,
            "type": "track",
            "limit": 1
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/search", 
                headers=headers, 
                params=params
            )
            
            if response.status_code != 200:
                return None
            
            data = response.json()
            tracks = data.get("tracks", {}).get("items", [])
            
            if not tracks:
                # Cache negative results too
                self._set_cache(cache_key, None)
                return None
            
            track = tracks[0]
            result = SpotifyTrack(
                id=track["id"],
                name=track["name"],
                artists=[artist["name"] for artist in track["artists"]],
                album_name=track["album"]["name"],
                album_images=[SpotifyImage(**img) for img in track["album"]["images"]]
            )
            
            # Cache the result
            self._set_cache(cache_key, result)
            return result
    
    async def search_show(self, show_name: str) -> Optional[SpotifyShow]:
        """Search for podcast show and return show data with images"""
        # Check cache first
        cache_key = self._get_cache_key("show", show_name.lower())
        cached_result = self._get_from_cache(cache_key)
        if cached_result is not None:
            return cached_result
        
        access_token = await self.get_client_credentials_token()
        
        headers = {"Authorization": f"Bearer {access_token}"}
        params = {
            "q": show_name,
            "type": "show",
            "limit": 1
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/search", 
                headers=headers, 
                params=params
            )
            
            if response.status_code != 200:
                return None
            
            data = response.json()
            shows = data.get("shows", {}).get("items", [])
            
            if not shows:
                # Cache negative results too
                self._set_cache(cache_key, None)
                return None
            
            show = shows[0]
            result = SpotifyShow(
                id=show["id"],
                name=show["name"],
                description=show["description"],
                images=[SpotifyImage(**img) for img in show["images"]],
                publisher=show["publisher"]
            )
            
            # Cache the result
            self._set_cache(cache_key, result)
            return result
    
    async def search_episode(self, episode_name: str, show_name: str = None) -> Optional[SpotifyEpisode]:
        """Search for podcast episode and return episode data with images"""
        # Check cache first
        cache_key = self._get_cache_key("episode", f"{episode_name}|{show_name or ''}".lower())
        cached_result = self._get_from_cache(cache_key)
        if cached_result is not None:
            return cached_result
        
        access_token = await self.get_client_credentials_token()
        
        headers = {"Authorization": f"Bearer {access_token}"}
        # Build search query
        query = episode_name
        if show_name:
            query = f"{episode_name} show:{show_name}"
        
        params = {
            "q": query,
            "type": "episode",
            "limit": 1
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/search", 
                headers=headers, 
                params=params
            )
            
            if response.status_code != 200:
                return None
            
            data = response.json()
            episodes = data.get("episodes", {}).get("items", [])
            
            if not episodes:
                # Cache negative results too
                self._set_cache(cache_key, None)
                return None
            
            episode = episodes[0]
            
            # Create show object from episode data
            show_data = episode["show"]
            show = SpotifyShow(
                id=show_data["id"],
                name=show_data["name"],
                description=show_data["description"],
                images=[SpotifyImage(**img) for img in show_data["images"]],
                publisher=show_data["publisher"]
            )
            
            result = SpotifyEpisode(
                id=episode["id"],
                name=episode["name"],
                description=episode["description"],
                images=[SpotifyImage(**img) for img in episode["images"]],
                show=show
            )
            
            # Cache the result
            self._set_cache(cache_key, result)
            return result


# Global instance
spotify_service = SpotifyService()