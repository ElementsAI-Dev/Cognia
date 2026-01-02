/**
 * Media Store - manages generated images and videos history
 * Persists media generation history with IndexedDB via Zustand
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { GeneratedVideo, VideoProvider, VideoModel, VideoStatus } from '@/types/video';

/**
 * Generated image record
 */
export interface GeneratedImageRecord {
  id: string;
  url?: string;
  base64?: string;
  prompt: string;
  revisedPrompt?: string;
  negativePrompt?: string;
  model: string;
  provider: string;
  size: string;
  quality?: string;
  style?: string;
  width?: number;
  height?: number;
  cost?: number;
  createdAt: number;
  favorite: boolean;
  tags: string[];
  sessionId?: string;
}

/**
 * Generated video record
 */
export interface GeneratedVideoRecord {
  id: string;
  jobId?: string;
  url?: string;
  base64?: string;
  thumbnailUrl?: string;
  prompt: string;
  revisedPrompt?: string;
  negativePrompt?: string;
  model: VideoModel;
  provider: VideoProvider;
  resolution: string;
  aspectRatio: string;
  duration: string;
  durationSeconds?: number;
  style?: string;
  fps?: number;
  width?: number;
  height?: number;
  status: VideoStatus;
  progress: number;
  cost?: number;
  createdAt: number;
  completedAt?: number;
  favorite: boolean;
  tags: string[];
  sessionId?: string;
  error?: string;
}

/**
 * Media generation statistics
 */
export interface MediaStats {
  totalImages: number;
  totalVideos: number;
  totalImageCost: number;
  totalVideoCost: number;
  favoriteImages: number;
  favoriteVideos: number;
  lastImageGeneratedAt?: number;
  lastVideoGeneratedAt?: number;
}

/**
 * Media filter options
 */
export interface MediaFilter {
  type?: 'image' | 'video' | 'all';
  provider?: string;
  model?: string;
  favorite?: boolean;
  tags?: string[];
  dateFrom?: number;
  dateTo?: number;
  searchQuery?: string;
}

interface MediaState {
  // Image storage
  images: GeneratedImageRecord[];
  
  // Video storage
  videos: GeneratedVideoRecord[];
  
  // Image actions
  addImage: (image: Omit<GeneratedImageRecord, 'id' | 'createdAt' | 'favorite' | 'tags'>) => string;
  updateImage: (id: string, updates: Partial<GeneratedImageRecord>) => void;
  deleteImage: (id: string) => void;
  toggleImageFavorite: (id: string) => void;
  addImageTag: (id: string, tag: string) => void;
  removeImageTag: (id: string, tag: string) => void;
  
  // Video actions
  addVideo: (video: Omit<GeneratedVideoRecord, 'id' | 'createdAt' | 'favorite' | 'tags'>) => string;
  updateVideo: (id: string, updates: Partial<GeneratedVideoRecord>) => void;
  deleteVideo: (id: string) => void;
  toggleVideoFavorite: (id: string) => void;
  addVideoTag: (id: string, tag: string) => void;
  removeVideoTag: (id: string, tag: string) => void;
  updateVideoStatus: (id: string, status: VideoStatus, progress?: number, video?: GeneratedVideo) => void;
  
  // Query actions
  getImageById: (id: string) => GeneratedImageRecord | undefined;
  getVideoById: (id: string) => GeneratedVideoRecord | undefined;
  getFilteredImages: (filter: MediaFilter) => GeneratedImageRecord[];
  getFilteredVideos: (filter: MediaFilter) => GeneratedVideoRecord[];
  getRecentImages: (limit?: number) => GeneratedImageRecord[];
  getRecentVideos: (limit?: number) => GeneratedVideoRecord[];
  getFavoriteImages: () => GeneratedImageRecord[];
  getFavoriteVideos: () => GeneratedVideoRecord[];
  getImagesBySession: (sessionId: string) => GeneratedImageRecord[];
  getVideosBySession: (sessionId: string) => GeneratedVideoRecord[];
  
  // Statistics
  getStats: () => MediaStats;
  getAllTags: () => string[];
  
  // Bulk actions
  deleteAllImages: () => void;
  deleteAllVideos: () => void;
  deleteOldMedia: (daysOld: number) => void;
  exportMedia: () => { images: GeneratedImageRecord[]; videos: GeneratedVideoRecord[] };
  importMedia: (data: { images?: GeneratedImageRecord[]; videos?: GeneratedVideoRecord[] }) => void;
}

export const useMediaStore = create<MediaState>()(
  persist(
    (set, get) => ({
      images: [],
      videos: [],
      
      // Image actions
      addImage: (image) => {
        const id = nanoid();
        const newImage: GeneratedImageRecord = {
          ...image,
          id,
          createdAt: Date.now(),
          favorite: false,
          tags: [],
        };
        set((state) => ({
          images: [newImage, ...state.images],
        }));
        return id;
      },
      
      updateImage: (id, updates) => {
        set((state) => ({
          images: state.images.map((img) =>
            img.id === id ? { ...img, ...updates } : img
          ),
        }));
      },
      
      deleteImage: (id) => {
        set((state) => ({
          images: state.images.filter((img) => img.id !== id),
        }));
      },
      
      toggleImageFavorite: (id) => {
        set((state) => ({
          images: state.images.map((img) =>
            img.id === id ? { ...img, favorite: !img.favorite } : img
          ),
        }));
      },
      
      addImageTag: (id, tag) => {
        set((state) => ({
          images: state.images.map((img) =>
            img.id === id && !img.tags.includes(tag)
              ? { ...img, tags: [...img.tags, tag] }
              : img
          ),
        }));
      },
      
      removeImageTag: (id, tag) => {
        set((state) => ({
          images: state.images.map((img) =>
            img.id === id
              ? { ...img, tags: img.tags.filter((t) => t !== tag) }
              : img
          ),
        }));
      },
      
      // Video actions
      addVideo: (video) => {
        const id = nanoid();
        const newVideo: GeneratedVideoRecord = {
          ...video,
          id,
          createdAt: Date.now(),
          favorite: false,
          tags: [],
        };
        set((state) => ({
          videos: [newVideo, ...state.videos],
        }));
        return id;
      },
      
      updateVideo: (id, updates) => {
        set((state) => ({
          videos: state.videos.map((vid) =>
            vid.id === id ? { ...vid, ...updates } : vid
          ),
        }));
      },
      
      deleteVideo: (id) => {
        set((state) => ({
          videos: state.videos.filter((vid) => vid.id !== id),
        }));
      },
      
      toggleVideoFavorite: (id) => {
        set((state) => ({
          videos: state.videos.map((vid) =>
            vid.id === id ? { ...vid, favorite: !vid.favorite } : vid
          ),
        }));
      },
      
      addVideoTag: (id, tag) => {
        set((state) => ({
          videos: state.videos.map((vid) =>
            vid.id === id && !vid.tags.includes(tag)
              ? { ...vid, tags: [...vid.tags, tag] }
              : vid
          ),
        }));
      },
      
      removeVideoTag: (id, tag) => {
        set((state) => ({
          videos: state.videos.map((vid) =>
            vid.id === id
              ? { ...vid, tags: vid.tags.filter((t) => t !== tag) }
              : vid
          ),
        }));
      },
      
      updateVideoStatus: (id, status, progress, video) => {
        set((state) => ({
          videos: state.videos.map((vid) =>
            vid.id === id
              ? {
                  ...vid,
                  status,
                  progress: progress ?? vid.progress,
                  url: video?.url ?? vid.url,
                  base64: video?.base64 ?? vid.base64,
                  thumbnailUrl: video?.thumbnailUrl ?? vid.thumbnailUrl,
                  durationSeconds: video?.durationSeconds ?? vid.durationSeconds,
                  width: video?.width ?? vid.width,
                  height: video?.height ?? vid.height,
                  completedAt: status === 'completed' ? Date.now() : vid.completedAt,
                }
              : vid
          ),
        }));
      },
      
      // Query actions
      getImageById: (id) => {
        return get().images.find((img) => img.id === id);
      },
      
      getVideoById: (id) => {
        return get().videos.find((vid) => vid.id === id);
      },
      
      getFilteredImages: (filter) => {
        let result = get().images;
        
        if (filter.provider) {
          result = result.filter((img) => img.provider === filter.provider);
        }
        if (filter.model) {
          result = result.filter((img) => img.model === filter.model);
        }
        if (filter.favorite !== undefined) {
          result = result.filter((img) => img.favorite === filter.favorite);
        }
        if (filter.tags && filter.tags.length > 0) {
          result = result.filter((img) =>
            filter.tags!.some((tag) => img.tags.includes(tag))
          );
        }
        if (filter.dateFrom) {
          result = result.filter((img) => img.createdAt >= filter.dateFrom!);
        }
        if (filter.dateTo) {
          result = result.filter((img) => img.createdAt <= filter.dateTo!);
        }
        if (filter.searchQuery) {
          const query = filter.searchQuery.toLowerCase();
          result = result.filter(
            (img) =>
              img.prompt.toLowerCase().includes(query) ||
              img.revisedPrompt?.toLowerCase().includes(query) ||
              img.tags.some((t) => t.toLowerCase().includes(query))
          );
        }
        
        return result;
      },
      
      getFilteredVideos: (filter) => {
        let result = get().videos;
        
        if (filter.provider) {
          result = result.filter((vid) => vid.provider === filter.provider);
        }
        if (filter.model) {
          result = result.filter((vid) => vid.model === filter.model);
        }
        if (filter.favorite !== undefined) {
          result = result.filter((vid) => vid.favorite === filter.favorite);
        }
        if (filter.tags && filter.tags.length > 0) {
          result = result.filter((vid) =>
            filter.tags!.some((tag) => vid.tags.includes(tag))
          );
        }
        if (filter.dateFrom) {
          result = result.filter((vid) => vid.createdAt >= filter.dateFrom!);
        }
        if (filter.dateTo) {
          result = result.filter((vid) => vid.createdAt <= filter.dateTo!);
        }
        if (filter.searchQuery) {
          const query = filter.searchQuery.toLowerCase();
          result = result.filter(
            (vid) =>
              vid.prompt.toLowerCase().includes(query) ||
              vid.revisedPrompt?.toLowerCase().includes(query) ||
              vid.tags.some((t) => t.toLowerCase().includes(query))
          );
        }
        
        return result;
      },
      
      getRecentImages: (limit = 20) => {
        return get().images.slice(0, limit);
      },
      
      getRecentVideos: (limit = 20) => {
        return get().videos.slice(0, limit);
      },
      
      getFavoriteImages: () => {
        return get().images.filter((img) => img.favorite);
      },
      
      getFavoriteVideos: () => {
        return get().videos.filter((vid) => vid.favorite);
      },
      
      getImagesBySession: (sessionId) => {
        return get().images.filter((img) => img.sessionId === sessionId);
      },
      
      getVideosBySession: (sessionId) => {
        return get().videos.filter((vid) => vid.sessionId === sessionId);
      },
      
      // Statistics
      getStats: () => {
        const { images, videos } = get();
        return {
          totalImages: images.length,
          totalVideos: videos.length,
          totalImageCost: images.reduce((sum, img) => sum + (img.cost || 0), 0),
          totalVideoCost: videos.reduce((sum, vid) => sum + (vid.cost || 0), 0),
          favoriteImages: images.filter((img) => img.favorite).length,
          favoriteVideos: videos.filter((vid) => vid.favorite).length,
          lastImageGeneratedAt: images[0]?.createdAt,
          lastVideoGeneratedAt: videos[0]?.createdAt,
        };
      },
      
      getAllTags: () => {
        const { images, videos } = get();
        const allTags = new Set<string>();
        images.forEach((img) => img.tags.forEach((t) => allTags.add(t)));
        videos.forEach((vid) => vid.tags.forEach((t) => allTags.add(t)));
        return Array.from(allTags).sort();
      },
      
      // Bulk actions
      deleteAllImages: () => {
        set({ images: [] });
      },
      
      deleteAllVideos: () => {
        set({ videos: [] });
      },
      
      deleteOldMedia: (daysOld) => {
        const cutoff = Date.now() - daysOld * 24 * 60 * 60 * 1000;
        set((state) => ({
          images: state.images.filter((img) => img.createdAt >= cutoff || img.favorite),
          videos: state.videos.filter((vid) => vid.createdAt >= cutoff || vid.favorite),
        }));
      },
      
      exportMedia: () => {
        const { images, videos } = get();
        return { images, videos };
      },
      
      importMedia: (data) => {
        set((state) => ({
          images: data.images
            ? [...data.images.filter((img) => !state.images.some((i) => i.id === img.id)), ...state.images]
            : state.images,
          videos: data.videos
            ? [...data.videos.filter((vid) => !state.videos.some((v) => v.id === vid.id)), ...state.videos]
            : state.videos,
        }));
      },
    }),
    {
      name: 'media-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        images: state.images.slice(0, 500), // Limit stored images
        videos: state.videos.slice(0, 200), // Limit stored videos
      }),
    }
  )
);

// Selectors
export const selectImages = (state: MediaState) => state.images;
export const selectVideos = (state: MediaState) => state.videos;
export const selectRecentImages = (limit: number = 10) => (state: MediaState) =>
  state.images.slice(0, limit);
export const selectRecentVideos = (limit: number = 10) => (state: MediaState) =>
  state.videos.slice(0, limit);
export const selectFavoriteImages = (state: MediaState) =>
  state.images.filter((img) => img.favorite);
export const selectFavoriteVideos = (state: MediaState) =>
  state.videos.filter((vid) => vid.favorite);
export const selectPendingVideos = (state: MediaState) =>
  state.videos.filter((vid) => vid.status === 'pending' || vid.status === 'processing');
