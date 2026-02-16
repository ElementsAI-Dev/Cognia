/**
 * Academic Store - Zotero Slice
 * Zotero integration for importing, exporting, and syncing papers
 */

import {
  ZoteroClient,
  ZoteroSyncService,
  zoteroItemToPaper,
  paperToZoteroItem,
  zoteroItemToBibTeX,
  type ZoteroConfig,
  type ZoteroSyncResult,
} from '@/lib/academic/zotero-integration';
import type { AcademicSliceCreator } from '../types';
import { loggers } from '@/lib/logger';

const log = loggers.app;

// ============================================================================
// Zotero Actions Type
// ============================================================================

export interface ZoteroActions {
  setZoteroConfig: (config: ZoteroConfig | null) => void;
  syncWithZotero: () => Promise<ZoteroSyncResult | null>;
  importFromZotero: (query?: string) => Promise<number>;
  exportToZoteroBibTeX: (paperIds: string[]) => string[];
}

// ============================================================================
// Zotero Slice Creator
// ============================================================================

export const createZoteroSlice: AcademicSliceCreator<ZoteroActions> = (set, get) => ({
    setZoteroConfig: (config) => {
      set((state) => ({
        settings: { ...state.settings, zoteroConfig: config },
      }));
    },

    syncWithZotero: async () => {
      const config = get().settings.zoteroConfig;
      if (!config) {
        set({ error: 'Zotero is not configured' });
        return null;
      }

      set({ isLoading: true, error: null });
      try {
        const syncService = new ZoteroSyncService(config);
        const result = await syncService.fullSync();

        if (result.success) {
          const client = syncService.getClient();
          const items = await client.getItems();
          const papers = items.map(zoteroItemToPaper);

          for (const paper of papers) {
            await get().addToLibrary(paper);
          }
        }

        set({ isLoading: false });
        return result;
      } catch (error) {
        log.error('Zotero sync failed', error as Error);
        set({ isLoading: false, error: 'Zotero sync failed' });
        return null;
      }
    },

    importFromZotero: async (query) => {
      const config = get().settings.zoteroConfig;
      if (!config) {
        set({ error: 'Zotero is not configured' });
        return 0;
      }

      set({ isLoading: true, error: null });
      try {
        const client = new ZoteroClient(config);
        const items = query
          ? await client.searchItems(query)
          : await client.getItems();

        const papers = items.map(zoteroItemToPaper);
        let imported = 0;

        for (const paper of papers) {
          try {
            await get().addToLibrary(paper);
            imported++;
          } catch {
            // Skip duplicates
          }
        }

        set({ isLoading: false });
        return imported;
      } catch (error) {
        log.error('Zotero import failed', error as Error);
        set({ isLoading: false, error: 'Zotero import failed' });
        return 0;
      }
    },

    exportToZoteroBibTeX: (paperIds) => {
      const state = get();
      const results: string[] = [];

      for (const id of paperIds) {
        const paper = state.library.papers[id];
        if (paper) {
          const zoteroItem = paperToZoteroItem(paper);
          if (zoteroItem.title) {
            results.push(
              zoteroItemToBibTeX({
                key: id,
                version: 0,
                itemType: zoteroItem.itemType || 'journalArticle',
                title: zoteroItem.title,
                creators: zoteroItem.creators || [],
                tags: zoteroItem.tags || [],
                collections: [],
                relations: {},
                dateAdded: new Date().toISOString(),
                dateModified: new Date().toISOString(),
                ...zoteroItem,
              })
            );
          }
        }
      }

      return results;
    },
});
