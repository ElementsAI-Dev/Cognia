/**
 * Image utilities for vision models
 */

/**
 * Convert a File or Blob to base64 data URL
 */
export async function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Convert a URL to base64 (for blob URLs)
 */
export async function urlToBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return fileToBase64(blob);
}

/**
 * Extract base64 data from a data URL
 */
export function extractBase64(dataUrl: string): { mimeType: string; data: string } {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid data URL');
  }
  return {
    mimeType: matches[1],
    data: matches[2],
  };
}

/**
 * Check if a file is an image
 */
export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/**
 * Check if a model supports vision
 */
export function isVisionModel(model: string): boolean {
  const visionModels = [
    // OpenAI
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-4-vision-preview',
    // Anthropic
    'claude-3-opus',
    'claude-3-sonnet',
    'claude-3-haiku',
    'claude-3-5-sonnet',
    'claude-sonnet-4',
    // Google
    'gemini-pro-vision',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-2.0-flash-exp',
  ];

  return visionModels.some((vm) => model.toLowerCase().includes(vm.toLowerCase()));
}

/**
 * Resize image if too large (for API limits)
 * Returns a base64 data URL
 */
export async function resizeImageIfNeeded(
  file: File | Blob,
  maxWidth = 2048,
  maxHeight = 2048,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Check if resize needed
      if (width <= maxWidth && height <= maxHeight) {
        // No resize needed, just convert to base64
        fileToBase64(file).then(resolve).catch(reject);
        return;
      }

      // Calculate new dimensions
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);

      // Create canvas and resize
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Get base64
      const mimeType = file.type || 'image/jpeg';
      resolve(canvas.toDataURL(mimeType, quality));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Image content for vision API
 */
export interface ImageContent {
  type: 'image';
  image: string; // base64 data (without data: prefix) or URL
  mimeType: string;
}

/**
 * Text content
 */
export interface TextContent {
  type: 'text';
  text: string;
}

export type MessageContent = TextContent | ImageContent;

/**
 * Build multimodal message content from text and attachments
 */
export async function buildMultimodalContent(
  text: string,
  attachments?: Array<{ url: string; mimeType: string; file?: File | Blob }>
): Promise<MessageContent[]> {
  const content: MessageContent[] = [];

  // Add images first
  if (attachments) {
    for (const attachment of attachments) {
      if (isImageFile(attachment.mimeType)) {
        try {
          let base64: string;

          // If we have the file, resize if needed
          if (attachment.file) {
            base64 = await resizeImageIfNeeded(attachment.file);
          } else {
            // URL might be a blob URL, convert it
            base64 = await urlToBase64(attachment.url);
          }

          const { mimeType, data } = extractBase64(base64);
          content.push({
            type: 'image',
            image: data,
            mimeType,
          });
        } catch (error) {
          console.error('Error processing image:', error);
        }
      }
    }
  }

  // Add text
  if (text.trim()) {
    content.push({
      type: 'text',
      text: text.trim(),
    });
  }

  return content;
}
