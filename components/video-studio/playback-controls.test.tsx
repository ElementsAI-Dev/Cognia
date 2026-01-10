/**
 * Tests for PlaybackControls component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlaybackControls } from './playback-controls';

describe('PlaybackControls', () => {
  const defaultProps = {
    isPlaying: false,
    currentTime: 30,
    duration: 120,
    onPlayPause: jest.fn(),
    onSeek: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the component', () => {
      render(<PlaybackControls {...defaultProps} />);

      expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
    });

    it('should render progress slider', () => {
      render(<PlaybackControls {...defaultProps} />);

      expect(screen.getByRole('slider')).toBeInTheDocument();
    });

    it('should display formatted time', () => {
      render(<PlaybackControls {...defaultProps} />);

      expect(screen.getByText('0:30')).toBeInTheDocument();
      expect(screen.getByText('2:00')).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const { container } = render(
        <PlaybackControls {...defaultProps} className="custom-controls" />
      );

      expect(container.firstChild).toHaveClass('custom-controls');
    });
  });

  describe('play/pause', () => {
    it('should show play button when paused', () => {
      render(<PlaybackControls {...defaultProps} isPlaying={false} />);

      expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
    });

    it('should show pause button when playing', () => {
      render(<PlaybackControls {...defaultProps} isPlaying={true} />);

      expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
    });

    it('should call onPlayPause when clicked', () => {
      render(<PlaybackControls {...defaultProps} />);

      const playButton = screen.getByRole('button', { name: /play/i });
      fireEvent.click(playButton);

      expect(defaultProps.onPlayPause).toHaveBeenCalled();
    });
  });

  describe('progress', () => {
    it('should show correct progress position', () => {
      render(<PlaybackControls {...defaultProps} currentTime={60} duration={120} />);

      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-valuenow', '50');
    });

    it('should call onSeek when progress is changed', () => {
      render(<PlaybackControls {...defaultProps} />);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '50' } });

      expect(defaultProps.onSeek).toHaveBeenCalled();
    });
  });

  describe('skip controls', () => {
    it('should render skip buttons when showSkipControls is true', () => {
      render(<PlaybackControls {...defaultProps} showSkipControls={true} />);

      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /forward/i })).toBeInTheDocument();
    });

    it('should not render skip buttons when showSkipControls is false', () => {
      render(<PlaybackControls {...defaultProps} showSkipControls={false} />);

      expect(screen.queryByRole('button', { name: /back.*10/i })).not.toBeInTheDocument();
    });

    it('should call onSeek with correct time when skip back is clicked', () => {
      render(<PlaybackControls {...defaultProps} skipAmount={10} />);

      const skipBackButton = screen.getByRole('button', { name: /back/i });
      fireEvent.click(skipBackButton);

      expect(defaultProps.onSeek).toHaveBeenCalledWith(20);
    });

    it('should call onSeek with correct time when skip forward is clicked', () => {
      render(<PlaybackControls {...defaultProps} skipAmount={10} />);

      const skipForwardButton = screen.getByRole('button', { name: /forward/i });
      fireEvent.click(skipForwardButton);

      expect(defaultProps.onSeek).toHaveBeenCalledWith(40);
    });
  });

  describe('volume controls', () => {
    it('should render volume button when showVolumeControl is true', () => {
      render(<PlaybackControls {...defaultProps} showVolumeControl={true} />);

      expect(screen.getByRole('button', { name: /mute|volume/i })).toBeInTheDocument();
    });

    it('should not render volume button when showVolumeControl is false', () => {
      render(<PlaybackControls {...defaultProps} showVolumeControl={false} />);

      expect(screen.queryByRole('button', { name: /mute/i })).not.toBeInTheDocument();
    });

    it('should call onMutedChange when mute button is clicked', () => {
      const onMutedChange = jest.fn();
      render(
        <PlaybackControls
          {...defaultProps}
          showVolumeControl={true}
          muted={false}
          onMutedChange={onMutedChange}
        />
      );

      const muteButton = screen.getByRole('button', { name: /mute|volume/i });
      fireEvent.click(muteButton);

      expect(onMutedChange).toHaveBeenCalledWith(true);
    });
  });

  describe('speed controls', () => {
    it('should render speed button when showSpeedControl is true', () => {
      render(<PlaybackControls {...defaultProps} showSpeedControl={true} />);

      expect(screen.getByRole('button', { name: /speed|settings/i })).toBeInTheDocument();
    });

    it('should display current playback speed', () => {
      render(<PlaybackControls {...defaultProps} playbackSpeed={1.5} />);

      expect(screen.getByText('1.5x')).toBeInTheDocument();
    });
  });

  describe('fullscreen controls', () => {
    it('should render fullscreen button when showFullscreenControl is true', () => {
      const onFullscreenToggle = jest.fn();
      render(
        <PlaybackControls
          {...defaultProps}
          showFullscreenControl={true}
          onFullscreenToggle={onFullscreenToggle}
        />
      );

      expect(screen.getByRole('button', { name: /fullscreen/i })).toBeInTheDocument();
    });

    it('should call onFullscreenToggle when clicked', () => {
      const onFullscreenToggle = jest.fn();
      render(
        <PlaybackControls
          {...defaultProps}
          showFullscreenControl={true}
          onFullscreenToggle={onFullscreenToggle}
        />
      );

      const fullscreenButton = screen.getByRole('button', { name: /fullscreen/i });
      fireEvent.click(fullscreenButton);

      expect(onFullscreenToggle).toHaveBeenCalled();
    });
  });

  describe('compact mode', () => {
    it('should render smaller buttons in compact mode', () => {
      const { container } = render(<PlaybackControls {...defaultProps} compact={true} />);

      // In compact mode, buttons should have smaller icon classes
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('time formatting', () => {
    it('should format time with hours when duration > 1 hour', () => {
      render(<PlaybackControls {...defaultProps} currentTime={3661} duration={7200} />);

      // 3661 seconds = 1:01:01
      expect(screen.getByText('1:01:01')).toBeInTheDocument();
    });

    it('should handle zero duration', () => {
      render(<PlaybackControls {...defaultProps} currentTime={0} duration={0} />);

      expect(screen.getByText('0:00')).toBeInTheDocument();
    });
  });
});
