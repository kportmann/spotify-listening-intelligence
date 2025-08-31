import httpx
from typing import Optional, List, Dict
from pydantic import BaseModel
from .spotify_base_service import SpotifyBaseService


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


class SpotifyService(SpotifyBaseService):
    """Service for single Spotify API requests and search operations"""
    
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

    async def get_artists_batch_by_names(self, artist_names: List[str]) -> Dict[str, SpotifyArtist]:
        """
        Get multiple artists by names using intelligent caching
        Combines individual searches with batch API where possible
        Returns dict mapping artist_name -> SpotifyArtist
        """
        if not artist_names:
            return {}
        
        from .spotify_batch_service import spotify_batch_service
            
        results = {}
        uncached_names = []
        
        # Phase 1: Check cache for name-to-ID mappings
        name_to_id_map = {}
        for name in artist_names:
            cache_key = f"name_to_id:{name.lower()}"
            cached_id = self._get_from_cache(cache_key)
            if cached_id:
                name_to_id_map[name] = cached_id
            else:
                uncached_names.append(name)
        
        # Phase 2: Resolve uncached names to IDs (individual searches, but cached)
        for name in uncached_names:
            artist = await self.search_artist(name)  # This already caches the full artist
            if artist:
                name_to_id_map[name] = artist.id
                # Cache the name-to-ID mapping for future use
                self._set_cache(f"name_to_id:{name.lower()}", artist.id)
                results[name] = artist  # Already have the full data
        
        # Phase 3: Batch fetch artists we only have IDs for (from cached mappings)
        ids_to_fetch = []
        names_for_ids = {}
        
        for name, artist_id in name_to_id_map.items():
            if name not in results:  # Don't have full artist data yet
                ids_to_fetch.append(artist_id)
                names_for_ids[artist_id] = name
        
        if ids_to_fetch:
            batch_artists = await spotify_batch_service.get_several_artists(ids_to_fetch)
            for artist in batch_artists:
                original_name = names_for_ids.get(artist.id)
                if original_name:
                    results[original_name] = artist
        
        return results

    async def get_shows_batch_by_names(self, show_names: List[str]) -> Dict[str, SpotifyShow]:
        """
        Get multiple shows by names using intelligent caching
        Similar to artist batch approach but for podcast shows
        Returns dict mapping show_name -> SpotifyShow
        """
        if not show_names:
            return {}
        
        from .spotify_batch_service import spotify_batch_service
            
        results = {}
        uncached_names = []
        
        # Phase 1: Check cache for name-to-ID mappings
        name_to_id_map = {}
        for name in show_names:
            cache_key = f"show_name_to_id:{name.lower()}"
            cached_id = self._get_from_cache(cache_key)
            if cached_id:
                name_to_id_map[name] = cached_id
            else:
                uncached_names.append(name)
        
        # Phase 2: Resolve uncached names to IDs (individual searches, but cached)
        for name in uncached_names:
            show = await self.search_show(name)  # This already caches the full show
            if show:
                name_to_id_map[name] = show.id
                # Cache the name-to-ID mapping for future use
                self._set_cache(f"show_name_to_id:{name.lower()}", show.id)
                results[name] = show  # Already have the full data
        
        # Phase 3: Batch fetch shows we only have IDs for (from cached mappings)
        ids_to_fetch = []
        names_for_ids = {}
        
        for name, show_id in name_to_id_map.items():
            if name not in results:  # Don't have full show data yet
                ids_to_fetch.append(show_id)
                names_for_ids[show_id] = name
        
        if ids_to_fetch:
            batch_shows = await spotify_batch_service.get_several_shows(ids_to_fetch)
            for show in batch_shows:
                original_name = names_for_ids.get(show.id)
                if original_name:
                    results[original_name] = show
        
        return results


# Global instance
spotify_service = SpotifyService()