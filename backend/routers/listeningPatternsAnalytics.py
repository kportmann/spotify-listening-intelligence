from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
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