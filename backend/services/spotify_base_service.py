import httpx
import base64
import time
from typing import Optional, Dict, Any
from fastapi import HTTPException
from config.settings import get_settings


class SpotifyBaseService:
    """Base class for Spotify services with shared authentication and caching"""
    
    def __init__(self):
        settings = get_settings()
        self.client_id = settings.spotify.client_id
        self.client_secret = settings.spotify.client_secret
        self.redirect_uri = settings.spotify.redirect_uri
        self.base_url = "https://api.spotify.com/v1"
        self.auth_url = "https://accounts.spotify.com/api/token"
        
        # Two-tier caching: 15min for success, 5min for null results to allow retries
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._cache_ttl = 15 * 60
        self._null_cache_ttl = 5 * 60
        
        if not all([self.client_id, self.client_secret, self.redirect_uri]):
            raise ValueError("Missing Spotify API credentials in environment variables")
    
    def clear_null_caches(self) -> None:
        keys_to_remove = []
        for key, entry in self._cache.items():
            if entry["data"] is None:
                keys_to_remove.append(key)
        
        for key in keys_to_remove:
            del self._cache[key]
        
        print(f"Cleared {len(keys_to_remove)} null cache entries")
    
    def get_cache_stats(self) -> Dict[str, int]:
        total_entries = len(self._cache)
        null_entries = sum(1 for entry in self._cache.values() if entry["data"] is None)
        return {
            "total_entries": total_entries,
            "null_entries": null_entries,
            "valid_entries": total_entries - null_entries
        }
    
    def _get_cache_key(self, prefix: str, identifier: str) -> str:
        return f"{prefix}:{identifier}"
    
    def _is_cache_valid(self, cache_entry: Dict[str, Any]) -> bool:
        ttl = self._null_cache_ttl if cache_entry["data"] is None else self._cache_ttl
        return time.time() - cache_entry["timestamp"] < ttl
    
    def _get_from_cache(self, cache_key: str, refresh_cache: bool = False) -> Optional[Any]:
        if refresh_cache and cache_key in self._cache:
            del self._cache[cache_key]
            return None
            
        if cache_key in self._cache:
            entry = self._cache[cache_key]
            if self._is_cache_valid(entry):
                return entry["data"]
            else:
                del self._cache[cache_key]
        return None
    
    def _set_cache(self, cache_key: str, data: Any) -> None:
        self._cache[cache_key] = {
            "data": data,
            "timestamp": time.time()
        }
    
    async def get_client_credentials_token(self) -> str:
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
    
    def _extract_spotify_id(self, uri: str) -> Optional[str]:
        """Extract ID from URI: 'spotify:track:4iV5W9uYEdYUVa79Axb7Rh' -> '4iV5W9uYEdYUVa79Axb7Rh'"""
        if not uri or not uri.startswith("spotify:"):
            return None
        parts = uri.split(":")
        return parts[2] if len(parts) >= 3 else None