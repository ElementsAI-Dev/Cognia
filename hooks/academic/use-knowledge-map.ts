/**
 * useKnowledgeMap - Hook for knowledge map functionality
 * 
 * Provides access to knowledge map management, PDF conversion, and mind map features
 */

'use client';

import { useCallback, useMemo } from 'react';
import { useKnowledgeMapStore } from '@/stores/academic/knowledge-map-store';
import type {
  KnowledgeMap,
  KnowledgeMapTrace,
  KnowledgeMapLocation,
  KnowledgeAnnotation,
  KnowledgeAnnotationType,
  KnowledgeMapGenerationRequest,
  MindMapData,
  MindMapGenerationRequest,
  PDFConversionOptions,
  PDFConversionResult,
  KnowledgeMapNavigationTarget,
} from '@/types/learning/knowledge-map';

export interface UseKnowledgeMapReturn {
  // State
  knowledgeMaps: KnowledgeMap[];
  activeKnowledgeMap: KnowledgeMap | null;
  annotations: KnowledgeAnnotation[];
  isGenerating: boolean;
  generationProgress: number;
  error: string | null;
  
  // Navigation
  canNavigateBack: boolean;
  canNavigateForward: boolean;
  
  // Knowledge Map CRUD
  createKnowledgeMap: (request: KnowledgeMapGenerationRequest) => Promise<KnowledgeMap>;
  updateKnowledgeMap: (id: string, updates: Partial<KnowledgeMap>) => void;
  deleteKnowledgeMap: (id: string) => void;
  setActiveKnowledgeMap: (id: string | null) => void;
  getKnowledgeMap: (id: string) => KnowledgeMap | null;
  
  // PDF Conversion
  convertPDFToKnowledgeMap: (pdfPath: string, options?: Partial<PDFConversionOptions>) => Promise<PDFConversionResult>;
  
  // Content-based Generation
  generateFromContent: (content: string, title?: string) => Promise<KnowledgeMap>;
  
  // Mind Map
  generateMindMap: (request: MindMapGenerationRequest) => Promise<MindMapData | null>;
  updateMindMap: (knowledgeMapId: string, mindMap: MindMapData) => void;
  
  // Annotations
  addAnnotation: (annotation: {
    knowledgeMapId: string;
    type: KnowledgeAnnotationType;
    content: string;
    locationRef: string;
    pageNumber?: number;
    color?: string;
  }) => KnowledgeAnnotation;
  updateAnnotation: (id: string, updates: Partial<KnowledgeAnnotation>) => void;
  deleteAnnotation: (id: string) => void;
  
  // Navigation
  navigateTo: (target: KnowledgeMapNavigationTarget) => void;
  navigateBack: () => void;
  navigateForward: () => void;
  navigateToLocation: (knowledgeMapId: string, traceId: string, locationId: string) => void;
  navigateToPage: (knowledgeMapId: string, pageNumber: number) => void;
  
  // Trace Management
  addTrace: (trace: Omit<KnowledgeMapTrace, 'id'>) => void;
  updateTrace: (traceId: string, updates: Partial<KnowledgeMapTrace>) => void;
  deleteTrace: (traceId: string) => void;
  
  // Location Management
  addLocation: (traceId: string, location: Omit<KnowledgeMapLocation, 'id'>) => void;
  updateLocation: (traceId: string, locationId: string, updates: Partial<KnowledgeMapLocation>) => void;
  deleteLocation: (traceId: string, locationId: string) => void;
  
  // Import/Export
  importFromCodemap: (data: string) => Promise<KnowledgeMap | null>;
  exportToCodemap: () => string | null;
  importFromFile: (file: File) => Promise<KnowledgeMap | null>;
  exportToFile: (filename?: string) => void;
  
  // Utility
  clearError: () => void;
  reset: () => void;
}

export function useKnowledgeMap(): UseKnowledgeMapReturn {
  const store = useKnowledgeMapStore();

  const knowledgeMaps = useMemo(() => {
    return Object.values(store.knowledgeMaps);
  }, [store.knowledgeMaps]);

  const activeKnowledgeMap = useMemo(() => {
    if (!store.activeKnowledgeMapId) return null;
    return store.knowledgeMaps[store.activeKnowledgeMapId] || null;
  }, [store.activeKnowledgeMapId, store.knowledgeMaps]);

  const annotations = useMemo(() => {
    if (!store.activeKnowledgeMapId) return [];
    return store.annotations[store.activeKnowledgeMapId] || [];
  }, [store.activeKnowledgeMapId, store.annotations]);

  const canNavigateBack = store.canNavigateBack();
  const canNavigateForward = store.canNavigateForward();

  // Knowledge Map CRUD
  const createKnowledgeMap = useCallback(
    (request: KnowledgeMapGenerationRequest) => store.createKnowledgeMap(request),
    [store]
  );

  const updateKnowledgeMap = useCallback(
    (id: string, updates: Partial<KnowledgeMap>) => store.updateKnowledgeMap(id, updates),
    [store]
  );

  const deleteKnowledgeMap = useCallback(
    (id: string) => store.deleteKnowledgeMap(id),
    [store]
  );

  const setActiveKnowledgeMap = useCallback(
    (id: string | null) => store.setActiveKnowledgeMap(id),
    [store]
  );

  const getKnowledgeMap = useCallback(
    (id: string) => store.getKnowledgeMap(id),
    [store]
  );

  // PDF Conversion
  const convertPDFToKnowledgeMap = useCallback(
    (pdfPath: string, options?: Partial<PDFConversionOptions>) =>
      store.convertPDFToKnowledgeMap(pdfPath, options),
    [store]
  );

  // Content-based Generation
  const generateFromContent = useCallback(
    (content: string, title?: string) => store.generateFromContent(content, title),
    [store]
  );

  // Mind Map
  const generateMindMap = useCallback(
    (request: MindMapGenerationRequest) => store.generateMindMap(request),
    [store]
  );

  const updateMindMap = useCallback(
    (knowledgeMapId: string, mindMap: MindMapData) =>
      store.updateMindMap(knowledgeMapId, mindMap),
    [store]
  );

  // Annotations
  const addAnnotation = useCallback(
    (annotation: {
      knowledgeMapId: string;
      type: KnowledgeAnnotationType;
      content: string;
      locationRef: string;
      pageNumber?: number;
      color?: string;
    }) => store.addAnnotation(annotation),
    [store]
  );

  const updateAnnotation = useCallback(
    (id: string, updates: Partial<KnowledgeAnnotation>) =>
      store.updateAnnotation(id, updates),
    [store]
  );

  const deleteAnnotation = useCallback(
    (id: string) => store.deleteAnnotation(id),
    [store]
  );

  // Navigation
  const navigateTo = useCallback(
    (target: KnowledgeMapNavigationTarget) => store.navigateTo(target),
    [store]
  );

  const navigateBack = useCallback(() => store.navigateBack(), [store]);

  const navigateForward = useCallback(() => store.navigateForward(), [store]);

  const navigateToLocation = useCallback(
    (knowledgeMapId: string, traceId: string, locationId: string) => {
      store.navigateTo({
        knowledgeMapId,
        traceId,
        locationId,
      });
    },
    [store]
  );

  const navigateToPage = useCallback(
    (knowledgeMapId: string, pageNumber: number) => {
      store.navigateTo({
        knowledgeMapId,
        pageNumber,
      });
    },
    [store]
  );

  // Trace Management
  const addTrace = useCallback(
    (trace: Omit<KnowledgeMapTrace, 'id'>) => {
      if (!store.activeKnowledgeMapId) return;
      store.addTrace(store.activeKnowledgeMapId, trace);
    },
    [store]
  );

  const updateTrace = useCallback(
    (traceId: string, updates: Partial<KnowledgeMapTrace>) => {
      if (!store.activeKnowledgeMapId) return;
      store.updateTrace(store.activeKnowledgeMapId, traceId, updates);
    },
    [store]
  );

  const deleteTrace = useCallback(
    (traceId: string) => {
      if (!store.activeKnowledgeMapId) return;
      store.deleteTrace(store.activeKnowledgeMapId, traceId);
    },
    [store]
  );

  // Location Management
  const addLocation = useCallback(
    (traceId: string, location: Omit<KnowledgeMapLocation, 'id'>) => {
      if (!store.activeKnowledgeMapId) return;
      store.addLocation(store.activeKnowledgeMapId, traceId, location);
    },
    [store]
  );

  const updateLocation = useCallback(
    (traceId: string, locationId: string, updates: Partial<KnowledgeMapLocation>) => {
      if (!store.activeKnowledgeMapId) return;
      store.updateLocation(store.activeKnowledgeMapId, traceId, locationId, updates);
    },
    [store]
  );

  const deleteLocation = useCallback(
    (traceId: string, locationId: string) => {
      if (!store.activeKnowledgeMapId) return;
      store.deleteLocation(store.activeKnowledgeMapId, traceId, locationId);
    },
    [store]
  );

  // Import/Export
  const importFromCodemap = useCallback(
    (data: string) => store.importFromCodemap(data),
    [store]
  );

  const exportToCodemap = useCallback(() => {
    if (!store.activeKnowledgeMapId) return null;
    return store.exportToCodemap(store.activeKnowledgeMapId);
  }, [store]);

  const importFromFile = useCallback(
    (file: File) => store.importFromFile(file),
    [store]
  );

  const exportToFile = useCallback(
    (filename?: string) => {
      if (!store.activeKnowledgeMapId) return;
      store.exportToFile(store.activeKnowledgeMapId, filename);
    },
    [store]
  );

  // Utility
  const clearError = useCallback(() => store.clearError(), [store]);
  const reset = useCallback(() => store.reset(), [store]);

  return {
    // State
    knowledgeMaps,
    activeKnowledgeMap,
    annotations,
    isGenerating: store.isGenerating,
    generationProgress: store.generationProgress,
    error: store.error,
    
    // Navigation state
    canNavigateBack,
    canNavigateForward,
    
    // Knowledge Map CRUD
    createKnowledgeMap,
    updateKnowledgeMap,
    deleteKnowledgeMap,
    setActiveKnowledgeMap,
    getKnowledgeMap,
    
    // PDF Conversion
    convertPDFToKnowledgeMap,
    
    // Content-based Generation
    generateFromContent,
    
    // Mind Map
    generateMindMap,
    updateMindMap,
    
    // Annotations
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    
    // Navigation
    navigateTo,
    navigateBack,
    navigateForward,
    navigateToLocation,
    navigateToPage,
    
    // Trace Management
    addTrace,
    updateTrace,
    deleteTrace,
    
    // Location Management
    addLocation,
    updateLocation,
    deleteLocation,
    
    // Import/Export
    importFromCodemap,
    exportToCodemap,
    importFromFile,
    exportToFile,
    
    // Utility
    clearError,
    reset,
  };
}

export default useKnowledgeMap;
