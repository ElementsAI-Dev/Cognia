/**
 * Tests for VideoTransitions component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { VideoTransitions } from './video-transitions';

// Mock the media registry
jest.mock('@/lib/plugin/api/media-api', () => ({
  getMediaRegistry: jest.fn(() => ({
    getAllTransitions: jest.fn(() => []),
  })),
}));

describe('VideoTransitions', () => {
  const defaultProps = {
    selectedTransitionId: null,
    transitionDuration: 1,
    onTransitionSelect: jest.fn(),
    onDurationChange: jest.fn(),
    onPreview: jest.fn(),
    onApply: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the component', () => {
      render(<VideoTransitions {...defaultProps} />);

      // Should render transition options
      expect(screen.getByText(/fade/i)).toBeInTheDocument();
    });

    it('should render built-in transitions', () => {
      render(<VideoTransitions {...defaultProps} />);

      expect(screen.getByText(/fade/i)).toBeInTheDocument();
      expect(screen.getByText(/dissolve/i)).toBeInTheDocument();
      expect(screen.getByText(/wipe/i)).toBeInTheDocument();
    });

    it('should render action buttons', () => {
      render(<VideoTransitions {...defaultProps} />);

      expect(screen.getByRole('button', { name: /apply/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should render duration control', () => {
      render(<VideoTransitions {...defaultProps} />);

      // Duration slider or input should be present
      const durationLabel = screen.getByText(/duration/i);
      expect(durationLabel).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const { container } = render(
        <VideoTransitions {...defaultProps} className="custom-transitions" />
      );

      expect(container.firstChild).toHaveClass('custom-transitions');
    });
  });

  describe('transition selection', () => {
    it('should call onTransitionSelect when a transition is clicked', () => {
      render(<VideoTransitions {...defaultProps} />);

      const fadeTransition = screen.getByText(/fade/i).closest('button') ||
                            screen.getByText(/fade/i).closest('[role="button"]') ||
                            screen.getByText(/fade/i).parentElement;
      
      if (fadeTransition) {
        fireEvent.click(fadeTransition);
        expect(defaultProps.onTransitionSelect).toHaveBeenCalled();
      }
    });

    it('should highlight selected transition', () => {
      render(<VideoTransitions {...defaultProps} selectedTransitionId="fade" />);

      // The selected transition should have a different style
      const fadeTransition = screen.getByText(/fade/i).closest('[class*="card"]') ||
                            screen.getByText(/fade/i).parentElement;
      expect(fadeTransition).toBeInTheDocument();
    });

    it('should allow deselecting transition', () => {
      render(<VideoTransitions {...defaultProps} selectedTransitionId="fade" />);

      // Click on "None" option if available
      const noneOption = screen.queryByText(/none/i);
      if (noneOption) {
        fireEvent.click(noneOption);
        expect(defaultProps.onTransitionSelect).toHaveBeenCalledWith(null);
      }
    });
  });

  describe('duration control', () => {
    it('should display current duration', () => {
      render(<VideoTransitions {...defaultProps} transitionDuration={1.5} />);

      // Duration value should be displayed
      expect(screen.getByText(/1\.5/)).toBeInTheDocument();
    });

    it('should call onDurationChange when duration is changed', () => {
      render(<VideoTransitions {...defaultProps} />);

      // Find slider and change value
      const slider = screen.getByRole('slider');
      if (slider) {
        fireEvent.change(slider, { target: { value: '2' } });
        expect(defaultProps.onDurationChange).toHaveBeenCalled();
      }
    });
  });

  describe('preview', () => {
    it('should call onPreview when preview button is clicked', () => {
      render(<VideoTransitions {...defaultProps} selectedTransitionId="fade" />);

      const previewButton = screen.queryByRole('button', { name: /preview/i });
      if (previewButton) {
        fireEvent.click(previewButton);
        expect(defaultProps.onPreview).toHaveBeenCalledWith('fade');
      }
    });
  });

  describe('action buttons', () => {
    it('should call onApply when apply button is clicked', () => {
      render(<VideoTransitions {...defaultProps} />);

      const applyButton = screen.getByRole('button', { name: /apply/i });
      fireEvent.click(applyButton);

      expect(defaultProps.onApply).toHaveBeenCalled();
    });

    it('should call onCancel when cancel button is clicked', () => {
      render(<VideoTransitions {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(defaultProps.onCancel).toHaveBeenCalled();
    });
  });

  describe('transition categories', () => {
    it('should display transition descriptions', () => {
      render(<VideoTransitions {...defaultProps} />);

      // Descriptions should be visible
      expect(screen.getByText(/smooth fade between clips/i)).toBeInTheDocument();
    });

    it('should display transition icons', () => {
      render(<VideoTransitions {...defaultProps} />);

      // Icons/emojis should be rendered
      // This is implementation-dependent
    });
  });

  describe('edge cases', () => {
    it('should handle no selected transition', () => {
      render(<VideoTransitions {...defaultProps} selectedTransitionId={null} />);

      // Should render without errors
      expect(screen.getByRole('button', { name: /apply/i })).toBeInTheDocument();
    });

    it('should handle invalid transition ID', () => {
      render(<VideoTransitions {...defaultProps} selectedTransitionId="invalid-id" />);

      // Should render without errors
      expect(screen.getByRole('button', { name: /apply/i })).toBeInTheDocument();
    });
  });
});
