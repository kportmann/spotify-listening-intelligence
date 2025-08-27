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


class SpotifyService:
    def __init__(self):
        settings = get_settings()
        self.client_id = settings.spotify.client_id
        self.client_secret = settings.spotify.client_secret
        self.redirect_uri = settings.spotify.redirect_uri
        self.base_url = "https://api.spotify.com/v1"
        self.auth_url = "https://accounts.spotify.com/api/token"
        
        # Simple in-memory cache with 15-minute TTL
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._cache_ttl = 15 * 60  # 15 minutes in seconds
        
        if not all([self.client_id, self.client_secret, self.redirect_uri]):
            raise ValueError("Missing Spotify API credentials in environment variables")
    
    def _get_cache_key(self, prefix: str, identifier: str) -> str:
        """Generate cache key for storing API responses"""
        return f"{prefix}:{identifier}"
    
    def _is_cache_valid(self, cache_entry: Dict[str, Any]) -> bool:
        """Check if cache entry is still valid (within TTL)"""
        return time.time() - cache_entry["timestamp"] < self._cache_ttl
    
    def _get_from_cache(self, cache_key: str) -> Optional[Any]:
        """Get item from cache if valid"""
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
    
    async def search_artist(self, artist_name: str) -> Optional[SpotifyArtist]:
        """Search for artist and return artist data with images"""
        # Check cache first
        cache_key = self._get_cache_key("artist", artist_name.lower())
        cached_result = self._get_from_cache(cache_key)
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
    
    async def search_track(self, track_name: str, artist_name: str) -> Optional[SpotifyTrack]:
        """Search for track and return track data with album artwork"""
        # Check cache first
        cache_key = self._get_cache_key("track", f"{track_name}|{artist_name}".lower())
        cached_result = self._get_from_cache(cache_key)
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


# Global instance
spotify_service = SpotifyService()