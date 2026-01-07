/**
 * Background asset storage (web)
 *
 * Stores user-selected background images in IndexedDB (Dexie) to avoid
 * large base64 strings in localStorage.
 */

import { nanoid } from 'nanoid';
import { db } from '@/lib/db/schema';

export async function saveBackgroundImageAsset(file: File): Promise<{ assetId: string }> {
  const assetId = `bg-${nanoid()}`;
  await db.assets.put({
    id: assetId,
    kind: 'background-image',
    blob: file,
    mimeType: file.type || 'application/octet-stream',
    filename: file.name,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return { assetId };
}

export async function getBackgroundImageAssetBlob(assetId: string): Promise<Blob | null> {
  const asset = await db.assets.get(assetId);
  if (!asset || asset.kind !== 'background-image') return null;
  return asset.blob;
}

export async function deleteBackgroundImageAsset(assetId: string): Promise<void> {
  await db.assets.delete(assetId);
}
