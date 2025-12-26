import { invoke } from '@tauri-apps/api/core';
import { isTauri } from './utils';

export interface NativeVectorPoint {
  id: string;
  vector: number[];
  payload?: Record<string, unknown>;
}

export interface NativeCollectionInfo {
  name: string;
  dimension: number;
  metadata?: Record<string, unknown>;
  document_count?: number;
  created_at?: number;
  updated_at?: number;
  description?: string;
  embedding_model?: string;
  embedding_provider?: string;
}

export interface NativePayloadFilter {
  key: string;
  value: unknown;
  operation: 
    | 'equals' 
    | 'not_equals' 
    | 'contains' 
    | 'not_contains' 
    | 'greater_than' 
    | 'greater_than_or_equals' 
    | 'less_than' 
    | 'less_than_or_equals'
    | 'is_null'
    | 'is_not_null'
    | 'starts_with'
    | 'ends_with'
    | 'in'
    | 'not_in';
}

export interface NativeSearchResult {
  id: string;
  score: number;
  payload?: Record<string, unknown>;
}

export interface NativeSearchResponse {
  results: NativeSearchResult[];
  total: number;
  offset: number;
  limit: number;
}

export interface NativeScrollResponse {
  points: NativeVectorPoint[];
  total: number;
  offset: number;
  limit: number;
  has_more: boolean;
}

export interface NativeVectorStats {
  collection_count: number;
  total_points: number;
  storage_path: string;
  storage_size_bytes: number;
}

export interface NativeCollectionExport {
  meta: NativeCollectionInfo;
  points: NativeVectorPoint[];
}

export interface NativeCollectionImport {
  meta: NativeCollectionInfo;
  points: NativeVectorPoint[];
}

export async function nativeVectorCreateCollection(
  name: string,
  dimension: number,
  metadata?: Record<string, unknown>
): Promise<boolean> {
  if (!isTauri()) throw new Error('Native vector store requires Tauri runtime');
  return invoke<boolean>('vector_create_collection', { payload: { name, dimension, metadata } });
}

export async function nativeVectorDeleteCollection(name: string): Promise<boolean> {
  if (!isTauri()) throw new Error('Native vector store requires Tauri runtime');
  return invoke<boolean>('vector_delete_collection', { name });
}

export async function nativeVectorListCollections(): Promise<NativeCollectionInfo[]> {
  if (!isTauri()) throw new Error('Native vector store requires Tauri runtime');
  return invoke<NativeCollectionInfo[]>('vector_list_collections');
}

export async function nativeVectorGetCollection(name: string): Promise<NativeCollectionInfo> {
  if (!isTauri()) throw new Error('Native vector store requires Tauri runtime');
  return invoke<NativeCollectionInfo>('vector_get_collection', { name });
}

export async function nativeVectorUpsertPoints(collection: string, points: NativeVectorPoint[]): Promise<boolean> {
  if (!isTauri()) throw new Error('Native vector store requires Tauri runtime');
  return invoke<boolean>('vector_upsert_points', { collection, points });
}

export async function nativeVectorDeletePoints(collection: string, ids: string[]): Promise<boolean> {
  if (!isTauri()) throw new Error('Native vector store requires Tauri runtime');
  return invoke<boolean>('vector_delete_points', { collection, ids });
}

export async function nativeVectorGetPoints(collection: string, ids: string[]): Promise<NativeVectorPoint[]> {
  if (!isTauri()) throw new Error('Native vector store requires Tauri runtime');
  return invoke<NativeVectorPoint[]>('vector_get_points', { collection, ids });
}

export interface NativeSearchOptions {
  topK?: number;
  scoreThreshold?: number;
  offset?: number;
  limit?: number;
  filters?: NativePayloadFilter[];
  filterMode?: 'and' | 'or';
}

export async function nativeVectorSearch(
  collection: string,
  vector: number[],
  options: NativeSearchOptions = {}
): Promise<NativeSearchResponse> {
  if (!isTauri()) throw new Error('Native vector store requires Tauri runtime');
  return invoke<NativeSearchResponse>('vector_search_points', {
    payload: { 
      collection, 
      vector, 
      top_k: options.topK,
      score_threshold: options.scoreThreshold,
      offset: options.offset,
      limit: options.limit,
      filters: options.filters,
      filter_mode: options.filterMode,
    },
  });
}

export async function nativeVectorDeleteAllPoints(collection: string): Promise<number> {
  if (!isTauri()) throw new Error('Native vector store requires Tauri runtime');
  return invoke<number>('vector_delete_all_points', { collection });
}

export async function nativeVectorStats(): Promise<NativeVectorStats> {
  if (!isTauri()) throw new Error('Native vector store requires Tauri runtime');
  return invoke<NativeVectorStats>('vector_stats');
}

export interface NativeScrollOptions {
  offset?: number;
  limit?: number;
  filters?: NativePayloadFilter[];
  filterMode?: 'and' | 'or';
}

export async function nativeVectorScrollPoints(
  collection: string,
  options: NativeScrollOptions = {}
): Promise<NativeScrollResponse> {
  if (!isTauri()) throw new Error('Native vector store requires Tauri runtime');
  return invoke<NativeScrollResponse>('vector_scroll_points', {
    payload: {
      collection,
      offset: options.offset,
      limit: options.limit,
      filters: options.filters,
      filter_mode: options.filterMode,
    },
  });
}

export async function nativeVectorRenameCollection(
  oldName: string,
  newName: string
): Promise<boolean> {
  if (!isTauri()) throw new Error('Native vector store requires Tauri runtime');
  return invoke<boolean>('vector_rename_collection', { old_name: oldName, new_name: newName });
}

export async function nativeVectorTruncateCollection(name: string): Promise<boolean> {
  if (!isTauri()) throw new Error('Native vector store requires Tauri runtime');
  return invoke<boolean>('vector_truncate_collection', { name });
}

export async function nativeVectorExportCollection(name: string): Promise<NativeCollectionExport> {
  if (!isTauri()) throw new Error('Native vector store requires Tauri runtime');
  return invoke<NativeCollectionExport>('vector_export_collection', { name });
}

export async function nativeVectorImportCollection(
  importData: NativeCollectionImport,
  overwrite?: boolean
): Promise<boolean> {
  if (!isTauri()) throw new Error('Native vector store requires Tauri runtime');
  return invoke<boolean>('vector_import_collection', { 
    import_data: importData, 
    overwrite: overwrite ?? false 
  });
}
