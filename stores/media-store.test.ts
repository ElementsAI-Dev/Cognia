/**
 * Media Store Tests
 */

import { act, renderHook } from '@testing-library/react';
import { useMediaStore } from './media-store';

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: () => 'test-id-' + Math.random().toString(36).substr(2, 9),
}));

describe('useMediaStore', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useMediaStore());
    act(() => {
      result.current.deleteAllImages();
      result.current.deleteAllVideos();
    });
  });

  describe('Image Management', () => {
    it('should add an image', () => {
      const { result } = renderHook(() => useMediaStore());

      let imageId: string = '';
      act(() => {
        imageId = result.current.addImage({
          prompt: 'A beautiful sunset',
          model: 'dall-e-3',
          provider: 'openai',
          size: '1024x1024',
        });
      });

      expect(imageId).toBeTruthy();
      expect(result.current.images).toHaveLength(1);
      expect(result.current.images[0].prompt).toBe('A beautiful sunset');
    });

    it('should delete an image', () => {
      const { result } = renderHook(() => useMediaStore());

      let imageId: string = '';
      act(() => {
        imageId = result.current.addImage({
          prompt: 'Test image',
          model: 'dall-e-3',
          provider: 'openai',
          size: '1024x1024',
        });
      });

      expect(result.current.images).toHaveLength(1);

      act(() => {
        result.current.deleteImage(imageId);
      });

      expect(result.current.images).toHaveLength(0);
    });

    it('should toggle image favorite', () => {
      const { result } = renderHook(() => useMediaStore());

      let imageId: string = '';
      act(() => {
        imageId = result.current.addImage({
          prompt: 'Test image',
          model: 'dall-e-3',
          provider: 'openai',
          size: '1024x1024',
        });
      });

      expect(result.current.images[0].favorite).toBe(false);

      act(() => {
        result.current.toggleImageFavorite(imageId);
      });

      expect(result.current.images[0].favorite).toBe(true);
    });

    it('should add and remove image tags', () => {
      const { result } = renderHook(() => useMediaStore());

      let imageId: string = '';
      act(() => {
        imageId = result.current.addImage({
          prompt: 'Test image',
          model: 'dall-e-3',
          provider: 'openai',
          size: '1024x1024',
        });
      });

      act(() => {
        result.current.addImageTag(imageId, 'nature');
        result.current.addImageTag(imageId, 'sunset');
      });

      expect(result.current.images[0].tags).toContain('nature');
      expect(result.current.images[0].tags).toContain('sunset');

      act(() => {
        result.current.removeImageTag(imageId, 'nature');
      });

      expect(result.current.images[0].tags).not.toContain('nature');
      expect(result.current.images[0].tags).toContain('sunset');
    });
  });

  describe('Video Management', () => {
    it('should add a video', () => {
      const { result } = renderHook(() => useMediaStore());

      let videoId: string = '';
      act(() => {
        videoId = result.current.addVideo({
          prompt: 'A flying bird',
          model: 'veo-3.1',
          provider: 'google-veo',
          resolution: '1080p',
          aspectRatio: '16:9',
          duration: '10s',
          status: 'processing',
          progress: 0,
        });
      });

      expect(videoId).toBeTruthy();
      expect(result.current.videos).toHaveLength(1);
      expect(result.current.videos[0].prompt).toBe('A flying bird');
    });

    it('should update video status', () => {
      const { result } = renderHook(() => useMediaStore());

      let videoId: string = '';
      act(() => {
        videoId = result.current.addVideo({
          prompt: 'Test video',
          model: 'veo-3.1',
          provider: 'google-veo',
          resolution: '1080p',
          aspectRatio: '16:9',
          duration: '10s',
          status: 'processing',
          progress: 0,
        });
      });

      act(() => {
        result.current.updateVideoStatus(videoId, 'completed', 100);
      });

      expect(result.current.videos[0].status).toBe('completed');
      expect(result.current.videos[0].progress).toBe(100);
    });
  });

  describe('Statistics', () => {
    it('should return correct stats', () => {
      const { result } = renderHook(() => useMediaStore());

      act(() => {
        result.current.addImage({
          prompt: 'Image 1',
          model: 'dall-e-3',
          provider: 'openai',
          size: '1024x1024',
          cost: 0.04,
        });
        result.current.addImage({
          prompt: 'Image 2',
          model: 'dall-e-3',
          provider: 'openai',
          size: '1024x1024',
          cost: 0.04,
        });
        result.current.addVideo({
          prompt: 'Video 1',
          model: 'veo-3.1',
          provider: 'google-veo',
          resolution: '1080p',
          aspectRatio: '16:9',
          duration: '10s',
          status: 'completed',
          progress: 100,
          cost: 0.10,
        });
      });

      const stats = result.current.getStats();
      expect(stats.totalImages).toBe(2);
      expect(stats.totalVideos).toBe(1);
      expect(stats.totalImageCost).toBe(0.08);
      expect(stats.totalVideoCost).toBe(0.10);
    });
  });

  describe('Bulk Actions', () => {
    it('should delete all images', () => {
      const { result } = renderHook(() => useMediaStore());

      act(() => {
        result.current.addImage({
          prompt: 'Image 1',
          model: 'dall-e-3',
          provider: 'openai',
          size: '1024x1024',
        });
        result.current.addImage({
          prompt: 'Image 2',
          model: 'dall-e-3',
          provider: 'openai',
          size: '1024x1024',
        });
      });

      expect(result.current.images).toHaveLength(2);

      act(() => {
        result.current.deleteAllImages();
      });

      expect(result.current.images).toHaveLength(0);
    });

    it('should export and import media', () => {
      const { result } = renderHook(() => useMediaStore());

      act(() => {
        result.current.addImage({
          prompt: 'Export test',
          model: 'dall-e-3',
          provider: 'openai',
          size: '1024x1024',
        });
      });

      const exported = result.current.exportMedia();
      expect(exported.images).toHaveLength(1);

      act(() => {
        result.current.deleteAllImages();
      });

      expect(result.current.images).toHaveLength(0);

      act(() => {
        result.current.importMedia(exported);
      });

      expect(result.current.images).toHaveLength(1);
    });
  });
});
