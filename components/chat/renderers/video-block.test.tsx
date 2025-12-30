import { render, screen, fireEvent } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { VideoBlock } from './video-block';
import { ReactNode } from 'react';

// Wrapper with TooltipProvider
const Wrapper = ({ children }: { children: ReactNode }) => (
  <TooltipProvider>{children}</TooltipProvider>
);

// Custom render with TooltipProvider
const customRender = (ui: React.ReactElement) =>
  render(ui, { wrapper: Wrapper });

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock formatVideoTime from utils
jest.mock('@/lib/utils', () => ({
  ...jest.requireActual('@/lib/utils'),
  formatVideoTime: (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },
}));

describe('VideoBlock', () => {
  const defaultProps = {
    src: 'https://example.com/video.mp4',
  };

  describe('Native video rendering', () => {
    it('renders video element for mp4 files', () => {
      const { container } = customRender(<VideoBlock {...defaultProps} />);
      expect(container.querySelector('video')).toBeInTheDocument();
    });

    it('sets src attribute', () => {
      const { container } = customRender(<VideoBlock {...defaultProps} />);
      const video = container.querySelector('video');
      expect(video).toHaveAttribute('src', defaultProps.src);
    });

    it('renders with poster image', () => {
      const { container } = customRender(
        <VideoBlock {...defaultProps} poster="https://example.com/poster.jpg" />
      );
      const video = container.querySelector('video');
      expect(video).toHaveAttribute('poster', 'https://example.com/poster.jpg');
    });

    it('renders title caption', () => {
      customRender(<VideoBlock {...defaultProps} title="Video Title" />);
      expect(screen.getByText('Video Title')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = customRender(
        <VideoBlock {...defaultProps} className="custom-class" />
      );
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Video properties', () => {
    it('sets autoplay when enabled', () => {
      const { container } = customRender(
        <VideoBlock {...defaultProps} autoPlay />
      );
      const video = container.querySelector('video');
      expect(video).toHaveAttribute('autoplay');
    });

    it('sets loop when enabled', () => {
      const { container } = customRender(
        <VideoBlock {...defaultProps} loop />
      );
      const video = container.querySelector('video');
      expect(video).toHaveAttribute('loop');
    });

    it('sets muted when enabled', () => {
      const { container } = customRender(
        <VideoBlock {...defaultProps} muted />
      );
      const video = container.querySelector('video');
      expect(video).toHaveProperty('muted', true);
    });

    it('sets playsinline attribute', () => {
      const { container } = customRender(<VideoBlock {...defaultProps} />);
      const video = container.querySelector('video');
      expect(video).toHaveAttribute('playsinline');
    });
  });

  describe('YouTube embedding', () => {
    it('renders iframe for YouTube URLs', () => {
      const { container } = customRender(
        <VideoBlock src="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />
      );
      const iframe = container.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute('src', expect.stringContaining('youtube.com/embed'));
    });

    it('extracts video ID from youtube.com URL', () => {
      const { container } = customRender(
        <VideoBlock src="https://www.youtube.com/watch?v=abc123xyz" />
      );
      const iframe = container.querySelector('iframe');
      expect(iframe?.getAttribute('src')).toContain('abc123xyz');
    });

    it('extracts video ID from youtu.be URL', () => {
      const { container } = customRender(
        <VideoBlock src="https://youtu.be/abc123xyz" />
      );
      const iframe = container.querySelector('iframe');
      expect(iframe?.getAttribute('src')).toContain('abc123xyz');
    });
  });

  describe('Vimeo embedding', () => {
    it('renders iframe for Vimeo URLs', () => {
      const { container } = customRender(
        <VideoBlock src="https://vimeo.com/123456789" />
      );
      const iframe = container.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute('src', expect.stringContaining('player.vimeo.com'));
    });
  });

  describe('Bilibili embedding', () => {
    it('renders iframe for Bilibili BV URLs', () => {
      const { container } = customRender(
        <VideoBlock src="https://www.bilibili.com/video/BV1xx411c7mD" />
      );
      const iframe = container.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute('src', expect.stringContaining('player.bilibili.com'));
    });
  });

  describe('Error handling', () => {
    it('shows error state when video fails to load', () => {
      const { container } = customRender(<VideoBlock {...defaultProps} />);
      const video = container.querySelector('video');
      
      if (video) {
        fireEvent.error(video);
      }
      
      expect(screen.getByText('Failed to load video')).toBeInTheDocument();
    });

    it('shows Open URL button in error state', () => {
      const { container } = customRender(<VideoBlock {...defaultProps} />);
      const video = container.querySelector('video');
      
      if (video) {
        fireEvent.error(video);
      }
      
      expect(screen.getByText('Open URL')).toBeInTheDocument();
    });
  });

  describe('Controls', () => {
    it('shows controls overlay on hover', () => {
      const { container } = customRender(
        <VideoBlock {...defaultProps} controls />
      );
      
      // Controls should be present (visible on hover via CSS)
      const controlsArea = container.querySelector('.group');
      expect(controlsArea).toBeInTheDocument();
    });

    it('hides controls when controls prop is false', () => {
      const { container } = customRender(
        <VideoBlock {...defaultProps} controls={false} />
      );
      
      // Native controls should be used instead
      const video = container.querySelector('video');
      expect(video).toBeInTheDocument();
    });
  });
});
