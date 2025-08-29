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