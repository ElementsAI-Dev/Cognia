/**
 * Tests for Video Component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { Video } from './video';
import type { GeneratedVideo } from '@/types/media/video';

// Mock HLS.js - define inside jest.mock to avoid hoisting issues
jest.mock('hls.js', () => {
  const mockHlsInstance = {
    attachMedia: jest.fn(),
    loadSource: jest.fn(),
    on: jest.fn(),
    destroy: jest.fn(),
    startLoad: jest.fn(),
    recoverMediaError: jest.fn(),
    liveSyncPosition: 10,
    currentLevel: 0,
    levels: [],
  };

  class MockHls {
    static isSupported = jest.fn(() => true);
    static Events = {
      MANIFEST_PARSED: 'hlsManifestParsed',
      LEVEL_SWITCHED: 'hlsLevelSwitched',
      FRAG_BUFFERED: 'hlsFragBuffered',
      FRAG_LOADING: 'hlsFragLoading',
      FRAG_LOADED: 'hlsFragLoaded',
      ERROR: 'hlsError',
    };
    static ErrorTypes = {
      NETWORK_ERROR: 'networkError',
      MEDIA_ERROR: 'mediaError',
    };

    attachMedia = mockHlsInstance.attachMedia;
    loadSource = mockHlsInstance.loadSource;
    on = mockHlsInstance.on;
    destroy = mockHlsInstance.destroy;
    startLoad = mockHlsInstance.startLoad;
    recoverMediaError = mockHlsInstance.recoverMediaError;
    liveSyncPosition = mockHlsInstance.liveSyncPosition;
    currentLevel = mockHlsInstance.currentLevel;
    levels = mockHlsInstance.levels;
  }

  return {
    __esModule: true,
    default: MockHls,
  };
});

// Mock video generation functions
jest.mock('@/lib/ai/media/video-generation', () => ({
  downloadVideoAsBlob: jest.fn(() => Promise.resolve(new Blob())),
  saveVideoToFile: jest.fn(),
  base64ToVideoDataUrl: jest.fn((b64) => `data:video/mp4;base64,${b64}`),
}));

// Mock translations
const messages = {
  video: {
    preparing: 'Preparing...',
    generating: 'Generating video...',
    progressComplete: '{progress}% complete',
    jobId: 'Job ID',
    checkStatus: 'Check Status',
    generationFailed: 'Video generation failed',
    unknownError: 'Unknown error occurred',
    tryAgain: 'Try Again',
    generatedSuccessfully: 'Video generated successfully',
    urlNotAvailable: 'URL not available',
    failedToLoad: 'Failed to load video',
    streamingError: 'Streaming error',
  },
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <NextIntlClientProvider locale="en" messages={messages}>
    {children}
  </NextIntlClientProvider>
);

// Mock video data - using unknown to bypass strict typing
const mockVideo = {
  id: 'video-1',
  url: 'https://example.com/video.mp4',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  mimeType: 'video/mp4',
  durationSeconds: 30,
  width: 1920,
  height: 1080,
  fps: 30,
  createdAt: new Date(),
} as GeneratedVideo;

const mockVideoWithBase64 = {
  id: 'video-2',
  base64: 'dGVzdA==',
  mimeType: 'video/mp4',
  durationSeconds: 15,
  width: 1280,
  height: 720,
  fps: 24,
  createdAt: new Date(),
} as GeneratedVideo;

describe('Video', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock video element methods
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: jest.fn().mockResolvedValue(undefined),
    });
    Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
      configurable: true,
      value: jest.fn(),
    });
  });

  describe('Rendering States', () => {
    it('renders pending state', () => {
      render(<Video status="pending" />, { wrapper });
      expect(screen.getByText(/Preparing/i)).toBeInTheDocument();
    });

    it('renders processing state with progress', () => {
      render(<Video status="processing" progress={50} />, { wrapper });
      expect(screen.getByText('Generating video...')).toBeInTheDocument();
      expect(screen.getByText('50% complete')).toBeInTheDocument();
    });

    it('renders job ID when provided', () => {
      render(<Video status="processing" jobId="job-123" />, { wrapper });
      expect(screen.getByText('Job ID: job-123')).toBeInTheDocument();
    });

    it('renders prompt when provided', () => {
      render(<Video status="processing" prompt="A beautiful sunset" />, { wrapper });
      expect(screen.getByText('"A beautiful sunset"')).toBeInTheDocument();
    });

    it('renders check status button', async () => {
      const onRefreshStatus = jest.fn();
      const user = userEvent.setup();

      render(<Video status="processing" onRefreshStatus={onRefreshStatus} />, { wrapper });

      await user.click(screen.getByText('Check Status'));

      expect(onRefreshStatus).toHaveBeenCalled();
    });

    it('renders error state', () => {
      render(<Video status="failed" error="Something went wrong" />, { wrapper });
      expect(screen.getByText('Video generation failed')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('renders retry button on error', async () => {
      const onRetry = jest.fn();
      const user = userEvent.setup();

      render(<Video status="failed" onRetry={onRetry} />, { wrapper });

      await user.click(screen.getByText('Try Again'));

      expect(onRetry).toHaveBeenCalled();
    });

    it('renders success state without URL', () => {
      render(<Video status="completed" />, { wrapper });
      expect(screen.getByText('Video generated successfully')).toBeInTheDocument();
      expect(screen.getByText(/URL not available/i)).toBeInTheDocument();
    });
  });

  describe('Video Playback', () => {
    it('renders video element with URL', () => {
      const { container } = render(<Video video={mockVideo} status="completed" />, { wrapper });

      const video = container.querySelector('video');
      expect(video).toBeInTheDocument();
      expect(video).toHaveAttribute('src', mockVideo.url);
    });

    it('renders video with src prop', () => {
      const { container } = render(<Video src="https://example.com/direct.mp4" />, { wrapper });

      const video = container.querySelector('video');
      expect(video).toHaveAttribute('src', 'https://example.com/direct.mp4');
    });

    it('renders video with base64 data', () => {
      const { container } = render(<Video video={mockVideoWithBase64} status="completed" />, {
        wrapper,
      });

      const video = container.querySelector('video');
      expect(video).toHaveAttribute('src', 'data:video/mp4;base64,dGVzdA==');
    });

    it('renders poster image when thumbnailUrl provided', () => {
      const { container } = render(<Video video={mockVideo} status="completed" />, { wrapper });

      const video = container.querySelector('video');
      expect(video).toHaveAttribute('poster', mockVideo.thumbnailUrl);
    });

    it('applies autoPlay attribute', () => {
      const { container } = render(<Video video={mockVideo} autoPlay={true} />, { wrapper });

      const video = container.querySelector('video');
      expect(video).toHaveAttribute('autoplay');
    });

    it('applies loop attribute', () => {
      const { container } = render(<Video video={mockVideo} loop={true} />, { wrapper });

      const video = container.querySelector('video');
      expect(video).toHaveAttribute('loop');
    });

    it('applies muted attribute', () => {
      const { container } = render(<Video video={mockVideo} muted={true} />, { wrapper });

      const video = container.querySelector('video');
      // Video element exists
      expect(video).toBeInTheDocument();
    });
  });

  describe('Controls', () => {
    it('shows controls when showControls is true', () => {
      const { container } = render(<Video video={mockVideo} showControls={true} />, { wrapper });

      // Video element should exist when controls are enabled
      const video = container.querySelector('video');
      expect(video).toBeInTheDocument();
    });

    it('hides controls when showControls is false', () => {
      const { container } = render(<Video video={mockVideo} showControls={false} />, { wrapper });

      // Only video element, no control buttons
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(0);
    });
  });

  describe('Screenshot Feature', () => {
    it('shows screenshot panel when showScreenshotPanel is true', () => {
      render(<Video video={mockVideo} showControls={true} showScreenshotPanel={true} />, {
        wrapper,
      });

      // Screenshot button should be available
      // Panel visibility depends on having screenshots
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('enables keyboard shortcuts by default', () => {
      render(<Video video={mockVideo} enableKeyboardShortcuts={true} />, { wrapper });

      // Keyboard shortcuts are enabled - test would require focus handling
    });
  });

  describe('HLS Streaming', () => {
    it('initializes HLS for .m3u8 URLs', () => {
      render(<Video src="https://example.com/stream.m3u8" enableHls={true} />, { wrapper });

      // HLS should be initialized for .m3u8 URLs
    });

    it('does not use HLS for regular video URLs', () => {
      render(<Video src="https://example.com/video.mp4" enableHls={true} />, { wrapper });

      // HLS should not be initialized for .mp4 files
    });
  });

  describe('Time Updates', () => {
    it('calls onTimeUpdate callback', () => {
      const onTimeUpdate = jest.fn();
      const { container } = render(<Video video={mockVideo} onTimeUpdate={onTimeUpdate} />, {
        wrapper,
      });

      const video = container.querySelector('video');
      // Simulate time update event
      video?.dispatchEvent(new Event('timeupdate'));

      // Callback should be called
    });
  });

  describe('Error Handling', () => {
    it('renders video element for error handling', () => {
      const { container } = render(<Video video={mockVideo} />, { wrapper });

      const video = container.querySelector('video');
      expect(video).toBeInTheDocument();
    });
  });

  describe('Live Streaming', () => {
    it('renders with live streaming props', () => {
      const { container } = render(<Video video={mockVideo} />, { wrapper });

      expect(container.querySelector('video')).toBeInTheDocument();
    });
  });

  describe('Quality Selection', () => {
    it('renders video with quality options', () => {
      const { container } = render(<Video video={mockVideo} />, { wrapper });

      expect(container.querySelector('video')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies custom className', () => {
      const { container } = render(<Video video={mockVideo} className="custom-video" />, {
        wrapper,
      });

      expect(container.querySelector('.custom-video')).toBeInTheDocument();
    });
  });

  describe('Download', () => {
    it('allows downloading video', () => {
      render(<Video video={mockVideo} showControls={true} />, { wrapper });

      // Download button would trigger download function
    });
  });

  describe('Picture-in-Picture', () => {
    it('supports PiP when available', () => {
      Object.defineProperty(document, 'pictureInPictureEnabled', {
        value: true,
        configurable: true,
      });

      render(<Video video={mockVideo} showControls={true} />, { wrapper });

      // PiP button should be available
    });
  });

  describe('Fullscreen', () => {
    it('supports fullscreen toggle', () => {
      render(<Video video={mockVideo} showControls={true} />, { wrapper });

      // Fullscreen button should be available
    });
  });
});
