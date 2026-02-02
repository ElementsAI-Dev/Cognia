/**
 * Background asset storage (web)
 *
 * Stores user-selected background images in IndexedDB (Dexie) to avoid
 * large base64 strings in localStorage.
 * 
 * Features:
 * - Automatic image compression for large files (>1MB)
 * - Maximum resolution capped at 4K (3840x2160)
 * - Preserves original quality for smaller images
 */

import { nanoid } from 'nanoid';
import { db } from '@/lib/db/schema';
import { BACKGROUND_LIMITS } from './appearance-constants';

/**
 * Compress image using canvas if it exceeds size/dimension limits
 */
async function compressImageIfNeeded(
  file: File,
  maxWidth = BACKGROUND_LIMITS.maxImageWidth,
  maxHeight = BACKGROUND_LIMITS.maxImageHeight,
  quality = BACKGROUND_LIMITS.imageCompressionQuality
): Promise<{ blob: Blob; compressed: boolean }> {
  // Skip compression for small files and non-image types
  if (file.size <= BACKGROUND_LIMITS.imageCompressionThreshold || !file.type.startsWith('image/')) {
    return { blob: file, compressed: false };
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Check if resize needed
      if (width <= maxWidth && height <= maxHeight && file.size <= BACKGROUND_LIMITS.imageCompressionThreshold) {
        resolve({ blob: file, compressed: false });
        return;
      }

      // Calculate new dimensions maintaining aspect ratio
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      // Create canvas and resize
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ blob: file, compressed: false });
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob with compression
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            resolve({ blob, compressed: true });
          } else {
            // Compression didn't help, use original
            resolve({ blob: file, compressed: false });
          }
        },
        file.type || 'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ blob: file, compressed: false });
    };

    img.src = url;
  });
}

export interface SaveBackgroundImageResult {
  assetId: string;
  compressed: boolean;
  originalSize: number;
  finalSize: number;
}

export async function saveBackgroundImageAsset(file: File): Promise<SaveBackgroundImageResult> {
  const assetId = `bg-${nanoid()}`;
  const originalSize = file.size;

  // Compress image if needed
  const { blob: processedBlob, compressed } = await compressImageIfNeeded(file);

  await db.assets.put({
    id: assetId,
    kind: 'background-image',
    blob: processedBlob,
    mimeType: processedBlob.type || file.type || 'application/octet-stream',
    filename: file.name,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return {
    assetId,
    compressed,
    originalSize,
    finalSize: processedBlob.size,
  };
}

export async function getBackgroundImageAssetBlob(assetId: string): Promise<Blob | null> {
  const asset = await db.assets.get(assetId);
  if (!asset || asset.kind !== 'background-image') return null;
  return asset.blob;
}

export async function deleteBackgroundImageAsset(assetId: string): Promise<void> {
  await db.assets.delete(assetId);
}
