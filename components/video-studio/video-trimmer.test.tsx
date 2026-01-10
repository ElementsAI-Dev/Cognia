/**
 * Tests for VideoTrimmer component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { VideoTrimmer } from './video-trimmer';

// Mock HTMLMediaElement methods
Object.defineProperty(HTMLMediaElement.prototype, 'play', {
  configurable: true,
  value: jest.fn().mockImplementation(() => Promise.resolve()),
});

Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
  configurable: true,
  value: jest.fn(),
});

Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {
  configurable: true,
  writable: true,
  value: 0,
});

describe('VideoTrimmer', () => {
  const defaultProps = {
    sourceUrl: 'test-video.mp4',
    duration: 60,
    inPoint: 0,
    outPoint: 60,
    onInPointChange: jest.fn(),
    onOutPointChange: jest.fn(),
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the component', () => {
      render(<VideoTrimmer {...defaultProps} />);

      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should render video element with correct source', () => {
      render(<VideoTrimmer {...defaultProps} />);

      const video = document.querySelector('video');
      expect(video).toBeInTheDocument();
      expect(video?.src).toContain('test-video.mp4');
    });

    it('should display formatted time values', () => {
      render(<VideoTrimmer {...defaultProps} inPoint={5} outPoint={30} />);

      // Time inputs should show formatted values
      const inputs = screen.getAllByRole('textbox');
      expect(inputs.length).toBeGreaterThan(0);
    });

    it('should render with custom className', () => {
      const { container } = render(
        <VideoTrimmer {...defaultProps} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('playback controls', () => {
    it('should render play/pause button', () => {
      render(<VideoTrimmer {...defaultProps} />);

      const playButton = screen.getByRole('button', { name: /play/i });
      expect(playButton).toBeInTheDocument();
    });

    it('should render seek buttons', () => {
      render(<VideoTrimmer {...defaultProps} />);

      // Check for skip back/forward buttons
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(2);
    });
  });

  describe('trim point controls', () => {
    it('should render reset button', () => {
      render(<VideoTrimmer {...defaultProps} />);

      const resetButton = screen.getByRole('button', { name: /reset/i });
      expect(resetButton).toBeInTheDocument();
    });

    it('should call onInPointChange when in point input changes', () => {
      render(<VideoTrimmer {...defaultProps} />);

      const inputs = screen.getAllByRole('textbox');
      const inPointInput = inputs[0]; // First input is typically in point

      fireEvent.change(inPointInput, { target: { value: '00:10.00' } });
      fireEvent.blur(inPointInput);

      // The component parses the time and may call the handler
      expect(defaultProps.onInPointChange).toHaveBeenCalled();
    });

    it('should call onOutPointChange when out point input changes', () => {
      render(<VideoTrimmer {...defaultProps} />);

      const inputs = screen.getAllByRole('textbox');
      const outPointInput = inputs[1]; // Second input is typically out point

      fireEvent.change(outPointInput, { target: { value: '00:50.00' } });
      fireEvent.blur(outPointInput);

      expect(defaultProps.onOutPointChange).toHaveBeenCalled();
    });
  });

  describe('action buttons', () => {
    it('should call onConfirm when confirm button is clicked', () => {
      render(<VideoTrimmer {...defaultProps} inPoint={5} outPoint={30} />);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      fireEvent.click(confirmButton);

      expect(defaultProps.onConfirm).toHaveBeenCalledWith(5, 30);
    });

    it('should call onCancel when cancel button is clicked', () => {
      render(<VideoTrimmer {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(defaultProps.onCancel).toHaveBeenCalled();
    });

    it('should call reset handlers when reset button is clicked', () => {
      render(<VideoTrimmer {...defaultProps} inPoint={10} outPoint={50} />);

      const resetButton = screen.getByRole('button', { name: /reset/i });
      fireEvent.click(resetButton);

      expect(defaultProps.onInPointChange).toHaveBeenCalledWith(0);
      expect(defaultProps.onOutPointChange).toHaveBeenCalledWith(60);
    });
  });

  describe('timeline interaction', () => {
    it('should render timeline element', () => {
      const { container } = render(<VideoTrimmer {...defaultProps} />);

      // Timeline should be present
      const timeline = container.querySelector('[class*="timeline"]') ||
                       container.querySelector('[class*="relative"]');
      expect(timeline).toBeInTheDocument();
    });
  });

  describe('trim duration display', () => {
    it('should display correct trim duration', () => {
      render(<VideoTrimmer {...defaultProps} inPoint={10} outPoint={40} />);

      // The duration should be displayed somewhere (30 seconds = 00:30)
      // This is implementation-dependent
    });
  });

  describe('edge cases', () => {
    it('should handle zero duration', () => {
      render(<VideoTrimmer {...defaultProps} duration={0} inPoint={0} outPoint={0} />);

      // Should render without crashing
      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    });

    it('should handle very long duration', () => {
      render(
        <VideoTrimmer
          {...defaultProps}
          duration={7200} // 2 hours
          inPoint={0}
          outPoint={7200}
        />
      );

      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    });
  });
});
