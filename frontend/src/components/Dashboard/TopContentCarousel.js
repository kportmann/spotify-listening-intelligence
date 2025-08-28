import { useState } from 'react';
import './TopContentCarousel.css';

export default function TopContentCarousel({ items, type, title }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  if (!items || items.length === 0) {
    return (
      <div className="carousel-container">
        <h3 className="carousel-title">{title}</h3>
        <div className="carousel-no-data">No data available</div>
      </div>
    );
  }

  const featuredItems = items.slice(0, 3);
  const currentItem = featuredItems[currentIndex];

  const nextItem = () => {
    setCurrentIndex((prev) => (prev + 1) % featuredItems.length);
  };

  const prevItem = () => {
    setCurrentIndex((prev) => (prev - 1 + featuredItems.length) % featuredItems.length);
  };

  const renderCarouselItem = (item) => {
    switch (type) {
      case 'artists':
        return (
          <div className="carousel-card">
            <div className="carousel-rank">#{currentIndex + 1}</div>
            {item.image_url && (
              <div className="carousel-image-container">
                <img 
                  src={item.image_url} 
                  alt={item.artist_name}
                  className="carousel-image"
                />
              </div>
            )}
            <div className="carousel-content">
              <h4 className="carousel-primary-text">{item.artist_name}</h4>
              <p className="carousel-secondary-text">
                {item.total_hours}h • {item.play_count} plays
              </p>
            </div>
          </div>
        );
      
      case 'tracks':
        return (
          <div className="carousel-card">
            <div className="carousel-rank">#{currentIndex + 1}</div>
            {item.image_url && (
              <div className="carousel-image-container">
                <img 
                  src={item.image_url} 
                  alt={`${item.track_name} by ${item.artist_name}`}
                  className="carousel-image"
                />
              </div>
            )}
            <div className="carousel-content">
              <h4 className="carousel-primary-text">{item.track_name}</h4>
              <p className="carousel-secondary-text">
                {item.artist_name} • {item.total_hours}h
              </p>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="carousel-card">
            <div className="carousel-rank">#{currentIndex + 1}</div>
            <div className="carousel-content">
              <h4 className="carousel-primary-text">{item.name || 'Unknown'}</h4>
              <p className="carousel-secondary-text">{item.total_hours}h</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="carousel-container">
      <h3 className="carousel-title">{title}</h3>
      
      <div className="carousel-wrapper">
        {featuredItems.length > 1 && (
          <button 
            className="carousel-nav carousel-nav-left"
            onClick={prevItem}
            aria-label="Previous item"
          >
            ←
          </button>
        )}
        
        <div className="carousel-content-area">
          {renderCarouselItem(currentItem)}
        </div>
        
        {featuredItems.length > 1 && (
          <button 
            className="carousel-nav carousel-nav-right"
            onClick={nextItem}
            aria-label="Next item"
          >
            →
          </button>
        )}
      </div>
      
      {featuredItems.length > 1 && (
        <div className="carousel-indicators">
          {featuredItems.map((_, index) => (
            <button
              key={index}
              className={`carousel-indicator ${index === currentIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(index)}
              aria-label={`Go to item ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}