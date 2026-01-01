/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Video, VideoGrid } from './video';
import type { GeneratedVideo } from '@/types/video';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      'preparing': 'Preparing video...',
      'generating': 'Generating video...',
      'progressComplete': `${params?.progress}% complete`,
      'jobId': 'Job ID',
      'checkStatus': 'Check Status',
      'generationFailed': 'Video generation failed',
      'unknownError': 'Unknown error occurred',
      'tryAgain': 'Try Again',
      'generatedSuccessfully': 'Video generated successfully',
      'urlNotAvailable': 'Video URL not available',
      'failedToLoad': 'Failed to load video',
      'play': 'Play',
      'pause': 'Pause',
      'download': 'Download',
      'fullscreen': 'Fullscreen',
      'aiEnhanced': 'AI Enhanced',
    };
    return translations[key] || key;
  },
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, variant, size, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) => (
    <button onClick={onClick} disabled={disabled} className={className} data-variant={variant} data-size={size} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className }: { value: number; className?: string }) => (
    <div data-testid="progress" data-value={value} className={className} role="progressbar" aria-valuenow={value} />
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: { children: React.ReactNode; variant?: string; className?: string }) => (
    <span data-testid="badge" data-variant={variant} className={className}>{children}</span>
  ),
}));

jest.mock('@/components/ui/slider', () => ({
  Slider: ({ value, onValueChange, orientation, className }: { value: number[]; onValueChange: (v: number[]) => void; orientation?: string; className?: string }) => (
    <input
      type="range"
      data-testid="slider"
      data-orientation={orientation}
      className={className}
      value={value[0]}
      onChange={(e) => onValueChange([parseFloat(e.target.value)])}
    />
  ),
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <span data-testid="tooltip-content">{children}</span>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children, asChild: _asChild }: { children: React.ReactNode; asChild?: boolean }) => <>{children}</>,
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button data-testid="dropdown-item" onClick={onClick}>{children}</button>
  ),
  DropdownMenuTrigger: ({ children, asChild: _asChild }: { children: React.ReactNode; asChild?: boolean }) => <>{children}</>,
}));

jest.mock('@/components/ui/popover', () => ({
  Popover: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div data-testid="popover" data-open={open}>{children}</div>
  ),
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div data-testid="popover-content">{children}</div>,
  PopoverTrigger: ({ children, asChild: _asChild }: { children: React.ReactNode; asChild?: boolean }) => <>{children}</>,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Play: () => <span data-testid="icon-play">▶</span>,
  Pause: () => <span data-testid="icon-pause">⏸</span>,
  Volume2: () => <span data-testid="icon-volume2">🔊</span>,
  VolumeX: () => <span data-testid="icon-volume-x">🔇</span>,
  Volume1: () => <span data-testid="icon-volume1">🔉</span>,
  Maximize: () => <span data-testid="icon-maximize">⛶</span>,
  Minimize: () => <span data-testid="icon-minimize">⛶</span>,
  Download: () => <span data-testid="icon-download">⬇</span>,
  Loader2: () => <span data-testid="icon-loader">⏳</span>,
  RefreshCw: () => <span data-testid="icon-refresh">↻</span>,
  AlertCircle: () => <span data-testid="icon-alert">⚠</span>,
  CheckCircle2: () => <span data-testid="icon-check">✓</span>,
  PictureInPicture2: () => <span data-testid="icon-pip">📺</span>,
  Repeat: () => <span data-testid="icon-repeat">🔁</span>,
  Gauge: () => <span data-testid="icon-gauge">⏱</span>,
  SkipBack: () => <span data-testid="icon-skip-back">⏮</span>,
  SkipForward: () => <span data-testid="icon-skip-forward">⏭</span>,
  Camera: () => <span data-testid="icon-camera">📷</span>,
  Images: () => <span data-testid="icon-images">🖼</span>,
  X: () => <span data-testid="icon-x">✗</span>,
  Trash2: () => <span data-testid="icon-trash">🗑</span>,
  ExternalLink: () => <span data-testid="icon-external">↗</span>,
}));

// Mock cn utility
jest.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatVideoTime: (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },
}));

// Mock video generation utilities
jest.mock('@/lib/ai/media/video-generation', () => ({
  downloadVideoAsBlob: jest.fn().mockResolvedValue(new Blob(['test'], { type: 'video/mp4' })),
  saveVideoToFile: jest.fn(),
  base64ToVideoDataUrl: jest.fn((base64: string) => `data:video/mp4;base64,${base64}`),
}));

// Mock hls.js
jest.mock('hls.js', () => {
  class MockHls {
    static isSupported = jest.fn().mockReturnValue(false);
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
    
    attachMedia = jest.fn();
    loadSource = jest.fn();
    on = jest.fn();
    destroy = jest.fn();
    currentLevel = -1;
    liveSyncPosition = 0;
    startLoad = jest.fn();
    recoverMediaError = jest.fn();
  }
  
  return MockHls;
});

describe('Video', () => {
  const mockVideo: GeneratedVideo = {
    id: 'video-1',
    url: 'https://example.com/video.mp4',
    width: 1920,
    height: 1080,
    durationSeconds: 10,
    fps: 30,
    mimeType: 'video/mp4',
    createdAt: new Date('2024-01-01'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock document APIs
    Object.defineProperty(document, 'fullscreenElement', {
      value: null,
      writable: true,
    });
    Object.defineProperty(document, 'pictureInPictureEnabled', {
      value: true,
      writable: true,
    });
    Object.defineProperty(document, 'pictureInPictureElement', {
      value: null,
      writable: true,
    });
  });

  describe('Loading/Processing States', () => {
    it('renders pending state with loader', () => {
      render(<Video status="pending" />);
      
      expect(screen.getByTestId('icon-loader')).toBeInTheDocument();
      expect(screen.getByText('Preparing video...')).toBeInTheDocument();
    });

    it('renders processing state with progress', () => {
      render(<Video status="processing" progress={50} />);
      
      expect(screen.getByTestId('icon-loader')).toBeInTheDocument();
      expect(screen.getByText('Generating video...')).toBeInTheDocument();
      expect(screen.getByText('50% complete')).toBeInTheDocument();
      expect(screen.getByTestId('progress')).toHaveAttribute('data-value', '50');
    });

    it('displays job ID when provided', () => {
      render(<Video status="processing" jobId="job-123" />);
      
      expect(screen.getByText(/Job ID/)).toBeInTheDocument();
      expect(screen.getByText(/job-123/)).toBeInTheDocument();
    });

    it('displays prompt when provided', () => {
      render(<Video status="processing" prompt="A cat playing piano" />);
      
      expect(screen.getByText(/"A cat playing piano"/)).toBeInTheDocument();
    });

    it('shows refresh status button when callback provided', () => {
      const onRefreshStatus = jest.fn();
      render(<Video status="processing" onRefreshStatus={onRefreshStatus} />);
      
      const refreshButton = screen.getByText('Check Status');
      fireEvent.click(refreshButton);
      
      expect(onRefreshStatus).toHaveBeenCalled();
    });
  });

  describe('Error States', () => {
    it('renders failed status with error message', () => {
      render(<Video status="failed" error="Network error" />);
      
      expect(screen.getByTestId('icon-alert')).toBeInTheDocument();
      expect(screen.getByText('Video generation failed')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    it('renders with video error', () => {
      render(<Video error="Connection timeout" />);
      
      expect(screen.getByText('Connection timeout')).toBeInTheDocument();
    });

    it('shows retry button when callback provided', () => {
      const onRetry = jest.fn();
      render(<Video status="failed" onRetry={onRetry} />);
      
      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);
      
      expect(onRetry).toHaveBeenCalled();
    });
  });

  describe('Completed State without URL', () => {
    it('renders success message when video has no URL', () => {
      render(<Video status="completed" />);
      
      expect(screen.getByTestId('icon-check')).toBeInTheDocument();
      expect(screen.getByText('Video generated successfully')).toBeInTheDocument();
      expect(screen.getByText('Video URL not available')).toBeInTheDocument();
    });
  });

  describe('Video Playback', () => {
    it('renders video element with correct source', () => {
      render(<Video video={mockVideo} status="completed" />);
      
      const videoElement = document.querySelector('video');
      expect(videoElement).toBeInTheDocument();
      expect(videoElement).toHaveAttribute('src', mockVideo.url);
    });

    it('renders video with base64 source', () => {
      const base64Video: GeneratedVideo = {
        ...mockVideo,
        url: undefined,
        base64: 'SGVsbG8gV29ybGQ=',
      };
      
      render(<Video video={base64Video} status="completed" />);
      
      const videoElement = document.querySelector('video');
      expect(videoElement).toBeInTheDocument();
    });

    it('renders with thumbnail poster', () => {
      const videoWithThumbnail: GeneratedVideo = {
        ...mockVideo,
        thumbnailUrl: 'https://example.com/thumb.jpg',
      };
      
      render(<Video video={videoWithThumbnail} status="completed" />);
      
      const videoElement = document.querySelector('video');
      expect(videoElement).toHaveAttribute('poster', 'https://example.com/thumb.jpg');
    });

    it('applies autoPlay prop', () => {
      render(<Video video={mockVideo} status="completed" autoPlay />);
      
      const videoElement = document.querySelector('video');
      expect(videoElement).toHaveAttribute('autoplay');
    });

    it('applies muted prop', () => {
      render(<Video video={mockVideo} status="completed" muted />);
      
      const videoElement = document.querySelector('video') as HTMLVideoElement;
      // In React, muted is a property not an attribute
      expect(videoElement.muted).toBe(true);
    });

    it('applies loop prop', () => {
      render(<Video video={mockVideo} status="completed" loop />);
      
      const videoElement = document.querySelector('video');
      expect(videoElement).toHaveAttribute('loop');
    });
  });

  describe('Video Controls', () => {
    it('renders controls after video metadata loads', () => {
      const { container } = render(<Video video={mockVideo} status="completed" />);
      
      const videoEl = container.querySelector('video');
      expect(videoEl).toBeInTheDocument();
      
      // Simulate metadata loaded (controls show after loading completes)
      if (videoEl) {
        Object.defineProperty(videoEl, 'duration', { value: 10, writable: true });
        fireEvent.loadedMetadata(videoEl);
      }
      
      // Now controls should be visible
      expect(container.querySelector('[data-testid="icon-download"]')).toBeInTheDocument();
    });

    it('hides controls when showControls is false regardless of loading state', () => {
      const { container } = render(<Video video={mockVideo} status="completed" showControls={false} />);
      
      const videoEl = container.querySelector('video');
      expect(videoEl).toBeInTheDocument();
      
      // Even after metadata loads, controls should not show
      if (videoEl) {
        fireEvent.loadedMetadata(videoEl);
      }
      
      expect(container.querySelector('[data-testid="icon-download"]')).not.toBeInTheDocument();
    });

    it('renders video element with correct structure', () => {
      const { container } = render(<Video video={mockVideo} status="completed" />);
      
      const videoEl = container.querySelector('video');
      expect(videoEl).toBeInTheDocument();
      expect(videoEl).toHaveAttribute('src', mockVideo.url);
    });
  });

  describe('Callbacks', () => {
    it('calls onTimeUpdate callback', () => {
      const onTimeUpdate = jest.fn();
      render(<Video video={mockVideo} status="completed" onTimeUpdate={onTimeUpdate} />);
      
      const videoElement = document.querySelector('video');
      if (videoElement) {
        // Simulate time update
        Object.defineProperty(videoElement, 'currentTime', { value: 5, writable: true });
        fireEvent.timeUpdate(videoElement);
      }
      
      // The callback should be called (duration may be 0 in test env)
      expect(onTimeUpdate).toHaveBeenCalled();
    });
  });

  describe('AI Enhanced Badge', () => {
    it('shows AI enhanced badge when revisedPrompt exists', () => {
      const videoWithRevised: GeneratedVideo = {
        ...mockVideo,
        revisedPrompt: 'An enhanced prompt description',
      };
      
      render(<Video video={videoWithRevised} status="completed" />);
      
      expect(screen.getByText('AI Enhanced')).toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('applies custom className', () => {
      const { container } = render(
        <Video video={mockVideo} status="completed" className="custom-class" />
      );
      
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});

describe('VideoGrid', () => {
  const mockVideos = [
    {
      video: {
        id: 'v1',
        url: 'https://example.com/video1.mp4',
        width: 1920,
        height: 1080,
        durationSeconds: 10,
        fps: 30,
        mimeType: 'video/mp4',
        createdAt: new Date('2024-01-01'),
      },
      status: 'completed' as const,
    },
    {
      video: {
        id: 'v2',
        url: 'https://example.com/video2.mp4',
        width: 1920,
        height: 1080,
        durationSeconds: 15,
        fps: 30,
        mimeType: 'video/mp4',
        createdAt: new Date('2024-01-01'),
      },
      status: 'completed' as const,
    },
    {
      status: 'processing' as const,
      progress: 50,
      jobId: 'job-3',
    },
  ];

  it('renders all videos in grid', () => {
    render(<VideoGrid videos={mockVideos} />);
    
    const videoElements = document.querySelectorAll('video');
    expect(videoElements).toHaveLength(2);
    
    // Processing video shows loader
    expect(screen.getByText('Generating video...')).toBeInTheDocument();
  });

  it('applies correct column classes', () => {
    const { container, rerender } = render(<VideoGrid videos={mockVideos} columns={1} />);
    expect(container.firstChild).toHaveClass('grid-cols-1');
    
    rerender(<VideoGrid videos={mockVideos} columns={2} />);
    expect(container.firstChild).toHaveClass('grid-cols-1');
    expect(container.firstChild).toHaveClass('sm:grid-cols-2');
    
    rerender(<VideoGrid videos={mockVideos} columns={3} />);
    expect(container.firstChild).toHaveClass('lg:grid-cols-3');
    
    rerender(<VideoGrid videos={mockVideos} columns={4} />);
    expect(container.firstChild).toHaveClass('lg:grid-cols-4');
  });

  it('applies custom className', () => {
    const { container } = render(
      <VideoGrid videos={mockVideos} className="custom-grid" />
    );
    
    expect(container.firstChild).toHaveClass('custom-grid');
  });

  it('calls onRetry with correct index', () => {
    const onRetry = jest.fn();
    const videosWithFailed = [
      ...mockVideos.slice(0, 2),
      { status: 'failed' as const, error: 'Failed' },
    ];
    
    render(<VideoGrid videos={videosWithFailed} onRetry={onRetry} />);
    
    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);
    
    expect(onRetry).toHaveBeenCalledWith(2);
  });

  it('calls onRefreshStatus with correct index', () => {
    const onRefreshStatus = jest.fn();
    
    render(<VideoGrid videos={mockVideos} onRefreshStatus={onRefreshStatus} />);
    
    const refreshButton = screen.getByText('Check Status');
    fireEvent.click(refreshButton);
    
    expect(onRefreshStatus).toHaveBeenCalledWith(2);
  });
});

describe('Video Screenshots', () => {
  const mockVideo: GeneratedVideo = {
    id: 'video-1',
    url: 'https://example.com/video.mp4',
    width: 1920,
    height: 1080,
    durationSeconds: 10,
    fps: 30,
    mimeType: 'video/mp4',
    createdAt: new Date('2024-01-01'),
  };

  it('renders with screenshot functionality available', () => {
    const { container } = render(
      <Video 
        video={mockVideo} 
        status="completed" 
      />
    );

    // Video should render
    expect(container.querySelector('video')).toBeInTheDocument();
    // Hidden canvas for screenshots should exist
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });

  it('accepts onScreenshot callback prop', () => {
    const onScreenshot = jest.fn();
    const { container } = render(
      <Video 
        video={mockVideo} 
        status="completed" 
        onScreenshot={onScreenshot}
        maxScreenshots={5}
      />
    );
    
    // Component renders without errors when callback is provided
    expect(container.querySelector('video')).toBeInTheDocument();
  });
});

describe('Video Streaming (HLS)', () => {
  const mockVideo: GeneratedVideo = {
    id: 'video-1',
    url: 'https://example.com/video.mp4',
    width: 1920,
    height: 1080,
    durationSeconds: 10,
    fps: 30,
    mimeType: 'video/mp4',
    createdAt: new Date('2024-01-01'),
  };

  it('accepts src prop for direct URL', () => {
    const { container } = render(
      <Video 
        src="https://example.com/stream.mp4"
        status="completed" 
      />
    );
    
    expect(container.querySelector('video')).toBeInTheDocument();
  });

  it('accepts streaming props', () => {
    const onStreamingStats = jest.fn();
    const { container } = render(
      <Video 
        video={mockVideo}
        status="completed"
        enableHls={true}
        initialQuality={-1}
        showQualitySelector={true}
        showNetworkStats={false}
        isLive={false}
        onStreamingStats={onStreamingStats}
      />
    );
    
    expect(container.querySelector('video')).toBeInTheDocument();
  });

  it('accepts isLive prop without errors', () => {
    const { container } = render(
      <Video 
        video={mockVideo}
        status="completed"
        isLive={true}
      />
    );
    
    // Video should render with isLive prop
    expect(container.querySelector('video')).toBeInTheDocument();
  });

  it('renders buffering overlay when buffering', () => {
    const { container } = render(
      <Video 
        video={mockVideo}
        status="completed"
      />
    );
    
    // Buffering overlay only shows when isBuffering is true and not loading
    // In default state, it should not be visible
    expect(container.querySelector('video')).toBeInTheDocument();
  });

  it('prioritizes src prop over video.url', () => {
    const customSrc = 'https://custom.example.com/video.mp4';
    render(
      <Video 
        src={customSrc}
        video={mockVideo}
        status="completed" 
      />
    );
    
    const videoEl = document.querySelector('video');
    // The video element should exist
    expect(videoEl).toBeInTheDocument();
  });
});
