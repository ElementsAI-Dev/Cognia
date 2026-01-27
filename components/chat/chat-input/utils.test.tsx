import React from 'react';
import { render } from '@testing-library/react';
import { formatFileSize, getFileType, getFileIcon } from './utils';

describe('formatFileSize', () => {
  it('returns "0 Bytes" for 0', () => {
    expect(formatFileSize(0)).toBe('0 Bytes');
  });

  it('formats bytes correctly', () => {
    expect(formatFileSize(500)).toBe('500 Bytes');
  });

  it('formats KB correctly', () => {
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });

  it('formats MB correctly', () => {
    expect(formatFileSize(1048576)).toBe('1 MB');
    expect(formatFileSize(5242880)).toBe('5 MB');
  });

  it('formats GB correctly', () => {
    expect(formatFileSize(1073741824)).toBe('1 GB');
  });
});

describe('getFileType', () => {
  it('returns "image" for image mime types', () => {
    expect(getFileType('image/png')).toBe('image');
    expect(getFileType('image/jpeg')).toBe('image');
    expect(getFileType('image/gif')).toBe('image');
  });

  it('returns "audio" for audio mime types', () => {
    expect(getFileType('audio/mp3')).toBe('audio');
    expect(getFileType('audio/wav')).toBe('audio');
  });

  it('returns "video" for video mime types', () => {
    expect(getFileType('video/mp4')).toBe('video');
    expect(getFileType('video/webm')).toBe('video');
  });

  it('returns "archive" for archive mime types', () => {
    expect(getFileType('application/zip')).toBe('archive');
    expect(getFileType('application/x-tar')).toBe('archive');
    expect(getFileType('application/x-rar')).toBe('archive');
    expect(getFileType('application/x-7z-compressed')).toBe('archive');
    expect(getFileType('application/gzip')).toBe('archive');
  });

  it('returns "file" for other mime types', () => {
    expect(getFileType('application/pdf')).toBe('file');
    expect(getFileType('text/plain')).toBe('file');
  });
});

describe('getFileIcon', () => {
  it('returns ImageIcon for image type', () => {
    const { container } = render(<>{getFileIcon('image')}</>);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('returns Music icon for audio type', () => {
    const { container } = render(<>{getFileIcon('audio')}</>);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('returns Video icon for video type', () => {
    const { container } = render(<>{getFileIcon('video')}</>);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('returns Archive icon for archive type', () => {
    const { container } = render(<>{getFileIcon('archive')}</>);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('returns FileIcon for file type', () => {
    const { container } = render(<>{getFileIcon('file')}</>);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
