import './TopContentList.css';

export default function TopContentList({ 
  title, 
  items, 
  loading, 
  error, 
  type = 'default', 
  visibleCount = null,
  loadingImages = false 
}) {
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
            {item.image_url ? (
              <div className="artist-image">
                <img 
                  src={item.image_url} 
                  alt={item.artist_name}
                  onError={(e) => {
                    console.log(`[TopContentList Debug] Failed to load artist image:`, {
                      artist: item.artist_name,
                      rank: index + 1,
                      imageUrl: item.image_url,
                      error: e
                    });
                    e.target.style.display = 'none';
                  }}
                  onLoad={() => {
                    console.log(`[TopContentList Debug] Successfully loaded artist image:`, {
                      artist: item.artist_name,
                      rank: index + 1
                    });
                  }}
                />
              </div>
            ) : (
              <div className="artist-image-placeholder" style={{width: '50px', height: '50px', backgroundColor: '#ccc', borderRadius: '50%'}}>
                {console.log(`[TopContentList Debug] Artist missing image_url:`, {
                  artist: item.artist_name,
                  rank: index + 1,
                  image_url: item.image_url
                })}
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
            {item.image_url ? (
              <div className="track-image">
                <img 
                  src={item.image_url} 
                  alt={`${item.track_name} by ${item.artist_name}`}
                  onError={(e) => {
                    console.log(`[TopContentList Debug] Failed to load track image:`, {
                      track: item.track_name,
                      artist: item.artist_name,
                      rank: index + 1,
                      imageUrl: item.image_url,
                      error: e
                    });
                    e.target.style.display = 'none';
                  }}
                  onLoad={() => {
                    console.log(`[TopContentList Debug] Successfully loaded track image:`, {
                      track: item.track_name,
                      artist: item.artist_name,
                      rank: index + 1
                    });
                  }}
                />
              </div>
            ) : (
              <div className="track-image-placeholder" style={{width: '50px', height: '50px', backgroundColor: '#ccc'}}>
                {console.log(`[TopContentList Debug] Track missing image_url:`, {
                  track: item.track_name,
                  artist: item.artist_name,
                  rank: index + 1,
                  image_url: item.image_url
                })}
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
            {item.image_url && (
              <div className="episode-image">
                <img src={item.image_url} alt={item.episode_name} />
              </div>
            )}
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
            {item.image_url && (
              <div className="show-image">
                <img src={item.image_url} alt={item.show_name} />
              </div>
            )}
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

  // Determine which items to show
  const displayItems = visibleCount ? items?.slice(0, visibleCount) : items;

  return (
    <div className="top-content-card">
      <h3>
        {title}
        {loadingImages && (
          <span className="loading-indicator"> (Loading images...)</span>
        )}
      </h3>
      <div className="top-content-list">
        {displayItems?.map(renderItem)}
      </div>
    </div>
  );
}