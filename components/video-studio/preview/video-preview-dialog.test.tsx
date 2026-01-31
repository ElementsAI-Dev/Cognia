import React from 'react';
import { render, screen } from '@testing-library/react';
import { VideoPreviewDialog } from './video-preview-dialog';
import type { VideoJob } from '@/types/video-studio/types';

const mockVideoJob: VideoJob = {
  id: 'job-1',
  prompt: 'A beautiful sunset',
  provider: 'google-veo',
  model: 'veo-3',
  status: 'completed',
  progress: 100,
  videoUrl: 'https://example.com/video.mp4',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  createdAt: Date.now(),
  settings: {
    resolution: '1080p',
    aspectRatio: '16:9',
    duration: '10s',
    style: 'cinematic',
  },
};

const mockVideoJobWithBase64: VideoJob = {
  ...mockVideoJob,
  id: 'job-2',
  videoUrl: undefined,
  videoBase64: 'base64encodeddata',
};

describe('VideoPreviewDialog', () => {
  const defaultProps = {
    video: mockVideoJob,
    open: true,
    onOpenChange: jest.fn(),
    title: 'Video Preview',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dialog when open with video URL', () => {
    render(<VideoPreviewDialog {...defaultProps} />);
    
    expect(screen.getByText('Video Preview')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<VideoPreviewDialog {...defaultProps} open={false} />);
    
    expect(screen.queryByText('Video Preview')).not.toBeInTheDocument();
  });

  it('renders video element with correct source URL', () => {
    render(<VideoPreviewDialog {...defaultProps} />);
    
    // Dialog renders in a portal, so we need to query the document body
    const videoElement = document.querySelector('video');
    expect(videoElement).toBeInTheDocument();
    expect(videoElement).toHaveAttribute('src', mockVideoJob.videoUrl);
  });

  it('renders video element with base64 source when no URL', () => {
    render(<VideoPreviewDialog {...defaultProps} video={mockVideoJobWithBase64} />);
    
    const videoElement = document.querySelector('video');
    expect(videoElement).toBeInTheDocument();
    expect(videoElement).toHaveAttribute('src', `data:video/mp4;base64,${mockVideoJobWithBase64.videoBase64}`);
  });

  it('renders video with poster attribute', () => {
    render(<VideoPreviewDialog {...defaultProps} />);
    
    const videoElement = document.querySelector('video');
    expect(videoElement).toHaveAttribute('poster', mockVideoJob.thumbnailUrl);
  });

  it('renders video with controls', () => {
    render(<VideoPreviewDialog {...defaultProps} />);
    
    const videoElement = document.querySelector('video');
    expect(videoElement).toHaveAttribute('controls');
  });

  it('renders video with autoPlay', () => {
    render(<VideoPreviewDialog {...defaultProps} />);
    
    const videoElement = document.querySelector('video');
    expect(videoElement).toHaveAttribute('autoplay');
  });

  it('does not render video when video prop is null', () => {
    const { container } = render(
      <VideoPreviewDialog {...defaultProps} video={null} />
    );
    
    const videoElement = container.querySelector('video');
    expect(videoElement).not.toBeInTheDocument();
  });

  it('uses custom title', () => {
    render(<VideoPreviewDialog {...defaultProps} title="Custom Title" />);
    
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
  });
});
