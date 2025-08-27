import httpx
import base64
from typing import Optional, List
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
        
        if not all([self.client_id, self.client_secret, self.redirect_uri]):
            raise ValueError("Missing Spotify API credentials in environment variables")
    
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
                return None
            
            artist = artists[0]
            return SpotifyArtist(
                id=artist["id"],
                name=artist["name"],
                images=[SpotifyImage(**img) for img in artist["images"]],
                followers=artist["followers"]["total"],
                genres=artist["genres"],
                popularity=artist["popularity"]
            )
    
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
                return None
            
            track = tracks[0]
            return SpotifyTrack(
                id=track["id"],
                name=track["name"],
                artists=[artist["name"] for artist in track["artists"]],
                album_name=track["album"]["name"],
                album_images=[SpotifyImage(**img) for img in track["album"]["images"]]
            )


# Global instance
spotify_service = SpotifyService()