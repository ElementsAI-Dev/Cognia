/**
 * Knowledge Map Store Types
 * Shared state/action/slice creator types for knowledge map store and slices.
 */

import type {
  KnowledgeMap,
  KnowledgeMapTrace,
  KnowledgeMapLocation,
  KnowledgeAnnotation,
  KnowledgeMapNavigationHistory,
  KnowledgeMapNavigationTarget,
  KnowledgeMapGenerationRequest,
  MindMapData,
  MindMapGenerationRequest,
  PDFConversionOptions,
  PDFConversionResult,
} from '@/types/learning/knowledge-map';

export interface KnowledgeMapStoreDataState {
  knowledgeMaps: Record<string, KnowledgeMap>;
  activeKnowledgeMapId: string | null;
  annotations: Record<string, KnowledgeAnnotation[]>;
  navigationHistory: KnowledgeMapNavigationHistory;
  isGenerating: boolean;
  generationProgress: number;
  error: string | null;
}

export interface KnowledgeMapCrudActions {
  createKnowledgeMap: (request: KnowledgeMapGenerationRequest) => Promise<KnowledgeMap>;
  updateKnowledgeMap: (id: string, updates: Partial<KnowledgeMap>) => void;
  deleteKnowledgeMap: (id: string) => void;
  getKnowledgeMap: (id: string) => KnowledgeMap | null;
  setActiveKnowledgeMap: (id: string | null) => void;
}

export interface KnowledgeMapGenerationActions {
  convertPDFToKnowledgeMap: (
    pdfPath: string,
    options?: Partial<PDFConversionOptions>
  ) => Promise<PDFConversionResult>;
  generateFromContent: (content: string, title?: string) => Promise<KnowledgeMap>;
  generateMindMap: (request: MindMapGenerationRequest) => Promise<MindMapData | null>;
  updateMindMap: (knowledgeMapId: string, mindMap: MindMapData) => void;
}

export interface KnowledgeMapAnnotationActions {
  addAnnotation: (
    annotation: Omit<KnowledgeAnnotation, 'id' | 'createdAt' | 'updatedAt'>
  ) => KnowledgeAnnotation;
  updateAnnotation: (id: string, updates: Partial<KnowledgeAnnotation>) => void;
  deleteAnnotation: (id: string) => void;
  getAnnotationsForKnowledgeMap: (knowledgeMapId: string) => KnowledgeAnnotation[];
}

export interface KnowledgeMapNavigationActions {
  navigateTo: (target: KnowledgeMapNavigationTarget) => void;
  navigateBack: () => void;
  navigateForward: () => void;
  canNavigateBack: () => boolean;
  canNavigateForward: () => boolean;
}

export interface KnowledgeMapImportExportActions {
  importFromCodemap: (data: string) => Promise<KnowledgeMap | null>;
  exportToCodemap: (id: string) => string | null;
  importFromFile: (file: File) => Promise<KnowledgeMap | null>;
  exportToFile: (id: string, filename?: string) => void;
}

export interface KnowledgeMapTraceActions {
  addTrace: (knowledgeMapId: string, trace: Omit<KnowledgeMapTrace, 'id'>) => void;
  updateTrace: (
    knowledgeMapId: string,
    traceId: string,
    updates: Partial<KnowledgeMapTrace>
  ) => void;
  deleteTrace: (knowledgeMapId: string, traceId: string) => void;
  addLocation: (
    knowledgeMapId: string,
    traceId: string,
    location: Omit<KnowledgeMapLocation, 'id'>
  ) => void;
  updateLocation: (
    knowledgeMapId: string,
    traceId: string,
    locationId: string,
    updates: Partial<KnowledgeMapLocation>
  ) => void;
  deleteLocation: (knowledgeMapId: string, traceId: string, locationId: string) => void;
}

export interface KnowledgeMapAppActions {
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

export type KnowledgeMapStoreState = KnowledgeMapStoreDataState &
  KnowledgeMapCrudActions &
  KnowledgeMapGenerationActions &
  KnowledgeMapAnnotationActions &
  KnowledgeMapNavigationActions &
  KnowledgeMapImportExportActions &
  KnowledgeMapTraceActions &
  KnowledgeMapAppActions;

export type KnowledgeMapStoreInitialState = KnowledgeMapStoreDataState;

export type KnowledgeMapStoreSet = (
  updater:
    | Partial<KnowledgeMapStoreState>
    | KnowledgeMapStoreState
    | ((state: KnowledgeMapStoreState) => Partial<KnowledgeMapStoreState> | KnowledgeMapStoreState)
) => void;

export type KnowledgeMapStoreGet = () => KnowledgeMapStoreState;

export type KnowledgeMapSliceCreator<T> = (
  set: KnowledgeMapStoreSet,
  get: KnowledgeMapStoreGet
) => T;
