from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database.connection import get_db
from database.schema import SpotifyStream

router = APIRouter()

@router.get("/stats/totalTime")
async def get_total_listening_time(db: Session = Depends(get_db)):
    """Get total listening time stats in ms. Includes Tracks, Episodes and Audiobooks"""

    result = db.query(func.sum(SpotifyStream.ms_played).label('total_ms_played')).first()

    total_hours = round((result.total_ms_played or 0) / (1000 * 60 * 60))
    total_days = round(total_hours / 24)

    return {
        "total_ms": result.total_ms_played or 0,
        "total_hours": total_hours,
        "total_days": total_days
    }