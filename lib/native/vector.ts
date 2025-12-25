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

export async function nativeVectorSearch(
  collection: string,
  vector: number[],
  topK?: number,
  scoreThreshold?: number
): Promise<{ id: string; score: number; payload?: Record<string, unknown> }[]> {
  if (!isTauri()) throw new Error('Native vector store requires Tauri runtime');
  return invoke('vector_search_points', {
    payload: { collection, vector, top_k: topK, score_threshold: scoreThreshold },
  });
}
