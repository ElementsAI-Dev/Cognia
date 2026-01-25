/**
 * Progressive Image Loader
 * Provides progressive loading with low-res preview, blurhash placeholders,
 * and lazy loading for optimal performance
 */

export interface ProgressiveLoadOptions {
  maxPreviewSize?: number;
  previewQuality?: number;
  useBlurhash?: boolean;
  onProgress?: (progress: number) => void;
  onPreviewReady?: (previewUrl: string) => void;
  onFullReady?: (imageData: ImageData) => void;
}

export interface LoadedImage {
  preview: string | null;
  full: ImageData | null;
  width: number;
  height: number;
  blurhash?: string;
}

/**
 * Generate blurhash-like placeholder from ImageData
 * Simplified version that creates an average color representation
 */
function generateSimpleBlurhash(imageData: ImageData, componentsX = 4, componentsY = 3): string {
  const { width, height, data } = imageData;

  // Calculate average color for each component region
  const components: Array<{ r: number; g: number; b: number }> = [];

  for (let cy = 0; cy < componentsY; cy++) {
    for (let cx = 0; cx < componentsX; cx++) {
      let r = 0, g = 0, b = 0, count = 0;

      const startX = Math.floor((cx / componentsX) * width);
      const endX = Math.floor(((cx + 1) / componentsX) * width);
      const startY = Math.floor((cy / componentsY) * height);
      const endY = Math.floor(((cy + 1) / componentsY) * height);

      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const idx = (y * width + x) * 4;
          r += data[idx];
          g += data[idx + 1];
          b += data[idx + 2];
          count++;
        }
      }

      if (count > 0) {
        components.push({
          r: Math.round(r / count),
          g: Math.round(g / count),
          b: Math.round(b / count),
        });
      }
    }
  }

  // Encode as base64 string (simplified format)
  const encoded = components.map((c) => `${c.r.toString(16).padStart(2, '0')}${c.g.toString(16).padStart(2, '0')}${c.b.toString(16).padStart(2, '0')}`).join('');

  return `${componentsX}x${componentsY}:${encoded}`;
}

/**
 * Decode blurhash-like string to ImageData
 */
function decodeBlurhash(hash: string, width: number, height: number): ImageData {
  const [size, encoded] = hash.split(':');
  const [cx, cy] = size.split('x').map(Number);

  const components: Array<{ r: number; g: number; b: number }> = [];
  for (let i = 0; i < encoded.length; i += 6) {
    components.push({
      r: parseInt(encoded.slice(i, i + 2), 16),
      g: parseInt(encoded.slice(i + 2, i + 4), 16),
      b: parseInt(encoded.slice(i + 4, i + 6), 16),
    });
  }

  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const compX = Math.min(Math.floor((x / width) * cx), cx - 1);
      const compY = Math.min(Math.floor((y / height) * cy), cy - 1);
      const comp = components[compY * cx + compX];

      if (comp) {
        const idx = (y * width + x) * 4;
        data[idx] = comp.r;
        data[idx + 1] = comp.g;
        data[idx + 2] = comp.b;
        data[idx + 3] = 255;
      }
    }
  }

  return new ImageData(data, width, height);
}

/**
 * Create low-resolution preview (async version)
 */
function _createPreview(
  imageData: ImageData,
  maxSize: number,
  quality: number
): { dataUrl: string; width: number; height: number } {
  const { width, height } = imageData;

  // Calculate preview dimensions
  const scale = Math.min(maxSize / width, maxSize / height, 1);
  const previewWidth = Math.round(width * scale);
  const previewHeight = Math.round(height * scale);

  // Create preview canvas
  const canvas = new OffscreenCanvas(previewWidth, previewHeight);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  // Draw original image scaled down
  const sourceCanvas = new OffscreenCanvas(width, height);
  const sourceCtx = sourceCanvas.getContext('2d');
  if (!sourceCtx) throw new Error('Failed to get source context');
  sourceCtx.putImageData(imageData, 0, 0);

  ctx.drawImage(sourceCanvas, 0, 0, previewWidth, previewHeight);

  // Convert to data URL
  return new Promise((resolve) => {
    canvas.convertToBlob({ type: 'image/jpeg', quality }).then((blob) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          dataUrl: reader.result as string,
          width: previewWidth,
          height: previewHeight,
        });
      };
      reader.readAsDataURL(blob);
    });
  }) as unknown as { dataUrl: string; width: number; height: number };
}

/**
 * Create preview synchronously using canvas
 */
function createPreviewSync(
  imageData: ImageData,
  maxSize: number,
  _quality: number
): { dataUrl: string; width: number; height: number } {
  const { width, height } = imageData;

  const scale = Math.min(maxSize / width, maxSize / height, 1);
  const previewWidth = Math.round(width * scale);
  const previewHeight = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = previewWidth;
  canvas.height = previewHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  const sourceCtx = sourceCanvas.getContext('2d');
  if (!sourceCtx) throw new Error('Failed to get source context');
  sourceCtx.putImageData(imageData, 0, 0);

  ctx.drawImage(sourceCanvas, 0, 0, previewWidth, previewHeight);

  return {
    dataUrl: canvas.toDataURL('image/jpeg', 0.6),
    width: previewWidth,
    height: previewHeight,
  };
}

/**
 * Progressive image loader class
 */
export class ProgressiveImageLoader {
  private options: Required<ProgressiveLoadOptions>;
  private abortController: AbortController | null = null;

  constructor(options: ProgressiveLoadOptions = {}) {
    this.options = {
      maxPreviewSize: options.maxPreviewSize ?? 64,
      previewQuality: options.previewQuality ?? 0.3,
      useBlurhash: options.useBlurhash ?? true,
      onProgress: options.onProgress ?? (() => {}),
      onPreviewReady: options.onPreviewReady ?? (() => {}),
      onFullReady: options.onFullReady ?? (() => {}),
    };
  }

  /**
   * Load image from URL with progressive loading
   */
  async loadFromUrl(url: string): Promise<LoadedImage> {
    this.abortController = new AbortController();
    const { signal } = this.abortController;

    const result: LoadedImage = {
      preview: null,
      full: null,
      width: 0,
      height: 0,
    };

    try {
      // Fetch image
      const response = await fetch(url, { signal });
      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;

      // Read the response as array buffer with progress
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Failed to get response reader');

      const chunks: Uint8Array[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        received += value.length;

        if (total > 0) {
          this.options.onProgress(received / total);
        }
      }

      // Combine chunks
      const blob = new Blob(chunks as BlobPart[]);
      const imageUrl = URL.createObjectURL(blob);

      // Load as image
      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = imageUrl;
      });

      // Create canvas and get ImageData
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get canvas context');

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);

      URL.revokeObjectURL(imageUrl);

      result.width = img.width;
      result.height = img.height;
      result.full = imageData;

      // Generate preview
      const preview = createPreviewSync(
        imageData,
        this.options.maxPreviewSize,
        this.options.previewQuality
      );
      result.preview = preview.dataUrl;
      this.options.onPreviewReady(preview.dataUrl);

      // Generate blurhash
      if (this.options.useBlurhash) {
        const smallPreview = createPreviewSync(imageData, 32, 0.5);
        const previewCanvas = document.createElement('canvas');
        previewCanvas.width = 32;
        previewCanvas.height = Math.round(32 * (img.height / img.width));
        const previewCtx = previewCanvas.getContext('2d');
        if (previewCtx) {
          const previewImg = new Image();
          previewImg.src = smallPreview.dataUrl;
          await new Promise((resolve) => {
            previewImg.onload = resolve;
          });
          previewCtx.drawImage(previewImg, 0, 0, previewCanvas.width, previewCanvas.height);
          const previewData = previewCtx.getImageData(0, 0, previewCanvas.width, previewCanvas.height);
          result.blurhash = generateSimpleBlurhash(previewData);
        }
      }

      this.options.onFullReady(imageData);

      return result;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new Error('Image loading cancelled');
      }
      throw error;
    }
  }

  /**
   * Load image from File
   */
  async loadFromFile(file: File): Promise<LoadedImage> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          this.options.onProgress(e.loaded / e.total);
        }
      };

      reader.onload = async () => {
        try {
          const img = new Image();

          await new Promise<void>((imgResolve, imgReject) => {
            img.onload = () => imgResolve();
            img.onerror = () => imgReject(new Error('Failed to load image'));
            img.src = reader.result as string;
          });

          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Failed to get canvas context');

          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);

          const result: LoadedImage = {
            preview: null,
            full: imageData,
            width: img.width,
            height: img.height,
          };

          // Generate preview
          const preview = createPreviewSync(
            imageData,
            this.options.maxPreviewSize,
            this.options.previewQuality
          );
          result.preview = preview.dataUrl;
          this.options.onPreviewReady(preview.dataUrl);

          // Generate blurhash
          if (this.options.useBlurhash) {
            result.blurhash = generateSimpleBlurhash(imageData);
          }

          this.options.onFullReady(imageData);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Load image from ImageData (generate preview/blurhash only)
   */
  loadFromImageData(imageData: ImageData): LoadedImage {
    const result: LoadedImage = {
      preview: null,
      full: imageData,
      width: imageData.width,
      height: imageData.height,
    };

    // Generate preview
    const preview = createPreviewSync(
      imageData,
      this.options.maxPreviewSize,
      this.options.previewQuality
    );
    result.preview = preview.dataUrl;

    // Generate blurhash
    if (this.options.useBlurhash) {
      result.blurhash = generateSimpleBlurhash(imageData);
    }

    return result;
  }

  /**
   * Generate placeholder from blurhash
   */
  static generatePlaceholder(blurhash: string, width: number, height: number): ImageData {
    return decodeBlurhash(blurhash, width, height);
  }

  /**
   * Cancel ongoing load operation
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}

export default ProgressiveImageLoader;
