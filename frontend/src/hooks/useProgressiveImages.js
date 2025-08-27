import { useState, useEffect } from 'react';
import { topContentService } from '../services/topContentService';

export const useProgressiveImages = (data, initialLoadCount = 3) => {
  const [itemsWithImages, setItemsWithImages] = useState({});
  const [loadingImages, setLoadingImages] = useState(false);
  const [visibleCount, setVisibleCount] = useState(initialLoadCount);

  // Progressive image loading for visible items
  useEffect(() => {
    if (!data?.artists && !data?.tracks) return;

    const loadImagesForItems = async () => {
      setLoadingImages(true);
      
      try {
        // Get items to load images for (up to visibleCount)
        const artistsToLoad = data.artists ? data.artists.slice(0, visibleCount).map(a => a.artist_name) : [];
        const tracksToLoad = data.tracks ? data.tracks.slice(0, visibleCount) : [];
        
        if (artistsToLoad.length === 0 && tracksToLoad.length === 0) {
          setLoadingImages(false);
          return;
        }

        const imageData = await topContentService.getImagesForContent(artistsToLoad, tracksToLoad);
        
        // Update items with their images
        const updatedItems = {};
        
        // Process artists
        if (data.artists) {
          updatedItems.artists = data.artists.map(artist => ({
            ...artist,
            image_url: imageData.artist_images?.[artist.artist_name] || null
          }));
        }
        
        // Process tracks
        if (data.tracks) {
          updatedItems.tracks = data.tracks.map(track => {
            const key = `${track.track_name}|${track.artist_name}`;
            return {
              ...track,
              image_url: imageData.track_images?.[key] || null
            };
          });
        }
        
        setItemsWithImages(updatedItems);
      } catch (error) {
        console.error('Failed to load images:', error);
      } finally {
        setLoadingImages(false);
      }
    };

    loadImagesForItems();
  }, [data, visibleCount]);

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
    visibleCount,
    showMore,
    showLess,
    canShowMore: canShowMore(),
    canShowLess: canShowLess(),
    hasImages: Object.keys(itemsWithImages).length > 0
  };
};