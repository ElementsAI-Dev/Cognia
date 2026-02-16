/**
 * Knowledge Map Store - Import/Export Slice
 */

import {
  isValidCodemapFile,
  convertCodemapToKnowledgeMap,
  convertKnowledgeMapToCodemap,
} from '@/types/learning/knowledge-map';
import type {
  KnowledgeMapImportExportActions,
  KnowledgeMapSliceCreator,
} from '../knowledge-map-store-types';

export const createKnowledgeMapImportExportSlice: KnowledgeMapSliceCreator<
  KnowledgeMapImportExportActions
> = (set, get) => ({
  importFromCodemap: async (data) => {
    try {
      const parsed = JSON.parse(data);

      if (!isValidCodemapFile(parsed)) {
        throw new Error('Invalid codemap file format');
      }

      const knowledgeMap = convertCodemapToKnowledgeMap(parsed);

      set((state) => ({
        knowledgeMaps: {
          ...state.knowledgeMaps,
          [knowledgeMap.id]: knowledgeMap,
        },
        activeKnowledgeMapId: knowledgeMap.id,
      }));

      return knowledgeMap;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  },

  exportToCodemap: (id) => {
    const knowledgeMap = get().knowledgeMaps[id];
    if (!knowledgeMap) return null;

    const codemap = convertKnowledgeMapToCodemap(knowledgeMap);
    return JSON.stringify(codemap, null, 2);
  },

  importFromFile: async (file) => {
    try {
      const content = await file.text();
      return await get().importFromCodemap(content);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  },

  exportToFile: (id, filename) => {
    const data = get().exportToCodemap(id);
    if (!data) return;

    const knowledgeMap = get().knowledgeMaps[id];
    const defaultFilename = `${knowledgeMap?.title.replace(/[^a-zA-Z0-9]/g, '_') || 'knowledge_map'}.codemap`;

    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || defaultFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
});
