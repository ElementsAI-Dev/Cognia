/**
 * Image Export - Export chat conversations as images (PNG, JPG, WebP)
 * 
 * Uses html2canvas for rendering HTML to canvas and then to image
 */

import type { UIMessage, Session } from '@/types';
import { loggers } from '@/lib/logger';

const log = loggers.app;

const MAX_CANVAS_DIMENSION = 16384;
const MAX_CANVAS_AREA = 268_435_456; // 16384 * 16384
const MIN_CANVAS_SCALE = 0.1;

export interface ImageExportOptions {
  format: 'png' | 'jpg' | 'webp';
  quality: number; // 0.1 - 1.0 (for jpg/webp)
  scale: number; // 1, 2, 3 for DPI scaling
  theme: 'light' | 'dark' | 'system';
  width?: number; // Custom width, auto if not provided
  padding?: number;
  backgroundColor?: string;
  includeHeader?: boolean;
  includeFooter?: boolean;
  selectedMessageIds?: string[]; // Export only selected messages
  maxMessages?: number;
  showTimestamps?: boolean;
  showModel?: boolean;
  borderRadius?: number;
  fontScale?: number;
}

export function getSafeCanvasScale(
  width: number,
  height: number,
  scale: number
): { scale: number; constrained: boolean } {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { scale, constrained: false };
  }

  const maxScaleByDimension = Math.min(
    MAX_CANVAS_DIMENSION / width,
    MAX_CANVAS_DIMENSION / height
  );
  const maxScaleByArea = Math.sqrt(MAX_CANVAS_AREA / (width * height));
  const maxScale = Math.min(maxScaleByDimension, maxScaleByArea);
  const safeScale = Math.min(scale, maxScale);

  if (!Number.isFinite(safeScale) || safeScale < MIN_CANVAS_SCALE) {
    throw new Error('Image export size exceeds browser canvas limits.');
  }

  return { scale: safeScale, constrained: safeScale < scale };
}

export interface ImageExportResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  format: string;
}

const DEFAULT_OPTIONS: Required<ImageExportOptions> = {
  format: 'png',
  quality: 0.92,
  scale: 2,
  theme: 'light',
  width: 800,
  padding: 32,
  backgroundColor: '#ffffff',
  includeHeader: true,
  includeFooter: true,
  selectedMessageIds: [],
  maxMessages: 50,
  showTimestamps: true,
  showModel: true,
  borderRadius: 16,
  fontScale: 1,
};

/**
 * Generate HTML template for image export
 */
function generateImageHTML(
  session: Session,
  messages: UIMessage[],
  options: Required<ImageExportOptions>
): string {
  const isDark = options.theme === 'dark' || 
    (options.theme === 'system' && typeof window !== 'undefined' && 
     window.matchMedia?.('(prefers-color-scheme: dark)').matches);

  const colors = isDark ? {
    bg: options.backgroundColor || '#1a1a1a',
    cardBg: '#2d2d2d',
    userBg: '#1e3a5f',
    assistantBg: '#2d2d2d',
    text: '#e0e0e0',
    textSecondary: '#9e9e9e',
    border: '#404040',
    accent: '#64b5f6',
  } : {
    bg: options.backgroundColor || '#ffffff',
    cardBg: '#ffffff',
    userBg: '#e3f2fd',
    assistantBg: '#f5f5f5',
    text: '#212121',
    textSecondary: '#757575',
    border: '#e0e0e0',
    accent: '#2196f3',
  };

  const fontScale = options.fontScale;
  const padding = options.padding;

  const messageHTML = messages.map(msg => {
    const isUser = msg.role === 'user';
    const bgColor = isUser ? colors.userBg : colors.assistantBg;
    const align = isUser ? 'flex-end' : 'flex-start';
    const role = isUser ? '👤 用户' : '🤖 助手';
    const timestamp = options.showTimestamps 
      ? `<span style="font-size: ${11 * fontScale}px; color: ${colors.textSecondary}; margin-left: 8px;">${msg.createdAt.toLocaleTimeString()}</span>` 
      : '';

    // Process content - escape HTML and handle code blocks
    const content = processContent(msg.content, colors, fontScale);

    return `
      <div style="display: flex; justify-content: ${align}; margin-bottom: ${16 * fontScale}px;">
        <div style="max-width: 85%; background: ${bgColor}; padding: ${14 * fontScale}px ${18 * fontScale}px; border-radius: ${12 * fontScale}px; ${isUser ? 'border-bottom-right-radius: 4px;' : 'border-bottom-left-radius: 4px;'}">
          <div style="display: flex; align-items: center; margin-bottom: ${6 * fontScale}px;">
            <span style="font-weight: 600; font-size: ${13 * fontScale}px; color: ${colors.text};">${role}</span>
            ${timestamp}
          </div>
          <div style="font-size: ${15 * fontScale}px; line-height: 1.6; color: ${colors.text}; white-space: pre-wrap; word-wrap: break-word;">
            ${content}
          </div>
        </div>
      </div>
    `;
  }).join('');

  const header = options.includeHeader ? `
    <div style="text-align: center; padding: ${24 * fontScale}px ${padding}px; background: linear-gradient(135deg, ${colors.accent}22 0%, ${colors.accent}11 100%); border-radius: ${options.borderRadius}px ${options.borderRadius}px 0 0; border-bottom: 1px solid ${colors.border};">
      <h1 style="margin: 0 0 ${8 * fontScale}px 0; font-size: ${22 * fontScale}px; font-weight: 600; color: ${colors.text};">${escapeHtml(session.title)}</h1>
      ${options.showModel ? `
        <div style="display: flex; justify-content: center; gap: ${8 * fontScale}px; flex-wrap: wrap;">
          <span style="font-size: ${12 * fontScale}px; padding: ${4 * fontScale}px ${10 * fontScale}px; background: ${colors.cardBg}; border-radius: ${12 * fontScale}px; color: ${colors.textSecondary};">${session.provider}</span>
          <span style="font-size: ${12 * fontScale}px; padding: ${4 * fontScale}px ${10 * fontScale}px; background: ${colors.cardBg}; border-radius: ${12 * fontScale}px; color: ${colors.textSecondary};">${session.model}</span>
          <span style="font-size: ${12 * fontScale}px; padding: ${4 * fontScale}px ${10 * fontScale}px; background: ${colors.accent}22; border-radius: ${12 * fontScale}px; color: ${colors.accent};">${session.mode}</span>
        </div>
      ` : ''}
    </div>
  ` : '';

  const footer = options.includeFooter ? `
    <div style="text-align: center; padding: ${16 * fontScale}px ${padding}px; border-top: 1px solid ${colors.border}; border-radius: 0 0 ${options.borderRadius}px ${options.borderRadius}px;">
      <p style="margin: 0; font-size: ${12 * fontScale}px; color: ${colors.textSecondary};">
        ${messages.length} 条消息 · 导出自 Cognia · ${new Date().toLocaleDateString()}
      </p>
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', Roboto, Oxygen, Ubuntu, sans-serif;
          background: ${colors.bg};
          color: ${colors.text};
        }
        .container {
          width: ${options.width}px;
          background: ${colors.cardBg};
          border-radius: ${options.borderRadius}px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        .messages {
          padding: ${padding}px;
        }
        pre {
          background: #1e1e1e;
          color: #d4d4d4;
          padding: ${12 * fontScale}px;
          border-radius: ${8 * fontScale}px;
          overflow-x: auto;
          margin: ${8 * fontScale}px 0;
          font-size: ${13 * fontScale}px;
          font-family: 'Fira Code', Consolas, Monaco, monospace;
        }
        code {
          background: ${isDark ? '#404040' : '#e8e8e8'};
          padding: ${2 * fontScale}px ${6 * fontScale}px;
          border-radius: ${4 * fontScale}px;
          font-family: 'Fira Code', Consolas, Monaco, monospace;
          font-size: ${13 * fontScale}px;
        }
        pre code {
          background: none;
          padding: 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        ${header}
        <div class="messages">
          ${messageHTML}
        </div>
        ${footer}
      </div>
    </body>
    </html>
  `;
}

/**
 * Process message content - escape HTML and format code blocks
 */
function processContent(content: string, _colors: Record<string, string>, _fontScale: number): string {
  // Escape HTML first
  let processed = escapeHtml(content);
  
  // Convert code blocks
  processed = processed.replace(
    /```(\w*)\n?([\s\S]*?)```/g,
    (_match, _lang, code) => `<pre><code>${code.trim()}</code></pre>`
  );
  
  // Convert inline code
  processed = processed.replace(
    /`([^`]+)`/g,
    (_match, code) => `<code>${code}</code>`
  );
  
  // Convert bold
  processed = processed.replace(
    /\*\*([^*]+)\*\*/g,
    (_match, text) => `<strong>${text}</strong>`
  );
  
  // Convert newlines to <br>
  processed = processed.replace(/\n/g, '<br>');
  
  return processed;
}

/**
 * Export chat to image using html2canvas
 */
export async function exportToImage(
  session: Session,
  messages: UIMessage[],
  options: Partial<ImageExportOptions> = {}
): Promise<ImageExportResult> {
  const opts: Required<ImageExportOptions> = { ...DEFAULT_OPTIONS, ...options };
  
  // Filter messages if needed
  let filteredMessages = messages;
  
  if (opts.selectedMessageIds.length > 0) {
    filteredMessages = messages.filter(m => opts.selectedMessageIds.includes(m.id));
  } else if (opts.maxMessages && messages.length > opts.maxMessages) {
    filteredMessages = messages.slice(0, opts.maxMessages);
  }
  
  // Generate HTML
  const html = generateImageHTML(session, filteredMessages, opts);
  
  // Create a container element
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.innerHTML = html;
  document.body.appendChild(container);
  
  try {
    // Dynamic import of html2canvas
    const html2canvas = (await import('html2canvas')).default;
    
    // Find the actual content container
    const contentElement = container.querySelector('.container') as HTMLElement;
    if (!contentElement) {
      throw new Error('Content container not found');
    }

    const { width: contentWidth, height: contentHeight } = getElementSize(contentElement);
    const { scale: safeScale, constrained } = getSafeCanvasScale(
      contentWidth,
      contentHeight,
      opts.scale
    );

    if (constrained) {
      log.warn(
        `Image export scale adjusted from ${opts.scale} to ${safeScale} to fit canvas limits.`
      );
    }
    
    // Render to canvas
    const canvas = await html2canvas(contentElement, {
      scale: safeScale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      logging: false,
      windowWidth: contentWidth,
      windowHeight: contentHeight,
    });
    
    // Convert to blob
    const mimeType = opts.format === 'jpg' ? 'image/jpeg' : `image/${opts.format}`;
    const quality = opts.format === 'png' ? undefined : opts.quality;
    
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error('Failed to create blob'));
        },
        mimeType,
        quality
      );
    });
    
    const dataUrl = canvas.toDataURL(mimeType, quality);
    
    return {
      blob,
      dataUrl,
      width: canvas.width,
      height: canvas.height,
      format: opts.format,
    };
  } finally {
    // Clean up
    document.body.removeChild(container);
  }
}

/**
 * Download chat as image file
 */
export async function downloadAsImage(
  session: Session,
  messages: UIMessage[],
  options: Partial<ImageExportOptions> = {}
): Promise<void> {
  const result = await exportToImage(session, messages, options);
  
  const link = document.createElement('a');
  link.href = result.dataUrl;
  link.download = generateImageFilename(session.title, options.format || 'png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export single message as image
 */
export async function exportMessageAsImage(
  message: UIMessage,
  options: Partial<ImageExportOptions> = {}
): Promise<ImageExportResult> {
  // Create a minimal session for single message export
  const mockSession = {
    id: 'single-message',
    title: '消息导出',
    provider: 'openai' as const,
    model: 'gpt-4',
    mode: 'chat' as const,
    systemPrompt: undefined,
    contextLength: 0,
    temperature: 0.7,
    topP: 1,
    topK: 40,
    presencePenalty: 0,
    frequencyPenalty: 0,
    projectId: undefined,
    createdAt: message.createdAt,
    updatedAt: message.createdAt,
    lastMessageAt: message.createdAt,
    lastExportAt: undefined,
  } as Session;
  
  return exportToImage(mockSession, [message], {
    ...options,
    includeHeader: false,
    includeFooter: false,
  });
}

/**
 * Generate preview thumbnail
 */
export async function generateThumbnail(
  session: Session,
  messages: UIMessage[],
  options: { width?: number; maxMessages?: number } = {}
): Promise<string> {
  const { width = 400, maxMessages = 3 } = options;
  
  const result = await exportToImage(session, messages.slice(0, maxMessages), {
    width,
    scale: 1,
    includeHeader: true,
    includeFooter: false,
    showTimestamps: false,
    padding: 16,
  });
  
  return result.dataUrl;
}

/**
 * Copy image to clipboard
 */
export async function copyImageToClipboard(
  session: Session,
  messages: UIMessage[],
  options: Partial<ImageExportOptions> = {}
): Promise<boolean> {
  try {
    const result = await exportToImage(session, messages, { ...options, format: 'png' });
    
    if (!navigator.clipboard.write) {
      throw new Error('Clipboard API not supported');
    }
    
    const clipboardItem = new ClipboardItem({ 'image/png': result.blob });
    await navigator.clipboard.write([clipboardItem]);
    return true;
  } catch (error) {
    log.error('Failed to copy image to clipboard', error as Error);
    return false;
  }
}

// Helper functions
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

function generateImageFilename(title: string, format: string): string {
  const safeTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  
  const timestamp = new Date().toISOString().slice(0, 10);
  return `${safeTitle}-${timestamp}.${format}`;
}

function getElementSize(element: HTMLElement): { width: number; height: number } {
  const rect = element.getBoundingClientRect();
  const width = Math.ceil(Math.max(element.scrollWidth, element.offsetWidth, rect.width));
  const height = Math.ceil(Math.max(element.scrollHeight, element.offsetHeight, rect.height));

  return { width, height };
}

/**
 * Get available export formats
 */
export function getImageExportFormats(): Array<{
  value: ImageExportOptions['format'];
  label: string;
  description: string;
}> {
  return [
    {
      value: 'png',
      label: 'PNG',
      description: '无损压缩，支持透明背景',
    },
    {
      value: 'jpg',
      label: 'JPG',
      description: '有损压缩，文件更小',
    },
    {
      value: 'webp',
      label: 'WebP',
      description: '现代格式，压缩效果最佳',
    },
  ];
}

/**
 * Estimate image file size (rough estimate)
 */
export function estimateImageSize(
  messageCount: number,
  options: Partial<ImageExportOptions> = {}
): string {
  const scale = options.scale || 2;
  const width = options.width || 800;
  const format = options.format || 'png';
  
  // Rough estimate: ~500 bytes per message at 1x scale for PNG
  const baseSize = messageCount * 500 * scale * scale;
  
  let multiplier = 1;
  switch (format) {
    case 'jpg':
      multiplier = 0.3;
      break;
    case 'webp':
      multiplier = 0.25;
      break;
    case 'png':
    default:
      multiplier = 1;
  }
  
  const estimatedBytes = baseSize * multiplier * (width / 800);
  
  if (estimatedBytes < 1024) {
    return `${estimatedBytes.toFixed(0)} B`;
  } else if (estimatedBytes < 1024 * 1024) {
    return `${(estimatedBytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(estimatedBytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
