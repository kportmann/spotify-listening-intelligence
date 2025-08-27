import './TopContentList.css';

export default function TopContentList({ title, items, loading, error, type = 'default' }) {
  if (loading) {
    return (
      <div className="top-content-card">
        <h3>{title}</h3>
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="top-content-card">
        <h3>{title}</h3>
        <div className="error">Error: {error.message}</div>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="top-content-card">
        <h3>{title}</h3>
        <div className="no-data">No data available</div>
      </div>
    );
  }

  const renderItem = (item, index) => {
    switch (type) {
      case 'artists':
        return (
          <div key={index} className="top-content-item">
            <span className="rank">#{index + 1}</span>
            {item.image_url && (
              <div className="artist-image">
                <img src={item.image_url} alt={item.artist_name} />
              </div>
            )}
            <div className="content-info">
              <div className="primary-text">{item.artist_name}</div>
              <div className="secondary-text">{item.total_hours}h • {item.play_count} plays</div>
            </div>
          </div>
        );
      
      case 'tracks':
        return (
          <div key={index} className="top-content-item">
            <span className="rank">#{index + 1}</span>
            {item.image_url && (
              <div className="track-image">
                <img src={item.image_url} alt={`${item.track_name} by ${item.artist_name}`} />
              </div>
            )}
            <div className="content-info">
              <div className="primary-text">{item.track_name}</div>
              <div className="secondary-text">{item.artist_name} • {item.total_hours}h</div>
            </div>
          </div>
        );
      
      case 'episodes':
        return (
          <div key={index} className="top-content-item">
            <span className="rank">#{index + 1}</span>
            <div className="content-info">
              <div className="primary-text">{item.episode_name}</div>
              <div className="secondary-text">{item.show_name} • {item.total_hours}h</div>
            </div>
          </div>
        );
      
      case 'shows':
        return (
          <div key={index} className="top-content-item">
            <span className="rank">#{index + 1}</span>
            <div className="content-info">
              <div className="primary-text">{item.show_name}</div>
              <div className="secondary-text">{item.total_hours}h • {item.play_count} episodes</div>
            </div>
          </div>
        );
      
      case 'audiobooks':
        return (
          <div key={index} className="top-content-item">
            <span className="rank">#{index + 1}</span>
            <div className="content-info">
              <div className="primary-text">{item.audiobook_title}</div>
              <div className="secondary-text">{item.total_hours}h • {item.play_count} chapters</div>
            </div>
          </div>
        );
      
      default:
        return (
          <div key={index} className="top-content-item">
            <span className="rank">#{index + 1}</span>
            <div className="content-info">
              <div className="primary-text">{item.name || 'Unknown'}</div>
              <div className="secondary-text">{item.total_hours}h</div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="top-content-card">
      <h3>{title}</h3>
      <div className="top-content-list">
        {items.map(renderItem)}
      </div>
    </div>
  );
}