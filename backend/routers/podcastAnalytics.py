from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, extract
from database.connection import get_db
from database.schema import SpotifyStream
from services.spotify_service import spotify_service
from services.spotify_batch_service import spotify_batch_service
from typing import Optional, List
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel

router = APIRouter()


class PodcastImageRequest(BaseModel):
    episodes: Optional[List[dict]] = None  # [{"episode_name": "...", "show_name": "..."}]
    shows: Optional[List[str]] = None


@router.post("/images/batch")
async def get_batch_podcast_images(request: PodcastImageRequest):
    """Fetch images for podcast episodes and shows in a single request"""
    results = {
        "episode_images": {},
        "show_images": {}
    }
    
    # Fetch episode images
    if request.episodes:
        for episode_info in request.episodes:
            episode_name = episode_info["episode_name"]
            show_name = episode_info.get("show_name")
            key = f"{episode_name}|{show_name or ''}"
            
            try:
                spotify_episode = await spotify_service.search_episode(episode_name, show_name)
                if spotify_episode and spotify_episode.images:
                    # Get medium size image (usually index 1) or first available
                    image_url = spotify_episode.images[1].url if len(spotify_episode.images) > 1 else spotify_episode.images[0].url
                    results["episode_images"][key] = image_url
                else:
                    results["episode_images"][key] = None
            except Exception as e:
                print(f"Failed to fetch image for episode {episode_name}: {e}")
                results["episode_images"][key] = None
    
    # Fetch show images
    if request.shows:
        for show_name in request.shows:
            try:
                spotify_show = await spotify_service.search_show(show_name)
                if spotify_show and spotify_show.images:
                    # Get medium size image (usually index 1) or first available
                    image_url = spotify_show.images[1].url if len(spotify_show.images) > 1 else spotify_show.images[0].url
                    results["show_images"][show_name] = image_url
                else:
                    results["show_images"][show_name] = None
            except Exception as e:
                print(f"Failed to fetch image for show {show_name}: {e}")
                results["show_images"][show_name] = None
    
    return results


@router.get("/top/episodes")
async def get_top_episodes(
    db: Session = Depends(get_db),
    period: Optional[str] = Query("all_time", description="Time period: 7d, 1m, 3m, 6m, 1y, all_time"),
    limit: Optional[int] = Query(50, description="Number of results to return"),
    include_images: Optional[bool] = Query(False, description="Include episode images from Spotify API")
):
    """Get top podcast episodes by listening time"""
    
    query = db.query(
        SpotifyStream.episode_name.label('episode_name'),
        SpotifyStream.episode_show_name.label('show_name'),
        func.sum(SpotifyStream.ms_played).label('total_ms'),
        func.count(SpotifyStream.id).label('play_count')
    ).filter(
        SpotifyStream.spotify_episode_uri.isnot(None),
        SpotifyStream.episode_name.isnot(None)
    )
    
    # Apply time filter
    if period != "all_time":
        # Check if period is a year (4 digits)
        if period.isdigit() and len(period) == 4:
            year = int(period)
            query = query.filter(extract('year', SpotifyStream.ts) == year)
        else:
            cutoff_date = _get_cutoff_date(period)
            if cutoff_date:
                query = query.filter(SpotifyStream.ts >= cutoff_date)
    
    results = query.group_by(
        SpotifyStream.episode_name,
        SpotifyStream.episode_show_name
    ).order_by(
        desc('total_ms')
    ).limit(limit).all()
    
    # Basic episode data (fast)
    episode_data_list = []
    for result in results:
        episode_data = {
            "episode_name": result.episode_name,
            "show_name": result.show_name,
            "total_ms": result.total_ms,
            "total_hours": round(result.total_ms / (1000 * 60 * 60), 1),
            "play_count": result.play_count,
            "image_url": None
        }
        episode_data_list.append(episode_data)
    
    # Only fetch images if explicitly requested
    if include_images:
        for episode_data in episode_data_list:
            try:
                spotify_episode = await spotify_service.search_episode(
                    episode_data["episode_name"], 
                    episode_data["show_name"]
                )
                if spotify_episode and spotify_episode.images:
                    # Get medium size image (usually index 1) or first available
                    image_url = spotify_episode.images[1].url if len(spotify_episode.images) > 1 else spotify_episode.images[0].url
                    episode_data["image_url"] = image_url
            except Exception as e:
                # Continue without image if Spotify API fails
                print(f"Failed to fetch image for episode {episode_data['episode_name']}: {e}")
                pass
    
    return episode_data_list


@router.get("/top/shows")
async def get_top_shows(
    db: Session = Depends(get_db),
    period: Optional[str] = Query("all_time", description="Time period: 7d, 1m, 3m, 6m, 1y, all_time"),
    limit: Optional[int] = Query(50, description="Number of results to return"),
    include_images: Optional[bool] = Query(False, description="Include show images from Spotify API")
):
    """Get top podcast shows by listening time"""
    
    query = db.query(
        SpotifyStream.episode_show_name.label('show_name'),
        func.sum(SpotifyStream.ms_played).label('total_ms'),
        func.count(SpotifyStream.id).label('play_count')
    ).filter(
        SpotifyStream.spotify_episode_uri.isnot(None),
        SpotifyStream.episode_show_name.isnot(None)
    )
    
    # Apply time filter
    if period != "all_time":
        # Check if period is a year (4 digits)
        if period.isdigit() and len(period) == 4:
            year = int(period)
            query = query.filter(extract('year', SpotifyStream.ts) == year)
        else:
            cutoff_date = _get_cutoff_date(period)
            if cutoff_date:
                query = query.filter(SpotifyStream.ts >= cutoff_date)
    
    results = query.group_by(
        SpotifyStream.episode_show_name
    ).order_by(
        desc('total_ms')
    ).limit(limit).all()
    
    # Basic show data (fast)
    show_data_list = []
    for result in results:
        show_data = {
            "show_name": result.show_name,
            "total_ms": result.total_ms,
            "total_hours": round(result.total_ms / (1000 * 60 * 60), 1),
            "play_count": result.play_count,
            "image_url": None
        }
        show_data_list.append(show_data)
    
    # Only fetch images if explicitly requested
    if include_images:
        try:
            # Use batch show lookup by names - combines individual searches with batch API
            show_names = [show_data["show_name"] for show_data in show_data_list]
            batch_shows = await spotify_service.get_shows_batch_by_names(show_names)
            
            # Enhance show data with images from batch results
            for show_data in show_data_list:
                show_name = show_data["show_name"]
                if show_name in batch_shows:
                    spotify_show = batch_shows[show_name]
                    if spotify_show.images:
                        # Get medium size image (usually index 1) or first available
                        image_url = spotify_show.images[1].url if len(spotify_show.images) > 1 else spotify_show.images[0].url
                        show_data["image_url"] = image_url
        
        except Exception as e:
            print(f"Batch show fetching failed, falling back to individual searches: {e}")
            # Fallback to individual searches if batch fails
            for show_data in show_data_list:
                try:
                    spotify_show = await spotify_service.search_show(show_data["show_name"])
                    if spotify_show and spotify_show.images:
                        image_url = spotify_show.images[1].url if len(spotify_show.images) > 1 else spotify_show.images[0].url
                        show_data["image_url"] = image_url
                except Exception as e2:
                    print(f"Failed to fetch image for show {show_data['show_name']}: {e2}")
                    pass
    
    return show_data_list


@router.get("/top/audiobooks")
async def get_top_audiobooks(
    db: Session = Depends(get_db),
    period: Optional[str] = Query("all_time", description="Time period: 7d, 1m, 3m, 6m, 1y, all_time"),
    limit: Optional[int] = Query(50, description="Number of results to return")
):
    """Get top audiobooks by listening time"""
    
    query = db.query(
        SpotifyStream.audiobook_title.label('audiobook_title'),
        func.sum(SpotifyStream.ms_played).label('total_ms'),
        func.count(SpotifyStream.id).label('play_count')
    ).filter(
        SpotifyStream.audiobook_chapter_uri.isnot(None),
        SpotifyStream.audiobook_title.isnot(None)
    )
    
    # Apply time filter
    if period != "all_time":
        # Check if period is a year (4 digits)
        if period.isdigit() and len(period) == 4:
            year = int(period)
            query = query.filter(extract('year', SpotifyStream.ts) == year)
        else:
            cutoff_date = _get_cutoff_date(period)
            if cutoff_date:
                query = query.filter(SpotifyStream.ts >= cutoff_date)
    
    results = query.group_by(
        SpotifyStream.audiobook_title
    ).order_by(
        desc('total_ms')
    ).limit(limit).all()
    
    return [
        {
            "audiobook_title": result.audiobook_title,
            "total_ms": result.total_ms,
            "total_hours": round(result.total_ms / (1000 * 60 * 60), 1),
            "play_count": result.play_count
        }
        for result in results
    ]


def _get_cutoff_date(period: str) -> Optional[datetime]:
    """Helper function to calculate cutoff date based on period"""
    now = datetime.now(timezone.utc)
    
    period_mapping = {
        "7d": timedelta(days=7),
        "1m": timedelta(days=30),
        "3m": timedelta(days=90),
        "6m": timedelta(days=180),
        "1y": timedelta(days=365)
    }
    
    if period in period_mapping:
        return now - period_mapping[period]
    
    return None