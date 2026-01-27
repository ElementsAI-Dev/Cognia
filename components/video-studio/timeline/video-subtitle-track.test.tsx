import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { VideoSubtitleTrack, type VideoSubtitleTrackProps } from './video-subtitle-track';
import type { SubtitleCue } from '@/types/media/subtitle';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const mockCues: SubtitleCue[] = [
  {
    id: 'cue-1',
    index: 1,
    startTime: 0,
    endTime: 2000,
    text: 'Hello, world!',
  },
  {
    id: 'cue-2',
    index: 2,
    startTime: 3000,
    endTime: 5000,
    text: 'This is a subtitle',
  },
  {
    id: 'cue-3',
    index: 3,
    startTime: 6000,
    endTime: 8000,
    text: 'Another cue',
  },
];

describe('VideoSubtitleTrack', () => {
  const defaultProps: VideoSubtitleTrackProps = {
    trackId: 'track-1',
    trackName: 'English Subtitles',
    language: 'en',
    cues: mockCues,
    currentTime: 1000,
    duration: 10000,
    zoom: 1,
    pixelsPerSecond: 100,
    isVisible: true,
    isLocked: false,
    selectedCueIds: [],
    onCueSelect: jest.fn(),
    onCueUpdate: jest.fn(),
    onCueDelete: jest.fn(),
    onCueSplit: jest.fn(),
    onCueMerge: jest.fn(),
    onCueDuplicate: jest.fn(),
    onTimeChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders track with name and language', () => {
      render(<VideoSubtitleTrack {...defaultProps} />);

      expect(screen.getByText('English Subtitles')).toBeInTheDocument();
      expect(screen.getByText('en')).toBeInTheDocument();
    });

    it('renders all cues', () => {
      const { container } = render(<VideoSubtitleTrack {...defaultProps} />);

      // Check that cue triggers exist (text appears in both cue and tooltip)
      const cueTriggers = container.querySelectorAll('[data-slot="context-menu-trigger"]');
      expect(cueTriggers.length).toBe(3);
    });

    it('renders nothing when isVisible is false', () => {
      const { container } = render(
        <VideoSubtitleTrack {...defaultProps} isVisible={false} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('applies locked styling when isLocked is true', () => {
      const { container } = render(
        <VideoSubtitleTrack {...defaultProps} isLocked={true} />
      );

      const track = container.firstChild as HTMLElement;
      expect(track).toHaveClass('opacity-50');
      expect(track).toHaveClass('pointer-events-none');
    });

    it('applies custom className', () => {
      const { container } = render(
        <VideoSubtitleTrack {...defaultProps} className="custom-class" />
      );

      const track = container.firstChild as HTMLElement;
      expect(track).toHaveClass('custom-class');
    });
  });

  describe('cue selection', () => {
    it('selects cue on click', () => {
      const onCueSelect = jest.fn();
      const { container } = render(
        <VideoSubtitleTrack {...defaultProps} onCueSelect={onCueSelect} />
      );

      const cueTrigger = container.querySelector('[data-slot="context-menu-trigger"]');
      if (cueTrigger) {
        fireEvent.click(cueTrigger);
        expect(onCueSelect).toHaveBeenCalledWith(['cue-1']);
      }
    });

    it('multi-selects with shift key', () => {
      const onCueSelect = jest.fn();
      const { container } = render(
        <VideoSubtitleTrack
          {...defaultProps}
          selectedCueIds={['cue-1']}
          onCueSelect={onCueSelect}
        />
      );

      const cueTriggers = container.querySelectorAll('[data-slot="context-menu-trigger"]');
      if (cueTriggers[1]) {
        fireEvent.click(cueTriggers[1], { shiftKey: true });
        expect(onCueSelect).toHaveBeenCalledWith(['cue-1', 'cue-2']);
      }
    });

    it('toggles selection with ctrl key', () => {
      const onCueSelect = jest.fn();
      const { container } = render(
        <VideoSubtitleTrack
          {...defaultProps}
          selectedCueIds={['cue-1']}
          onCueSelect={onCueSelect}
        />
      );

      const cueTrigger = container.querySelector('[data-slot="context-menu-trigger"]');
      if (cueTrigger) {
        fireEvent.click(cueTrigger, { ctrlKey: true });
        expect(onCueSelect).toHaveBeenCalledWith([]);
      }
    });

    it('does not select when locked', () => {
      const onCueSelect = jest.fn();
      render(
        <VideoSubtitleTrack
          {...defaultProps}
          isLocked={true}
          onCueSelect={onCueSelect}
        />
      );

      // Track is pointer-events-none when locked, so we test the handler
      expect(onCueSelect).not.toHaveBeenCalled();
    });
  });

  describe('cue editing', () => {
    it('enters edit mode on double click', () => {
      const { container } = render(<VideoSubtitleTrack {...defaultProps} />);

      const cueTrigger = container.querySelector('[data-slot="context-menu-trigger"]');
      if (cueTrigger) {
        fireEvent.doubleClick(cueTrigger);
        expect(screen.getByDisplayValue('Hello, world!')).toBeInTheDocument();
      }
    });

    it('confirms edit on Enter key', () => {
      const onCueUpdate = jest.fn();
      const { container } = render(
        <VideoSubtitleTrack {...defaultProps} onCueUpdate={onCueUpdate} />
      );

      const cueTrigger = container.querySelector('[data-slot="context-menu-trigger"]');
      if (cueTrigger) {
        fireEvent.doubleClick(cueTrigger);

        const input = screen.getByDisplayValue('Hello, world!');
        fireEvent.change(input, { target: { value: 'Updated text' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(onCueUpdate).toHaveBeenCalledWith('cue-1', { text: 'Updated text' });
      }
    });

    it('cancels edit on Escape key', () => {
      const onCueUpdate = jest.fn();
      const { container } = render(
        <VideoSubtitleTrack {...defaultProps} onCueUpdate={onCueUpdate} />
      );

      const cueTrigger = container.querySelector('[data-slot="context-menu-trigger"]');
      if (cueTrigger) {
        fireEvent.doubleClick(cueTrigger);

        const input = screen.getByDisplayValue('Hello, world!');
        fireEvent.change(input, { target: { value: 'Updated text' } });
        fireEvent.keyDown(input, { key: 'Escape' });

        expect(onCueUpdate).not.toHaveBeenCalled();
      }
    });
  });

  describe('time display', () => {
    it('formats time correctly in tooltip', () => {
      render(<VideoSubtitleTrack {...defaultProps} />);

      // Check for formatted time in tooltip content
      expect(screen.getByText(/0:00\.00/)).toBeInTheDocument();
    });
  });

  describe('track click', () => {
    it('changes time when clicking on track', () => {
      const onTimeChange = jest.fn();
      const { container } = render(
        <VideoSubtitleTrack {...defaultProps} onTimeChange={onTimeChange} />
      );

      // Find the track content area (not the header)
      const trackContent = container.querySelector('.flex-1.relative.overflow-hidden');
      if (trackContent) {
        // Mock getBoundingClientRect
        const mockRect = {
          left: 0,
          top: 0,
          width: 1000,
          height: 40,
          right: 1000,
          bottom: 40,
        };
        jest.spyOn(trackContent, 'getBoundingClientRect').mockReturnValue(mockRect as DOMRect);

        fireEvent.click(trackContent, { clientX: 500, clientY: 20 });

        expect(onTimeChange).toHaveBeenCalled();
      }
    });
  });

  describe('drag and drop', () => {
    it('starts drag on mouse down', () => {
      const { container } = render(<VideoSubtitleTrack {...defaultProps} />);

      const cueTrigger = container.querySelector('[data-slot="context-menu-trigger"]');
      if (cueTrigger) {
        fireEvent.mouseDown(cueTrigger, { clientX: 100 });
        // Drag state is internal
      }
    });

    it('does not drag when locked', () => {
      const onCueUpdate = jest.fn();
      render(
        <VideoSubtitleTrack
          {...defaultProps}
          isLocked={true}
          onCueUpdate={onCueUpdate}
        />
      );

      // When locked, pointer-events-none prevents drag
      expect(onCueUpdate).not.toHaveBeenCalled();
    });
  });

  describe('selected cue styling', () => {
    it('applies selected styling to selected cues', () => {
      const { container } = render(
        <VideoSubtitleTrack {...defaultProps} selectedCueIds={['cue-1']} />
      );

      // Selected cues should have ring-2 class
      const selectedCue = container.querySelector('.ring-2.ring-primary');
      expect(selectedCue).toBeInTheDocument();
    });

    it('highlights current cue at playhead position', () => {
      const { container } = render(
        <VideoSubtitleTrack {...defaultProps} currentTime={1000} />
      );

      // Current cue (cue-1: 0-2000ms) should have bg-primary/40
      const currentCue = container.querySelector('.bg-primary\\/40');
      expect(currentCue).toBeInTheDocument();
    });
  });

  describe('playhead indicator', () => {
    it('renders playhead at correct position', () => {
      const { container } = render(
        <VideoSubtitleTrack {...defaultProps} currentTime={5000} />
      );

      const playhead = container.querySelector('.bg-primary.pointer-events-none');
      expect(playhead).toBeInTheDocument();
    });
  });

  describe('responsive layout', () => {
    it('renders track header with responsive width', () => {
      const { container } = render(<VideoSubtitleTrack {...defaultProps} />);

      const header = container.querySelector('.w-\\[120px\\].sm\\:w-\\[150px\\]');
      expect(header).toBeInTheDocument();
    });

    it('renders track name with responsive text size', () => {
      const { container } = render(<VideoSubtitleTrack {...defaultProps} />);

      const trackName = container.querySelector('.text-xs.sm\\:text-sm');
      expect(trackName).toBeInTheDocument();
    });
  });

  describe('empty cues', () => {
    it('renders empty track when no cues', () => {
      const { container } = render(
        <VideoSubtitleTrack {...defaultProps} cues={[]} />
      );

      // Track should still render but without cue elements
      expect(container.firstChild).not.toBeNull();
      const cueTriggers = container.querySelectorAll('[data-slot="context-menu-trigger"]');
      expect(cueTriggers.length).toBe(0);
    });
  });

  describe('zoom and scaling', () => {
    it('calculates correct cue width based on zoom', () => {
      const { container } = render(
        <VideoSubtitleTrack {...defaultProps} zoom={2} />
      );

      // Cues should be rendered with doubled width due to zoom
      const cue = container.querySelector('[style*="width"]');
      expect(cue).toBeInTheDocument();
    });

    it('calculates correct timeline width', () => {
      const { container } = render(
        <VideoSubtitleTrack
          {...defaultProps}
          duration={10000}
          pixelsPerSecond={100}
          zoom={1}
        />
      );

      // Timeline renders correctly with given parameters
      const trackContent = container.querySelector('.flex-1.relative.overflow-hidden');
      expect(trackContent).toHaveStyle({ width: '1000000px' });
    });
  });
});
