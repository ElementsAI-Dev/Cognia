/**
 * Knowledge Map Integration Module
 * Provides unified interface for knowledge map generation from various sources
 */

import { extractPDFContent } from './pdf-to-markdown';
import { useKnowledgeMapStore } from '@/stores/academic/knowledge-map-store';
import type {
  KnowledgeMap,
  KnowledgeMapGenerationRequest,
  MindMapData,
  PDFConversionOptions,
} from '@/types/learning/knowledge-map';

// ============================================================================
// Knowledge Map Generation from Different Sources
// ============================================================================

/**
 * Generate knowledge map from selected text content
 * Used by the text selection popover's knowledge map button
 */
export async function generateKnowledgeMapFromSelection(
  selectedText: string,
  title?: string
): Promise<KnowledgeMap | null> {
  const store = useKnowledgeMapStore.getState();
  
  try {
    const knowledgeMap = await store.generateFromContent(
      selectedText,
      title || 'Knowledge Map from Selection'
    );
    return knowledgeMap;
  } catch (error) {
    console.error('Failed to generate knowledge map from selection:', error);
    return null;
  }
}

/**
 * Generate knowledge map from PDF file
 * Handles PDF extraction and knowledge map generation in one call
 */
export async function generateKnowledgeMapFromPDFFile(
  pdfPath: string,
  title?: string,
  options?: Partial<PDFConversionOptions>
): Promise<{
  success: boolean;
  knowledgeMap?: KnowledgeMap;
  markdown?: string;
  error?: string;
}> {
  try {
    const result = await extractPDFContent(pdfPath, {
      ...options,
      generateKnowledgeMap: true,
      generateMindMap: true,
    });

    if (!result.success) {
      return {
        success: false,
        error: result.errors?.join(', ') || 'PDF extraction failed',
      };
    }

    // Store the generated knowledge map
    if (result.knowledgeMap) {
      const store = useKnowledgeMapStore.getState();
      store.knowledgeMaps[result.knowledgeMap.id] = result.knowledgeMap;
      store.setActiveKnowledgeMap(result.knowledgeMap.id);
    }

    return {
      success: true,
      knowledgeMap: result.knowledgeMap,
      markdown: result.markdown,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Generate knowledge map using AI-assisted analysis
 * Sends content to backend for intelligent extraction
 */
export async function generateKnowledgeMapWithAI(
  request: KnowledgeMapGenerationRequest
): Promise<KnowledgeMap | null> {
  const store = useKnowledgeMapStore.getState();
  
  try {
    const knowledgeMap = await store.createKnowledgeMap(request);
    return knowledgeMap;
  } catch (error) {
    console.error('Failed to generate AI-assisted knowledge map:', error);
    return null;
  }
}

// ============================================================================
// Mind Map Generation
// ============================================================================

/**
 * Generate mind map from existing knowledge map
 */
export async function generateMindMapFromKnowledgeMap(
  knowledgeMapId: string,
  layout?: 'radial' | 'tree' | 'horizontal' | 'vertical' | 'force'
): Promise<MindMapData | null> {
  const store = useKnowledgeMapStore.getState();
  
  try {
    const mindMap = await store.generateMindMap({
      knowledgeMapId,
      title: 'Mind Map',
      layout: layout || 'radial',
    });
    return mindMap;
  } catch (error) {
    console.error('Failed to generate mind map:', error);
    return null;
  }
}

/**
 * Generate mind map directly from content
 */
export async function generateMindMapFromContent(
  content: string,
  title?: string,
  layout?: 'radial' | 'tree' | 'horizontal' | 'vertical' | 'force'
): Promise<MindMapData | null> {
  const store = useKnowledgeMapStore.getState();
  
  try {
    const mindMap = await store.generateMindMap({
      content,
      title: title || 'Mind Map',
      layout: layout || 'radial',
    });
    return mindMap;
  } catch (error) {
    console.error('Failed to generate mind map from content:', error);
    return null;
  }
}

// ============================================================================
// Integration Helpers
// ============================================================================

/**
 * Check if a knowledge map exists for a given source
 */
export function hasKnowledgeMapForSource(sourcePath: string): boolean {
  const store = useKnowledgeMapStore.getState();
  return Object.values(store.knowledgeMaps).some(
    km => km.metadata.pdfPath === sourcePath
  );
}

/**
 * Get knowledge map for a source if it exists
 */
export function getKnowledgeMapForSource(sourcePath: string): KnowledgeMap | null {
  const store = useKnowledgeMapStore.getState();
  const km = Object.values(store.knowledgeMaps).find(
    k => k.metadata.pdfPath === sourcePath
  );
  return km || null;
}

/**
 * Create a callback for the text selection popover's onKnowledgeMap prop
 */
export function createKnowledgeMapHandler(
  onSuccess?: (knowledgeMap: KnowledgeMap) => void,
  onError?: (error: Error) => void
): (text: string) => Promise<void> {
  return async (text: string) => {
    try {
      const knowledgeMap = await generateKnowledgeMapFromSelection(text);
      if (knowledgeMap && onSuccess) {
        onSuccess(knowledgeMap);
      }
    } catch (error) {
      if (onError) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  };
}

// ============================================================================
// Export/Import Utilities
// ============================================================================

/**
 * Export knowledge map to JSON file
 */
export function exportKnowledgeMapToJSON(knowledgeMapId: string): string | null {
  const store = useKnowledgeMapStore.getState();
  return store.exportToCodemap(knowledgeMapId);
}

/**
 * Import knowledge map from JSON string
 */
export async function importKnowledgeMapFromJSON(jsonString: string): Promise<KnowledgeMap | null> {
  const store = useKnowledgeMapStore.getState();
  try {
    await store.importFromCodemap(jsonString);
    // Return the last imported map
    const maps = Object.values(store.knowledgeMaps);
    return maps[maps.length - 1] || null;
  } catch (error) {
    console.error('Failed to import knowledge map:', error);
    return null;
  }
}
