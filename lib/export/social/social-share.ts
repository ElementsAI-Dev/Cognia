/**
 * Social Share - Share chat conversations to social media platforms
 * 
 * Supports: Twitter/X, LinkedIn, Reddit, WeChat, Weibo, Telegram, Facebook
 */

import type { UIMessage, Session } from '@/types';
import { loggers } from '@/lib/logger';

const log = loggers.app;

export type SocialPlatform = 
  | 'twitter' 
  | 'linkedin' 
  | 'reddit' 
  | 'wechat' 
  | 'weibo' 
  | 'telegram' 
  | 'facebook'
  | 'email';

export interface SocialShareOptions {
  title: string;
  description?: string;
  url?: string;
  imageUrl?: string;
  hashtags?: string[];
}

export interface ShareContent {
  text: string;
  html?: string;
  summary: string;
  title: string;
  messageCount: number;
  model?: string;
  provider?: string;
}

export interface PlatformConfig {
  name: string;
  icon: string;
  maxLength: number;
  supportsImage: boolean;
  supportsUrl: boolean;
  color: string;
  bgColor: string;
}

export const PLATFORM_CONFIGS: Record<SocialPlatform, PlatformConfig> = {
  twitter: {
    name: 'Twitter / X',
    icon: '𝕏',
    maxLength: 280,
    supportsImage: true,
    supportsUrl: true,
    color: '#000000',
    bgColor: '#e7e9ea',
  },
  linkedin: {
    name: 'LinkedIn',
    icon: 'in',
    maxLength: 3000,
    supportsImage: true,
    supportsUrl: true,
    color: '#0a66c2',
    bgColor: '#e8f4fc',
  },
  reddit: {
    name: 'Reddit',
    icon: '🔴',
    maxLength: 40000,
    supportsImage: true,
    supportsUrl: true,
    color: '#ff4500',
    bgColor: '#ffe8e0',
  },
  wechat: {
    name: '微信',
    icon: '💬',
    maxLength: 10000,
    supportsImage: true,
    supportsUrl: false,
    color: '#07c160',
    bgColor: '#e6f9ed',
  },
  weibo: {
    name: '微博',
    icon: '🔴',
    maxLength: 2000,
    supportsImage: true,
    supportsUrl: true,
    color: '#e6162d',
    bgColor: '#fde8eb',
  },
  telegram: {
    name: 'Telegram',
    icon: '✈️',
    maxLength: 4096,
    supportsImage: true,
    supportsUrl: true,
    color: '#0088cc',
    bgColor: '#e5f4fb',
  },
  facebook: {
    name: 'Facebook',
    icon: 'f',
    maxLength: 63206,
    supportsImage: true,
    supportsUrl: true,
    color: '#1877f2',
    bgColor: '#e7f3ff',
  },
  email: {
    name: '邮件',
    icon: '✉️',
    maxLength: 100000,
    supportsImage: false,
    supportsUrl: true,
    color: '#6b7280',
    bgColor: '#f3f4f6',
  },
};

/**
 * Generate share link for a specific platform
 */
export function generateShareLink(
  platform: SocialPlatform,
  options: SocialShareOptions
): string {
  const { title, description = '', url = '', hashtags = [] } = options;
  const encodedTitle = encodeURIComponent(title);
  const encodedDesc = encodeURIComponent(description);
  const encodedUrl = encodeURIComponent(url);
  const hashtagsStr = hashtags.map(h => h.replace(/^#/, '')).join(',');

  switch (platform) {
    case 'twitter':
      const twitterText = truncateText(`${title}\n\n${description}`, 250);
      return `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}${url ? `&url=${encodedUrl}` : ''}${hashtagsStr ? `&hashtags=${hashtagsStr}` : ''}`;

    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}&title=${encodedTitle}&summary=${encodedDesc}`;

    case 'reddit':
      return `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`;

    case 'weibo':
      const weiboText = truncateText(`${title} ${description}`, 140);
      return `https://service.weibo.com/share/share.php?title=${encodeURIComponent(weiboText)}${url ? `&url=${encodedUrl}` : ''}`;

    case 'telegram':
      const telegramText = `${title}\n\n${description}`;
      return `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(telegramText)}`;

    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedTitle}`;

    case 'email':
      const subject = encodeURIComponent(title);
      const body = encodeURIComponent(`${description}\n\n${url}`);
      return `mailto:?subject=${subject}&body=${body}`;

    case 'wechat':
      // WeChat requires QR code generation, return empty
      return '';

    default:
      return '';
  }
}

/**
 * Generate all share links for a given content
 */
export function generateAllShareLinks(
  options: SocialShareOptions
): Record<SocialPlatform, string> {
  const platforms: SocialPlatform[] = [
    'twitter', 'linkedin', 'reddit', 'weibo', 'telegram', 'facebook', 'email', 'wechat'
  ];
  
  return platforms.reduce((acc, platform) => {
    acc[platform] = generateShareLink(platform, options);
    return acc;
  }, {} as Record<SocialPlatform, string>);
}

/**
 * Generate shareable content from chat session
 */
export function generateShareContent(
  session: Session,
  messages: UIMessage[],
  options: {
    maxMessages?: number;
    includeTimestamps?: boolean;
    includeModel?: boolean;
  } = {}
): ShareContent {
  const { maxMessages = 10, includeTimestamps = false, includeModel = true } = options;
  
  const limitedMessages = messages.slice(0, maxMessages);
  
  // Generate text content
  const textLines: string[] = [];
  textLines.push(`📝 ${session.title}`);
  textLines.push('');
  
  if (includeModel) {
    textLines.push(`🤖 ${session.provider} / ${session.model}`);
    textLines.push('');
  }
  
  for (const msg of limitedMessages) {
    const role = msg.role === 'user' ? '👤 用户' : '🤖 助手';
    const timestamp = includeTimestamps ? ` (${msg.createdAt.toLocaleTimeString()})` : '';
    textLines.push(`${role}${timestamp}:`);
    textLines.push(truncateText(msg.content, 500));
    textLines.push('');
  }
  
  if (messages.length > maxMessages) {
    textLines.push(`... 还有 ${messages.length - maxMessages} 条消息`);
  }
  
  // Generate HTML content
  const htmlLines: string[] = [];
  htmlLines.push(`<h2>${escapeHtml(session.title)}</h2>`);
  
  for (const msg of limitedMessages) {
    const role = msg.role === 'user' ? '用户' : '助手';
    htmlLines.push(`<p><strong>${role}:</strong></p>`);
    htmlLines.push(`<p>${escapeHtml(msg.content).replace(/\n/g, '<br>')}</p>`);
  }
  
  // Generate summary
  const firstUserMessage = messages.find(m => m.role === 'user');
  const summary = firstUserMessage 
    ? truncateText(firstUserMessage.content, 200)
    : session.title;
  
  return {
    text: textLines.join('\n'),
    html: htmlLines.join('\n'),
    summary,
    title: session.title,
    messageCount: messages.length,
    model: session.model,
    provider: session.provider,
  };
}

/**
 * Copy content to clipboard
 */
export async function copyToClipboard(
  content: string,
  format: 'text' | 'html' = 'text'
): Promise<boolean> {
  try {
    if (format === 'html' && navigator.clipboard.write) {
      const blob = new Blob([content], { type: 'text/html' });
      const clipboardItem = new ClipboardItem({ 'text/html': blob });
      await navigator.clipboard.write([clipboardItem]);
    } else {
      await navigator.clipboard.writeText(content);
    }
    return true;
  } catch (error) {
    log.error('Failed to copy to clipboard', error as Error);
    
    // Fallback for older browsers
    try {
      const textarea = document.createElement('textarea');
      textarea.value = content;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Copy image blob to clipboard
 */
export async function copyImageToClipboard(blob: Blob): Promise<boolean> {
  try {
    if (!navigator.clipboard.write) {
      throw new Error('Clipboard API not supported');
    }
    
    const clipboardItem = new ClipboardItem({ [blob.type]: blob });
    await navigator.clipboard.write([clipboardItem]);
    return true;
  } catch (error) {
    log.error('Failed to copy image to clipboard', error as Error);
    return false;
  }
}

/**
 * Generate QR code for WeChat sharing
 */
export async function generateWeChatQRCode(
  content: string,
  options: { width?: number; margin?: number; preset?: string; logo?: string } = {}
): Promise<string> {
  const { width = 256, margin = 10, preset = 'wechat', logo } = options;

  try {
    const { generateStyledQR } = await import('@/lib/export/qr');
    return generateStyledQR({
      data: content,
      width,
      height: width,
      margin,
      preset,
      logo,
    });
  } catch (error) {
    log.error('Failed to generate QR code', error as Error);
    throw error;
  }
}

/**
 * Generate Open Graph meta tags for sharing
 */
export function generateOpenGraphMeta(options: {
  title: string;
  description: string;
  url?: string;
  imageUrl?: string;
  type?: 'website' | 'article';
}): string {
  const { title, description, url, imageUrl, type = 'article' } = options;
  
  const metaTags: string[] = [];
  
  metaTags.push(`<meta property="og:title" content="${escapeHtml(title)}" />`);
  metaTags.push(`<meta property="og:description" content="${escapeHtml(description)}" />`);
  metaTags.push(`<meta property="og:type" content="${type}" />`);
  
  if (url) {
    metaTags.push(`<meta property="og:url" content="${escapeHtml(url)}" />`);
  }
  
  if (imageUrl) {
    metaTags.push(`<meta property="og:image" content="${escapeHtml(imageUrl)}" />`);
  }
  
  // Twitter Card
  metaTags.push(`<meta name="twitter:card" content="${imageUrl ? 'summary_large_image' : 'summary'}" />`);
  metaTags.push(`<meta name="twitter:title" content="${escapeHtml(title)}" />`);
  metaTags.push(`<meta name="twitter:description" content="${escapeHtml(description)}" />`);
  
  if (imageUrl) {
    metaTags.push(`<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />`);
  }
  
  return metaTags.join('\n');
}

/**
 * Open share dialog in a popup window
 */
export function openSharePopup(
  platform: SocialPlatform,
  options: SocialShareOptions
): Window | null {
  const url = generateShareLink(platform, options);
  
  if (!url) {
    return null;
  }
  
  const width = 600;
  const height = 500;
  const left = (window.innerWidth - width) / 2 + window.screenX;
  const top = (window.innerHeight - height) / 2 + window.screenY;
  
  return window.open(
    url,
    `share_${platform}`,
    `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
  );
}

/**
 * Use Web Share API if available
 */
export async function nativeShare(options: {
  title: string;
  text: string;
  url?: string;
  files?: File[];
}): Promise<boolean> {
  if (!navigator.share) {
    return false;
  }
  
  try {
    const shareData: ShareData = {
      title: options.title,
      text: options.text,
    };
    
    if (options.url) {
      shareData.url = options.url;
    }
    
    if (options.files && navigator.canShare?.({ files: options.files })) {
      shareData.files = options.files;
    }
    
    await navigator.share(shareData);
    return true;
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      log.error('Share failed', error as Error);
    }
    return false;
  }
}

/**
 * Check if Web Share API is available
 */
export function isNativeShareAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'share' in navigator;
}

/**
 * Generate markdown export for sharing
 */
export function generateShareableMarkdown(
  session: Session,
  messages: UIMessage[],
  options: {
    includeMetadata?: boolean;
    maxMessages?: number;
  } = {}
): string {
  const { includeMetadata = true, maxMessages } = options;
  const limitedMessages = maxMessages ? messages.slice(0, maxMessages) : messages;
  
  const lines: string[] = [];
  
  lines.push(`# ${session.title}`);
  lines.push('');
  
  if (includeMetadata) {
    lines.push(`> **模型**: ${session.provider} / ${session.model}`);
    lines.push(`> **模式**: ${session.mode}`);
    lines.push(`> **创建于**: ${session.createdAt.toLocaleString()}`);
    lines.push('');
  }
  
  lines.push('---');
  lines.push('');
  
  for (const msg of limitedMessages) {
    const role = msg.role === 'user' ? '**用户**' : '**助手**';
    lines.push(`### ${role}`);
    lines.push('');
    lines.push(msg.content);
    lines.push('');
  }
  
  if (maxMessages && messages.length > maxMessages) {
    lines.push(`*... 还有 ${messages.length - maxMessages} 条消息 ...*`);
    lines.push('');
  }
  
  lines.push('---');
  lines.push(`*导出自 Cognia*`);
  
  return lines.join('\n');
}

// Helper functions
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

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
