import React from 'react';
import { Archive, FileIcon, ImageIcon, Music, Video } from 'lucide-react';

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getFileType(mimeType: string): 'image' | 'audio' | 'video' | 'archive' | 'file' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  if (
    mimeType.includes('zip') ||
    mimeType.includes('tar') ||
    mimeType.includes('rar') ||
    mimeType.includes('7z') ||
    mimeType.includes('gzip')
  ) {
    return 'archive';
  }
  return 'file';
}

export function getFileIcon(type: 'image' | 'audio' | 'video' | 'archive' | 'file') {
  switch (type) {
    case 'image':
      return <ImageIcon className="h-4 w-4" />;
    case 'audio':
      return <Music className="h-4 w-4" />;
    case 'video':
      return <Video className="h-4 w-4" />;
    case 'archive':
      return <Archive className="h-4 w-4" />;
    default:
      return <FileIcon className="h-4 w-4" />;
  }
}
