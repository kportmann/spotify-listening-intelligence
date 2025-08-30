from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, case
from database.connection import get_db
from database.schema import SpotifyStream

router = APIRouter()

@router.get("/listening-heatmap")
async def get_listening_heatmap(year: int = None, timezone: str = "UTC", db: Session = Depends(get_db)):
    """Get listening heatmap data organized by hour of day and day of week
    
    Args:
        year: Optional year filter
        timezone: Timezone for conversion (e.g., 'Europe/Zurich', 'America/New_York', 'UTC')
    """
    
    # Base query with optional year filter
    base_query = db.query(SpotifyStream).filter(
      SpotifyStream.spotify_track_uri.isnot(None)
      )
    
    if year:
        base_query = base_query.filter(extract('year', SpotifyStream.ts) == year)
    
    # Convert timestamps to specified timezone for analysis
    if timezone == "UTC":
        # Use timestamps as-is (they're already in UTC)
        ts_converted = SpotifyStream.ts
    else:
        # Convert UTC timestamps to specified timezone
        ts_converted = func.timezone(timezone, SpotifyStream.ts)
    
    # Get listening data grouped by day of week (0=Monday) and hour of day
    heatmap_data = base_query.with_entities(
        extract('dow', ts_converted).label('day_of_week'),  # 0=Sunday, 1=Monday, etc.
        extract('hour', ts_converted).label('hour_of_day'),
        func.count(SpotifyStream.id).label('stream_count'),
        func.sum(SpotifyStream.ms_played).label('total_ms')
    ).group_by(
        extract('dow', ts_converted),
        extract('hour', ts_converted)
    ).all()
    
    # Initialize 7x24 matrix (7 days x 24 hours)
    # Convert Sunday (0) to index 6, Monday (1) to 0, etc.
    heatmap_matrix = []
    day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    
    for day_idx in range(7):  # Days: Mon=0 to Sun=6
        day_data = []
        for hour in range(24):  # Hours: 0-23
            day_data.append({
                'stream_count': 0,
                'total_ms': 0,
                'total_minutes': 0
            })
        heatmap_matrix.append(day_data)
    
    # Fill the matrix with actual data
    max_streams = 0
    max_minutes = 0
    
    for row in heatmap_data:
        dow_postgres = int(row.day_of_week)  # PostgreSQL: 0=Sunday, 1=Monday, ..., 6=Saturday
        # Convert PostgreSQL day of week to our array index (Monday=0, Sunday=6)
        day_idx = (dow_postgres + 6) % 7  # Sunday(0)->6, Monday(1)->0, Tuesday(2)->1, etc.
        hour = int(row.hour_of_day)
        
        stream_count = row.stream_count or 0
        total_ms = row.total_ms or 0
        total_minutes = round(total_ms / (1000 * 60))
        
        heatmap_matrix[day_idx][hour] = {
            'stream_count': stream_count,
            'total_ms': total_ms,
            'total_minutes': total_minutes
        }
        
        max_streams = max(max_streams, stream_count)
        max_minutes = max(max_minutes, total_minutes)
    
    # Calculate summary statistics
    total_streams = sum(row.stream_count for row in heatmap_data)
    peak_hour_data = max(heatmap_data, key=lambda x: x.stream_count) if heatmap_data else None
    
    peak_hour_info = None
    if peak_hour_data:
        dow_postgres = int(peak_hour_data.day_of_week)
        day_idx = (dow_postgres + 6) % 7
        peak_hour_info = {
            'day': day_names[day_idx],
            'hour': int(peak_hour_data.hour_of_day),
            'stream_count': peak_hour_data.stream_count,
            'total_minutes': round(peak_hour_data.total_ms / (1000 * 60))
        }
    
    return {
        'heatmap_data': heatmap_matrix,
        'day_names': day_names,
        'max_values': {
            'streams': max_streams,
            'minutes': max_minutes
        },
        'summary': {
            'total_streams': total_streams,
            'peak_hour': peak_hour_info
        }
    }


@router.get("/monthly-trends")
async def get_monthly_trends(year: int = None, timezone: str = "UTC", db: Session = Depends(get_db)):
    """Get monthly listening trends showing activity by month
    
    Args:
        year: Optional year filter
        timezone: Timezone for conversion (e.g., 'Europe/Zurich', 'America/New_York', 'UTC')
    """
    
    # Base query
    base_query = db.query(SpotifyStream).filter(
        SpotifyStream.spotify_track_uri.isnot(None)
    )
    
    if year:
        base_query = base_query.filter(extract('year', SpotifyStream.ts) == year)
    
    # Convert timestamps to specified timezone for analysis
    if timezone == "UTC":
        ts_converted = SpotifyStream.ts
    else:
        ts_converted = func.timezone(timezone, SpotifyStream.ts)
    
    # Get monthly data
    monthly_data = base_query.with_entities(
        extract('year', ts_converted).label('year'),
        extract('month', ts_converted).label('month'),
        func.count(SpotifyStream.id).label('stream_count'),
        func.sum(SpotifyStream.ms_played).label('total_ms'),
        func.avg(SpotifyStream.ms_played).label('avg_ms_per_stream')
    ).group_by(
        extract('year', ts_converted),
        extract('month', ts_converted)
    ).order_by(
        extract('year', ts_converted),
        extract('month', ts_converted)
    ).all()
    
    # Format the data
    monthly_trends = []
    month_names = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ]
    
    for row in monthly_data:
        monthly_trends.append({
            'year': int(row.year),
            'month': int(row.month),
            'month_name': month_names[int(row.month) - 1],
            'stream_count': row.stream_count,
            'total_minutes': round((row.total_ms or 0) / (1000 * 60)),
            'avg_minutes_per_stream': round((row.avg_ms_per_stream or 0) / (1000 * 60), 2)
        })
    
    # Calculate peak month by minutes
    peak_month_by_minutes = None
    peak_month_by_streams = None
    
    if monthly_trends:
        peak_month_by_minutes = max(monthly_trends, key=lambda x: x['total_minutes'])
        peak_month_by_streams = max(monthly_trends, key=lambda x: x['stream_count'])
    
    return {
        'monthly_trends': monthly_trends,
        'total_months': len(monthly_trends),
        'peak_month': {
            'by_minutes': {
                'month_name': peak_month_by_minutes['month_name'] if peak_month_by_minutes else None,
                'year': peak_month_by_minutes['year'] if peak_month_by_minutes else None,
                'total_minutes': peak_month_by_minutes['total_minutes'] if peak_month_by_minutes else 0
            },
            'by_streams': {
                'month_name': peak_month_by_streams['month_name'] if peak_month_by_streams else None,
                'year': peak_month_by_streams['year'] if peak_month_by_streams else None,
                'stream_count': peak_month_by_streams['stream_count'] if peak_month_by_streams else 0
            }
        }
    }

@router.get("/seasonal-trends")
async def get_seasonal_trends(year: int = None, timezone: str = "UTC", db: Session = Depends(get_db)):
    """Get seasonal listening trends (Spring, Summer, Fall, Winter)
    
    Args:
        year: Optional year filter
        timezone: Timezone for conversion (e.g., 'Europe/Zurich', 'America/New_York', 'UTC')
    """
    
    # Base query
    base_query = db.query(SpotifyStream).filter(
        SpotifyStream.spotify_track_uri.isnot(None)
    )
    
    if year:
        base_query = base_query.filter(extract('year', SpotifyStream.ts) == year)
    
    # Convert timestamps to specified timezone for analysis
    if timezone == "UTC":
        ts_converted = SpotifyStream.ts
    else:
        ts_converted = func.timezone(timezone, SpotifyStream.ts)
    
    # Get data grouped by month first
    monthly_data = base_query.with_entities(
        extract('year', ts_converted).label('year'),
        extract('month', ts_converted).label('month'),
        func.count(SpotifyStream.id).label('stream_count'),
        func.sum(SpotifyStream.ms_played).label('total_ms')
    ).group_by(
        extract('year', ts_converted),
        extract('month', ts_converted)
    ).all()
    
    # Group by seasons
    # Spring: March, April, May (3, 4, 5)
    # Summer: June, July, August (6, 7, 8)
    # Fall: September, October, November (9, 10, 11)
    # Winter: December, January, February (12, 1, 2)
    
    seasonal_data = {
        'Spring': {'stream_count': 0, 'total_ms': 0, 'years': set()},
        'Summer': {'stream_count': 0, 'total_ms': 0, 'years': set()},
        'Fall': {'stream_count': 0, 'total_ms': 0, 'years': set()},
        'Winter': {'stream_count': 0, 'total_ms': 0, 'years': set()}
    }
    
    for row in monthly_data:
        month = int(row.month)
        stream_count = row.stream_count or 0
        total_ms = row.total_ms or 0
        year = int(row.year)
        
        if month in [3, 4, 5]:  # Spring
            seasonal_data['Spring']['stream_count'] += stream_count
            seasonal_data['Spring']['total_ms'] += total_ms
            seasonal_data['Spring']['years'].add(year)
        elif month in [6, 7, 8]:  # Summer
            seasonal_data['Summer']['stream_count'] += stream_count
            seasonal_data['Summer']['total_ms'] += total_ms
            seasonal_data['Summer']['years'].add(year)
        elif month in [9, 10, 11]:  # Fall
            seasonal_data['Fall']['stream_count'] += stream_count
            seasonal_data['Fall']['total_ms'] += total_ms
            seasonal_data['Fall']['years'].add(year)
        else:  # Winter (12, 1, 2)
            seasonal_data['Winter']['stream_count'] += stream_count
            seasonal_data['Winter']['total_ms'] += total_ms
            seasonal_data['Winter']['years'].add(year)
    
    # Format the results
    seasonal_trends = []
    for season, data in seasonal_data.items():
        total_minutes = round(data['total_ms'] / (1000 * 60))
        avg_streams_per_year = data['stream_count'] / max(len(data['years']), 1)
        avg_minutes_per_year = total_minutes / max(len(data['years']), 1)
        
        seasonal_trends.append({
            'season': season,
            'total_streams': data['stream_count'],
            'total_minutes': total_minutes,
            'years_covered': len(data['years']),
            'avg_streams_per_year': round(avg_streams_per_year),
            'avg_minutes_per_year': round(avg_minutes_per_year)
        })
    
    # Calculate peak season by minutes
    peak_season_by_minutes = None
    peak_season_by_streams = None
    
    if seasonal_trends:
        peak_season_by_minutes = max(seasonal_trends, key=lambda x: x['total_minutes'])
        peak_season_by_streams = max(seasonal_trends, key=lambda x: x['total_streams'])
    
    return {
        'seasonal_trends': seasonal_trends,
        'peak_season': {
            'by_minutes': {
                'season': peak_season_by_minutes['season'] if peak_season_by_minutes else None,
                'total_minutes': peak_season_by_minutes['total_minutes'] if peak_season_by_minutes else 0
            },
            'by_streams': {
                'season': peak_season_by_streams['season'] if peak_season_by_streams else None,
                'total_streams': peak_season_by_streams['total_streams'] if peak_season_by_streams else 0
            }
        }
    }

@router.get("/skip-rate-analysis")
async def get_skip_rate_analysis(year: int = None, db: Session = Depends(get_db)):
    """Get skip rate analysis showing skip patterns and statistics
    
    Args:
        year: Optional year filter
    """
    
    # Base query for music tracks only
    base_query = db.query(SpotifyStream).filter(
        SpotifyStream.spotify_track_uri.isnot(None)
    )
    
    if year:
        base_query = base_query.filter(extract('year', SpotifyStream.ts) == year)
    
    # Overall skip rate statistics
    total_streams = base_query.count()
    skipped_streams = base_query.filter(SpotifyStream.skipped == True).count()
    skip_rate = (skipped_streams / total_streams * 100) if total_streams > 0 else 0
    
    # Skip rate by artist (filter out 'Spotify' as it appears to be invalid data)
    artist_skip_data = base_query.with_entities(
        SpotifyStream.master_metadata_album_artist_name.label('artist_name'),
        func.count(SpotifyStream.id).label('total_streams'),
        func.sum(case((SpotifyStream.skipped == True, 1), else_=0)).label('skipped_count')
    ).filter(
        SpotifyStream.master_metadata_album_artist_name.isnot(None),
        SpotifyStream.master_metadata_album_artist_name != 'Spotify'  # Filter out invalid 'Spotify' entries
    ).group_by(
        SpotifyStream.master_metadata_album_artist_name
    ).having(
        func.count(SpotifyStream.id) >= 5  # Only artists with 5+ streams
    ).order_by(
        func.count(SpotifyStream.id).desc()
    ).limit(50).all()  # Increased limit for better analysis
    
    # Format artist data
    artist_skip_rates = []
    for row in artist_skip_data:
        total = row.total_streams or 0
        skipped = row.skipped_count or 0
        skip_percentage = (skipped / total * 100) if total > 0 else 0
        
        artist_skip_rates.append({
            'artist_name': row.artist_name,
            'total_streams': total,
            'skipped_count': skipped,
            'skip_rate': round(skip_percentage, 1)
        })
    
    # Skip reasons analysis
    skip_reasons_data = base_query.filter(
        SpotifyStream.skipped == True,
        SpotifyStream.reason_end.isnot(None)
    ).with_entities(
        SpotifyStream.reason_end.label('reason'),
        func.count(SpotifyStream.id).label('count')
    ).group_by(
        SpotifyStream.reason_end
    ).order_by(
        func.count(SpotifyStream.id).desc()
    ).limit(10).all()  # Limit to top 10 skip reasons
    
    skip_reasons = [
        {'reason': row.reason, 'count': row.count}
        for row in skip_reasons_data
    ]
    
    # Track-level skip analysis - Most skipped tracks
    track_skip_data = base_query.with_entities(
        SpotifyStream.master_metadata_track_name.label('track_name'),
        SpotifyStream.master_metadata_album_artist_name.label('artist_name'),
        func.count(SpotifyStream.id).label('total_streams'),
        func.sum(case((SpotifyStream.skipped == True, 1), else_=0)).label('skipped_count'),
        func.avg(SpotifyStream.ms_played).label('avg_ms_played')
    ).filter(
        SpotifyStream.master_metadata_track_name.isnot(None),
        SpotifyStream.master_metadata_album_artist_name.isnot(None),
        SpotifyStream.master_metadata_album_artist_name != 'Spotify'  # Filter out invalid entries
    ).group_by(
        SpotifyStream.master_metadata_track_name,
        SpotifyStream.master_metadata_album_artist_name
    ).having(
        func.count(SpotifyStream.id) >= 3  # Only tracks with 3+ streams
    ).order_by(
        func.sum(case((SpotifyStream.skipped == True, 1), else_=0)).desc()
    ).limit(30).all()
    
    # Format track skip data
    track_skip_rates = []
    for row in track_skip_data:
        total = row.total_streams or 0
        skipped = row.skipped_count or 0
        skip_percentage = (skipped / total * 100) if total > 0 else 0
        avg_seconds = round((row.avg_ms_played or 0) / 1000, 1)
        
        track_skip_rates.append({
            'track_name': row.track_name,
            'artist_name': row.artist_name,
            'total_streams': total,
            'skip_count': skipped,
            'skip_rate': round(skip_percentage, 1),
            'avg_skip_position': avg_seconds
        })
    
    # Most completed tracks analysis
    completed_tracks_data = base_query.with_entities(
        SpotifyStream.master_metadata_track_name.label('track_name'),
        SpotifyStream.master_metadata_album_artist_name.label('artist_name'),
        func.count(SpotifyStream.id).label('total_streams'),
        func.sum(case((SpotifyStream.skipped == False, 1), else_=0)).label('completed_count'),
        func.avg(SpotifyStream.ms_played).label('avg_ms_played')
    ).filter(
        SpotifyStream.master_metadata_track_name.isnot(None),
        SpotifyStream.master_metadata_album_artist_name.isnot(None),
        SpotifyStream.master_metadata_album_artist_name != 'Spotify'  # Filter out invalid entries
    ).group_by(
        SpotifyStream.master_metadata_track_name,
        SpotifyStream.master_metadata_album_artist_name
    ).having(
        func.count(SpotifyStream.id) >= 3  # Only tracks with 3+ streams
    ).order_by(
        func.sum(case((SpotifyStream.skipped == False, 1), else_=0)).desc()
    ).limit(30).all()
    
    # Format completed tracks data
    completed_tracks = []
    for row in completed_tracks_data:
        total = row.total_streams or 0
        completed = row.completed_count or 0
        completion_percentage = (completed / total * 100) if total > 0 else 0
        avg_listen_percentage = 85 if completion_percentage > 90 else 70  # Estimate based on completion
        
        completed_tracks.append({
            'track_name': row.track_name,
            'artist_name': row.artist_name,
            'play_count': total,
            'completion_rate': round(completion_percentage, 1),
            'avg_listen_percentage': avg_listen_percentage
        })
    
    # Find most and least skipped artists
    most_skipped_artist = max(artist_skip_rates, key=lambda x: x['skip_rate']) if artist_skip_rates else None
    least_skipped_artist = min(artist_skip_rates, key=lambda x: x['skip_rate']) if artist_skip_rates else None
    
    return {
        'overall_stats': {
            'total_streams': total_streams,
            'skipped_streams': skipped_streams,
            'skip_rate': round(skip_rate, 1),
            'completion_rate': round(100 - skip_rate, 1)
        },
        'artist_skip_rates': artist_skip_rates,
        'track_skip_rates': track_skip_rates,
        'completed_tracks': completed_tracks,
        'skip_reasons': skip_reasons,
        'insights': {
            'most_skipped_artist': most_skipped_artist,
            'least_skipped_artist': least_skipped_artist
        }
    }