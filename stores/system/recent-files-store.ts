/**
 * Recent Files Store - tracks recently used files for quick insertion
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';

export interface RecentFile {
  id: string;
  name: string;
  path: string;
  type: 'image' | 'audio' | 'video' | 'file' | 'document';
  mimeType: string;
  size: number;
  url?: string;
  usedAt: Date;
  usageCount: number;
}

interface RecentFilesState {
  // State
  recentFiles: RecentFile[];
  maxFiles: number;

  // Actions
  addFile: (file: Omit<RecentFile, 'id' | 'usedAt' | 'usageCount'>) => RecentFile;
  removeFile: (id: string) => void;
  clearFiles: () => void;
  updateFileUsage: (id: string) => void;

  // Selectors
  getRecentFiles: (limit?: number) => RecentFile[];
  getMostUsedFiles: (limit?: number) => RecentFile[];
  searchFiles: (query: string) => RecentFile[];
  getFileByPath: (path: string) => RecentFile | undefined;
}

const MAX_RECENT_FILES = 50;

export const useRecentFilesStore = create<RecentFilesState>()(
  persist(
    (set, get) => ({
      recentFiles: [],
      maxFiles: MAX_RECENT_FILES,

      addFile: (fileInput) => {
        const { recentFiles, maxFiles } = get();

        // Check if file already exists by path
        const existingFile = recentFiles.find((f) => f.path === fileInput.path);

        if (existingFile) {
          // Update existing file usage
          set({
            recentFiles: recentFiles.map((f) =>
              f.id === existingFile.id
                ? {
                    ...f,
                    usedAt: new Date(),
                    usageCount: f.usageCount + 1,
                    url: fileInput.url || f.url,
                  }
                : f
            ),
          });
          return existingFile;
        }

        // Create new file entry
        const newFile: RecentFile = {
          id: nanoid(),
          name: fileInput.name,
          path: fileInput.path,
          type: fileInput.type,
          mimeType: fileInput.mimeType,
          size: fileInput.size,
          url: fileInput.url,
          usedAt: new Date(),
          usageCount: 1,
        };

        // Add to list, removing oldest if at max
        let updatedFiles = [newFile, ...recentFiles];
        if (updatedFiles.length > maxFiles) {
          updatedFiles = updatedFiles.slice(0, maxFiles);
        }

        set({ recentFiles: updatedFiles });
        return newFile;
      },

      removeFile: (id) => {
        set((state) => ({
          recentFiles: state.recentFiles.filter((f) => f.id !== id),
        }));
      },

      clearFiles: () => {
        set({ recentFiles: [] });
      },

      updateFileUsage: (id) => {
        set((state) => ({
          recentFiles: state.recentFiles.map((f) =>
            f.id === id
              ? {
                  ...f,
                  usedAt: new Date(),
                  usageCount: f.usageCount + 1,
                }
              : f
          ),
        }));
      },

      getRecentFiles: (limit = 10) => {
        return [...get().recentFiles]
          .sort((a, b) => b.usedAt.getTime() - a.usedAt.getTime())
          .slice(0, limit);
      },

      getMostUsedFiles: (limit = 10) => {
        return [...get().recentFiles]
          .sort((a, b) => b.usageCount - a.usageCount)
          .slice(0, limit);
      },

      searchFiles: (query) => {
        const lowerQuery = query.toLowerCase();
        return get().recentFiles.filter(
          (f) =>
            f.name.toLowerCase().includes(lowerQuery) ||
            f.path.toLowerCase().includes(lowerQuery)
        );
      },

      getFileByPath: (path) => {
        return get().recentFiles.find((f) => f.path === path);
      },
    }),
    {
      name: 'cognia-recent-files',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        recentFiles: state.recentFiles.map((f) => ({
          ...f,
          usedAt: f.usedAt instanceof Date ? f.usedAt.toISOString() : f.usedAt,
        })),
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.recentFiles) {
          state.recentFiles = state.recentFiles.map((f) => ({
            ...f,
            usedAt: new Date(f.usedAt),
          }));
        }
      },
    }
  )
);

// Selectors
export const selectRecentFiles = (state: RecentFilesState) => state.recentFiles;

export default useRecentFilesStore;
