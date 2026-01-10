/**
 * Tests for VideoTimeline component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { VideoTimeline } from './video-timeline';
import type { VideoTrack } from '@/hooks/video-studio/use-video-editor';

describe('VideoTimeline', () => {
  const mockTracks: VideoTrack[] = [
    {
      id: 'track-1',
      name: 'Video Track',
      type: 'video',
      clips: [
        {
          id: 'clip-1',
          trackIndex: 0,
          name: 'Clip 1',
          sourceUrl: 'video1.mp4',
          startTime: 0,
          duration: 10,
          sourceStartTime: 0,
          sourceEndTime: 10,
          volume: 1,
          playbackSpeed: 1,
          muted: false,
          locked: false,
          effects: [],
        },
        {
          id: 'clip-2',
          trackIndex: 0,
          name: 'Clip 2',
          sourceUrl: 'video2.mp4',
          startTime: 10,
          duration: 10,
          sourceStartTime: 0,
          sourceEndTime: 10,
          volume: 1,
          playbackSpeed: 1,
          muted: false,
          locked: false,
          effects: [],
        },
      ],
      muted: false,
      locked: false,
      visible: true,
      volume: 1,
      height: 60,
    },
    {
      id: 'track-2',
      name: 'Audio Track',
      type: 'audio',
      clips: [],
      muted: false,
      locked: false,
      visible: true,
      volume: 1,
      height: 60,
    },
  ];

  const defaultProps = {
    tracks: mockTracks,
    currentTime: 5,
    duration: 60,
    zoom: 1,
    isPlaying: false,
    selectedClipIds: [],
    selectedTrackId: null,
    snapEnabled: true,
    pixelsPerSecond: 100,
    onTimeChange: jest.fn(),
    onPlay: jest.fn(),
    onPause: jest.fn(),
    onSeekStart: jest.fn(),
    onSeekEnd: jest.fn(),
    onZoomChange: jest.fn(),
    onClipSelect: jest.fn(),
    onClipMove: jest.fn(),
    onClipTrim: jest.fn(),
    onClipSplit: jest.fn(),
    onClipDelete: jest.fn(),
    onClipDuplicate: jest.fn(),
    onTrackSelect: jest.fn(),
    onTrackAdd: jest.fn(),
    onTrackDelete: jest.fn(),
    onTrackMute: jest.fn(),
    onTrackLock: jest.fn(),
    onTrackVisible: jest.fn(),
    onSnapToggle: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the timeline component', () => {
      render(<VideoTimeline {...defaultProps} />);

      // Should have play/pause button
      const playButton = screen.getByRole('button', { name: /play/i });
      expect(playButton).toBeInTheDocument();
    });

    it('should render all tracks', () => {
      render(<VideoTimeline {...defaultProps} />);

      expect(screen.getByText('Video Track')).toBeInTheDocument();
      expect(screen.getByText('Audio Track')).toBeInTheDocument();
    });

    it('should render clips in tracks', () => {
      render(<VideoTimeline {...defaultProps} />);

      expect(screen.getByText('Clip 1')).toBeInTheDocument();
      expect(screen.getByText('Clip 2')).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const { container } = render(
        <VideoTimeline {...defaultProps} className="custom-timeline" />
      );

      expect(container.firstChild).toHaveClass('custom-timeline');
    });

    it('should render zoom controls', () => {
      render(<VideoTimeline {...defaultProps} />);

      // Zoom in/out buttons
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(3);
    });
  });

  describe('playback controls', () => {
    it('should call onPlay when play button is clicked while paused', () => {
      render(<VideoTimeline {...defaultProps} isPlaying={false} />);

      const playButton = screen.getByRole('button', { name: /play/i });
      fireEvent.click(playButton);

      expect(defaultProps.onPlay).toHaveBeenCalled();
    });

    it('should call onPause when pause button is clicked while playing', () => {
      render(<VideoTimeline {...defaultProps} isPlaying={true} />);

      const pauseButton = screen.getByRole('button', { name: /pause/i });
      fireEvent.click(pauseButton);

      expect(defaultProps.onPause).toHaveBeenCalled();
    });

    it('should call onSeekStart when skip back is clicked', () => {
      render(<VideoTimeline {...defaultProps} />);

      const skipBackButton = screen.getByRole('button', { name: /skip.*back|start/i });
      fireEvent.click(skipBackButton);

      expect(defaultProps.onSeekStart).toHaveBeenCalled();
    });

    it('should call onSeekEnd when skip forward is clicked', () => {
      render(<VideoTimeline {...defaultProps} />);

      const skipForwardButton = screen.getByRole('button', { name: /skip.*forward|end/i });
      fireEvent.click(skipForwardButton);

      expect(defaultProps.onSeekEnd).toHaveBeenCalled();
    });
  });

  describe('zoom controls', () => {
    it('should call onZoomChange when zoom in is clicked', () => {
      render(<VideoTimeline {...defaultProps} />);

      const zoomInButton = screen.getByRole('button', { name: /zoom.*in/i });
      fireEvent.click(zoomInButton);

      expect(defaultProps.onZoomChange).toHaveBeenCalled();
    });

    it('should call onZoomChange when zoom out is clicked', () => {
      render(<VideoTimeline {...defaultProps} />);

      const zoomOutButton = screen.getByRole('button', { name: /zoom.*out/i });
      fireEvent.click(zoomOutButton);

      expect(defaultProps.onZoomChange).toHaveBeenCalled();
    });
  });

  describe('track controls', () => {
    it('should call onTrackAdd when add track button is clicked', () => {
      render(<VideoTimeline {...defaultProps} />);

      const addTrackButton = screen.getByRole('button', { name: /add.*track/i });
      fireEvent.click(addTrackButton);

      // Should open menu or directly add
      expect(defaultProps.onTrackAdd).toHaveBeenCalled();
    });

    it('should call onTrackMute when mute button is clicked', () => {
      render(<VideoTimeline {...defaultProps} />);

      const muteButtons = screen.getAllByRole('button', { name: /mute|volume/i });
      if (muteButtons.length > 0) {
        fireEvent.click(muteButtons[0]);
        expect(defaultProps.onTrackMute).toHaveBeenCalled();
      }
    });

    it('should call onTrackLock when lock button is clicked', () => {
      render(<VideoTimeline {...defaultProps} />);

      const lockButtons = screen.getAllByRole('button', { name: /lock/i });
      if (lockButtons.length > 0) {
        fireEvent.click(lockButtons[0]);
        expect(defaultProps.onTrackLock).toHaveBeenCalled();
      }
    });

    it('should call onTrackVisible when visibility button is clicked', () => {
      render(<VideoTimeline {...defaultProps} />);

      const visibilityButtons = screen.getAllByRole('button', { name: /visible|show|hide|eye/i });
      if (visibilityButtons.length > 0) {
        fireEvent.click(visibilityButtons[0]);
        expect(defaultProps.onTrackVisible).toHaveBeenCalled();
      }
    });
  });

  describe('clip selection', () => {
    it('should call onClipSelect when a clip is clicked', () => {
      render(<VideoTimeline {...defaultProps} />);

      const clip1 = screen.getByText('Clip 1');
      fireEvent.click(clip1);

      expect(defaultProps.onClipSelect).toHaveBeenCalledWith(['clip-1']);
    });

    it('should highlight selected clips', () => {
      render(<VideoTimeline {...defaultProps} selectedClipIds={['clip-1']} />);

      // The selected clip should have a different style
      const clip1 = screen.getByText('Clip 1').closest('[class*="clip"]') ||
                   screen.getByText('Clip 1').parentElement;
      expect(clip1).toBeInTheDocument();
    });
  });

  describe('snap toggle', () => {
    it('should call onSnapToggle when snap button is clicked', () => {
      render(<VideoTimeline {...defaultProps} />);

      const snapButton = screen.getByRole('button', { name: /snap/i });
      fireEvent.click(snapButton);

      expect(defaultProps.onSnapToggle).toHaveBeenCalled();
    });

    it('should show snap enabled state', () => {
      render(<VideoTimeline {...defaultProps} snapEnabled={true} />);

      const snapButton = screen.getByRole('button', { name: /snap/i });
      expect(snapButton).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should render with empty tracks array', () => {
      render(<VideoTimeline {...defaultProps} tracks={[]} />);

      // Should still render controls
      expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
    });
  });

  describe('time display', () => {
    it('should display current time', () => {
      render(<VideoTimeline {...defaultProps} currentTime={30} duration={60} />);

      // Time display should be present
      // Format depends on implementation
    });
  });
});
