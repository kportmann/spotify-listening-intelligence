import React, { useState, useEffect } from 'react';
import './SeasonalTrends.css';
import { useSeasonalTrends } from '../../hooks/useListeningPatterns';
import SectionTitle from '../common/SectionTitle/SectionTitle';
import SectionDescription from '../common/SectionDescription/SectionDescription';
import ExpandableSeasonList from './ExpandableSeasonList';
import ExpandButton from '../common/ExpandButton/ExpandButton';

export default function SeasonalTrends({ selectedYear = null }) {
  const [seasonalData, setSeasonalData] = useState(null);
  const [selectedTimezone] = useState('UTC');
  const { data, loading, error } = useSeasonalTrends(selectedYear, selectedTimezone);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setSeasonalData(data);
  }, [data]);

  const getSeasonIcon = (season) => {
    switch (season) {
      case 'Spring': return '🌸';
      case 'Summer': return '☀️';
      case 'Fall': return '🍂';
      case 'Winter': return '❄️';
      default: return '🎵';
    }
  };

  const getMaxValues = () => {
    if (!seasonalData?.seasonal_trends) return { streams: 0, minutes: 0 };
    
    return {
      streams: Math.max(...seasonalData.seasonal_trends.map(s => s.total_streams)),
      minutes: Math.max(...seasonalData.seasonal_trends.map(s => s.total_minutes))
    };
  };

  const getProgressWidth = (value, maxValue) => {
    if (!value || maxValue === 0) return 0;
    return (value / maxValue) * 100;
  };

  const nextSeason = () => {
    if (seasonalData?.seasonal_trends) {
      setCurrentIndex((prev) => (prev + 1) % seasonalData.seasonal_trends.length);
    }
  };

  const prevSeason = () => {
    if (seasonalData?.seasonal_trends) {
      setCurrentIndex((prev) => (prev - 1 + seasonalData.seasonal_trends.length) % seasonalData.seasonal_trends.length);
    }
  };

  if (loading) {
    return (
      <div className="seasonal-trends-container">
        <SectionTitle title="Seasonal Listening Trends" />
        <div className="seasonal-loading">
          Loading seasonal patterns {selectedYear ? ` for ${selectedYear}` : ''}...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="seasonal-trends-container">
        <div className="seasonal-error">Failed to load seasonal patterns: {error}</div>
      </div>
    );
  }

  if (!seasonalData?.seasonal_trends || seasonalData.seasonal_trends.length === 0) {
    return (
      <div className="seasonal-trends-container">
        <SectionTitle title="Seasonal Listening Patterns" />
        <div className="seasonal-section">
          <SectionDescription maxWidth={600}>
            Your listening patterns across the four seasons{selectedYear && ` for ${selectedYear}`}
          </SectionDescription>
        </div>
        <div className="seasonal-error">
          No seasonal data available{selectedYear ? ` for ${selectedYear}` : ''}. 
          {selectedYear && ' Try selecting a different year or "All Time" to see your listening patterns.'}
        </div>
      </div>
    );
  }

  const maxValues = getMaxValues();
  const seasons = seasonalData.seasonal_trends;
  const currentSeason = seasons[currentIndex];

  const renderSeasonCard = (season, seasonIndex, isMain = true) => {
    const cardClass = isMain ? 'carousel-card carousel-card-main' : 'carousel-card carousel-card-teaser';
    
    return (
      <div 
        key={season.season} 
        className={cardClass}
      >
        {isMain && (
          <div className="carousel-image-container">
            <div className="seasonal-icon-display">{getSeasonIcon(season.season)}</div>
          </div>
        )}
        
        {!isMain && (
          <div className="carousel-image-container">
            <div className="seasonal-icon-display">{getSeasonIcon(season.season)}</div>
          </div>
        )}
        
        <div className="carousel-content">
          <h4 className="carousel-primary-text">{season.season}</h4>
          {isMain && (
            <p className="carousel-secondary-text">
              {season.total_streams.toLocaleString()} streams • {season.total_minutes.toLocaleString()} minutes
            </p>
          )}
        </div>
        
        {isMain && (
          <div className="carousel-nav-buttons">
            <button 
              className="carousel-nav-btn carousel-nav-prev"
              onClick={prevSeason}
              aria-label="Previous season"
            >
              ◀
            </button>
            <button 
              className="carousel-nav-btn carousel-nav-next"
              onClick={nextSeason}
              aria-label="Next season"
            >
              ▶
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="seasonal-trends-container">
      <SectionTitle title="Seasonal Listening Patterns" />
      
      <div className="seasonal-section">
        <SectionDescription maxWidth={600}>
          Your listening patterns across the four seasons{selectedYear && ` for ${selectedYear}`}
        </SectionDescription>
      </div>

      <div className="carousel-wrapper">
        <div className="carousel-content-area">
          {seasons.length > 1 && (
            <div className="carousel-teaser-left">
              {renderSeasonCard(
                seasons[(currentIndex - 1 + seasons.length) % seasons.length],
                (currentIndex - 1 + seasons.length) % seasons.length,
                false
              )}
            </div>
          )}
          
          <div className="carousel-main">
            {renderSeasonCard(currentSeason, currentIndex, true)}
          </div>
          
          {seasons.length > 1 && (
            <div className="carousel-teaser-right">
              {renderSeasonCard(
                seasons[(currentIndex + 1) % seasons.length],
                (currentIndex + 1) % seasons.length,
                false
              )}
            </div>
          )}
        </div>
      </div>
      
      {seasons.length > 1 && (
        <div className="carousel-indicators">
          {seasons.map((_, index) => (
            <button
              key={index}
              className={`carousel-indicator ${index === currentIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(index)}
              aria-label={`Go to ${seasons[index].season}`}
            />
          ))}
        </div>
      )}

      <ExpandButton 
        isExpanded={isExpanded}
        onClick={() => setIsExpanded((prev) => !prev)}
        isLoading={false}
        disabled={false}
      />

      {isExpanded && (
        <ExpandableSeasonList 
          selectedSeason={currentSeason?.season}
          selectedYear={selectedYear}
          isExpanded={isExpanded}
        />
      )}

    </div>
  );
}