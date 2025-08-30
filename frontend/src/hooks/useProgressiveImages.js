import { useState, useEffect } from 'react';
import { musicService } from '../services/musicService';

export const useProgressiveImages = (data, initialLoadCount = 3) => {
  const [itemsWithImages, setItemsWithImages] = useState({});
  const [loadingImages, setLoadingImages] = useState(false);
  const [loadingBackgroundImages, setLoadingBackgroundImages] = useState(false);
  const [priorityImagesLoaded, setPriorityImagesLoaded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(initialLoadCount);

  // Priority image loading for top 3 items
  useEffect(() => {
    if (!data?.artists && !data?.tracks) return;
    
    setPriorityImagesLoaded(false);
    setLoadingImages(true);
    
    const loadPriorityImages = async () => {
      try {
        // Load top 3 items first (priority)
        const priorityArtists = data.artists ? data.artists.slice(0, 3).map(a => a.artist_name) : [];
        const priorityTracks = data.tracks ? data.tracks.slice(0, 3) : [];
        
        if (priorityArtists.length === 0 && priorityTracks.length === 0) {
          setLoadingImages(false);
          return;
        }

        const priorityImageData = await musicService.getImagesForContent(priorityArtists, priorityTracks);
        
        // Update items with priority images only
        const updatedItems = {};
        
        // Process all artists but only set images for priority ones initially
        if (data.artists) {
          updatedItems.artists = data.artists.map((artist, index) => ({
            ...artist,
            image_url: index < 3 ? (priorityImageData.artist_images?.[artist.artist_name] || null) : null
          }));
        }
        
        // Process all tracks but only set images for priority ones initially
        if (data.tracks) {
          updatedItems.tracks = data.tracks.map((track, index) => {
            const key = `${track.track_name}|${track.artist_name}`;
            return {
              ...track,
              image_url: index < 3 ? (priorityImageData.track_images?.[key] || null) : null
            };
          });
        }
        
        setItemsWithImages(updatedItems);
        setPriorityImagesLoaded(true);
        
      } catch (error) {
        console.error('Failed to load priority images:', error);
      } finally {
        setLoadingImages(false);
      }
    };

    loadPriorityImages();
  }, [data]);

  // Background loading for remaining items (triggered after priority images are loaded)
  useEffect(() => {
    if (!priorityImagesLoaded || !data || visibleCount <= 3) return;
    
    setLoadingBackgroundImages(true);
    
    const loadBackgroundImages = async () => {
      try {
        // Load remaining visible items in background
        const backgroundArtists = data.artists ? 
          data.artists.slice(3, visibleCount).map(a => a.artist_name) : [];
        const backgroundTracks = data.tracks ? 
          data.tracks.slice(3, visibleCount) : [];
        
        if (backgroundArtists.length === 0 && backgroundTracks.length === 0) {
          setLoadingBackgroundImages(false);
          return;
        }

        const backgroundImageData = await musicService.getImagesForContent(backgroundArtists, backgroundTracks);
        
        // Update items with background images
        setItemsWithImages(prevItems => {
          const updatedItems = { ...prevItems };
          
          // Update artists with background images
          if (updatedItems.artists && backgroundImageData.artist_images) {
            updatedItems.artists = updatedItems.artists.map((artist, index) => {
              if (index >= 3 && index < visibleCount) {
                return {
                  ...artist,
                  image_url: backgroundImageData.artist_images[artist.artist_name] || null
                };
              }
              return artist;
            });
          }
          
          // Update tracks with background images
          if (updatedItems.tracks && backgroundImageData.track_images) {
            updatedItems.tracks = updatedItems.tracks.map((track, index) => {
              if (index >= 3 && index < visibleCount) {
                const key = `${track.track_name}|${track.artist_name}`;
                return {
                  ...track,
                  image_url: backgroundImageData.track_images[key] || null
                };
              }
              return track;
            });
          }
          
          return updatedItems;
        });
        
      } catch (error) {
        console.error('Failed to load background images:', error);
      } finally {
        setLoadingBackgroundImages(false);
      }
    };

    // Add a small delay to ensure the UI has updated with priority images
    const timeoutId = setTimeout(() => {
      loadBackgroundImages();
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [priorityImagesLoaded, data, visibleCount]);

  const showMore = () => {
    const maxItems = Math.max(
      data?.artists?.length || 0,
      data?.tracks?.length || 0
    );
    setVisibleCount(Math.min(visibleCount + 10, maxItems));
  };

  const showLess = () => {
    setVisibleCount(initialLoadCount);
  };

  const canShowMore = () => {
    const maxItems = Math.max(
      data?.artists?.length || 0,
      data?.tracks?.length || 0
    );
    return visibleCount < maxItems;
  };

  const canShowLess = () => {
    return visibleCount > initialLoadCount;
  };

  return {
    itemsWithImages,
    loadingImages,
    loadingBackgroundImages,
    visibleCount,
    showMore,
    showLess,
    canShowMore: canShowMore(),
    canShowLess: canShowLess(),
    hasImages: Object.keys(itemsWithImages).length > 0
  };
};