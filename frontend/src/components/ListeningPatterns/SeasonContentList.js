import './SeasonContentList.css';

export default function SeasonContentList({ title = '', data, loading = false, error = null, isExpanded = false }) {
  if (loading) {
    return (
      <div className="season-content-card">
        <div className="season-loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="season-content-card">
        <div className="season-error">Error: {error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="season-content-card">
        <div className="season-no-data">No data available</div>
      </div>
    );
  }

  const { top_artist: topArtist, top_track: topTrack, primary_genre: primaryGenre, top_genres: topGenres } = data;
  const genresList = (Array.isArray(topGenres) && topGenres.length
    ? topGenres.map(g => g?.genre).filter(Boolean)
    : (topArtist?.genres && topArtist.genres.length ? topArtist.genres : [])
  );
  const displayGenre = primaryGenre || (genresList.length ? genresList[0] : null);
  const hasMultipleGenres = genresList.length > 1;
  const genresText = genresList.length ? genresList.join(', ') : (displayGenre || 'No genre data');

  return (
    <div className="season-content-card">
      <div className="season-top-content-list">
        {topArtist && (
          <div className="season-top-content-item">
            {topArtist.image_url && (
              <div className="season-artist-image">
                <img src={topArtist.image_url} alt={topArtist.artist_name} />
              </div>
            )}
            <div className="season-content-info">
              <div className="season-primary-text">Top Artist: {topArtist.artist_name}</div>
              <div className="season-secondary-text">{topArtist.total_hours}h • {topArtist.play_count} plays</div>
            </div>
          </div>
        )}

        {topTrack && (
          <div className="season-top-content-item">
            {topTrack.image_url && (
              <div className="season-track-image">
                <img src={topTrack.image_url} alt={`${topTrack.track_name} by ${topTrack.artist_name}`} />
              </div>
            )}
            <div className="season-content-info">
              <div className="season-primary-text">Top Track: {topTrack.track_name}</div>
              <div className="season-secondary-text">{topTrack.artist_name} • {topTrack.total_hours}h</div>
            </div>
          </div>
        )}

        <div className="season-top-content-item">
          <div className="season-genre-badge" aria-hidden="true">
            <span className="season-genre-initials">🎧</span>
          </div>
          <div className="season-content-info">
            <div className="season-primary-text">
              {hasMultipleGenres ? 'Top Genres' : 'Top Genre'}: {genresText}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}