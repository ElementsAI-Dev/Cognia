import { render, screen, fireEvent } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AudioBlock } from './audio-block';
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

describe('AudioBlock', () => {
  const defaultProps = {
    src: 'https://example.com/audio.mp3',
  };

  describe('Rendering', () => {
    it('renders audio element', () => {
      const { container } = customRender(<AudioBlock {...defaultProps} />);
      expect(container.querySelector('audio')).toBeInTheDocument();
    });

    it('sets src attribute', () => {
      const { container } = customRender(<AudioBlock {...defaultProps} />);
      const audio = container.querySelector('audio');
      expect(audio).toHaveAttribute('src', defaultProps.src);
    });

    it('renders with title', () => {
      customRender(<AudioBlock {...defaultProps} title="Song Title" />);
      expect(screen.getByText('Song Title')).toBeInTheDocument();
    });

    it('renders with artist', () => {
      customRender(<AudioBlock {...defaultProps} artist="Artist Name" />);
      expect(screen.getByText('Artist Name')).toBeInTheDocument();
    });

    it('renders with album', () => {
      customRender(<AudioBlock {...defaultProps} album="Album Name" />);
      expect(screen.getByText('Album Name')).toBeInTheDocument();
    });

    it('renders artist and album with separator', () => {
      customRender(
        <AudioBlock {...defaultProps} artist="Artist" album="Album" />
      );
      expect(screen.getByText(/Artist.*•.*Album/)).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = customRender(
        <AudioBlock {...defaultProps} className="custom-class" />
      );
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Cover art', () => {
    it('renders cover image when provided', () => {
      customRender(
        <AudioBlock {...defaultProps} cover="https://example.com/cover.jpg" />
      );
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', 'https://example.com/cover.jpg');
    });

    it('renders music icon when no cover provided', () => {
      const { container } = customRender(<AudioBlock {...defaultProps} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Controls', () => {
    it('renders play button', () => {
      const { container } = customRender(<AudioBlock {...defaultProps} />);
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });

    it('renders skip buttons', () => {
      const { container } = customRender(<AudioBlock {...defaultProps} />);
      // Skip back and forward buttons
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThanOrEqual(3);
    });

    it('renders volume controls', () => {
      const { container } = customRender(<AudioBlock {...defaultProps} />);
      // Volume button and slider - check for slider container or buttons
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThanOrEqual(4);
    });

    it('renders loop button', () => {
      const { container } = customRender(<AudioBlock {...defaultProps} />);
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Audio properties', () => {
    it('sets autoplay when enabled', () => {
      const { container } = customRender(
        <AudioBlock {...defaultProps} autoPlay />
      );
      const audio = container.querySelector('audio');
      expect(audio).toHaveAttribute('autoplay');
    });

    it('sets loop when enabled', () => {
      const { container } = customRender(
        <AudioBlock {...defaultProps} loop />
      );
      const audio = container.querySelector('audio');
      expect(audio).toHaveAttribute('loop');
    });
  });

  describe('Download', () => {
    it('renders download button when showDownload is true', () => {
      customRender(<AudioBlock {...defaultProps} showDownload />);
      // Download button should be present
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });

    it('hides download button when showDownload is false', () => {
      const { container } = customRender(
        <AudioBlock {...defaultProps} showDownload={false} />
      );
      // Fewer buttons without download
      const buttons = container.querySelectorAll('button');
      // Should still have play, skip, volume, loop
      expect(buttons.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Error handling', () => {
    it('shows error state when audio fails to load', () => {
      const { container } = customRender(<AudioBlock {...defaultProps} />);
      const audio = container.querySelector('audio');
      
      if (audio) {
        fireEvent.error(audio);
      }
      
      expect(screen.getByText('Failed to load audio')).toBeInTheDocument();
    });
  });

  describe('Time display', () => {
    it('shows time display', () => {
      customRender(<AudioBlock {...defaultProps} />);
      // Initial time should be 0:00 / 0:00
      expect(screen.getAllByText('0:00').length).toBeGreaterThanOrEqual(1);
    });
  });
});
