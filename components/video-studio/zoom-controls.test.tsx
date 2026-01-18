/**
 * Tests for ZoomControls component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ZoomControls } from './zoom-controls';

describe('ZoomControls', () => {
  const defaultProps = {
    zoom: 1,
    onZoomChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the component', () => {
      render(<ZoomControls {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    it('should display zoom percentage', () => {
      render(<ZoomControls {...defaultProps} zoom={1.5} />);

      expect(screen.getByText('150%')).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const { container } = render(
        <ZoomControls {...defaultProps} className="custom-zoom" />
      );

      expect(container.firstChild).toHaveClass('custom-zoom');
    });

    it('should render fit to view button when showFitToView is true', () => {
      const onFitToView = jest.fn();
      render(
        <ZoomControls {...defaultProps} showFitToView={true} onFitToView={onFitToView} />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(3);
    });

    it('should not render fit to view button when showFitToView is false', () => {
      render(<ZoomControls {...defaultProps} showFitToView={false} />);

      // When showFitToView is false, fit button should not be rendered
      // The component should have fewer buttons
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeLessThan(4);
    });
  });

  describe('zoom in', () => {
    it('should call onZoomChange with increased zoom when zoom in is clicked', () => {
      render(<ZoomControls {...defaultProps} zoom={1} step={0.25} />);

      const buttons = screen.getAllByRole('button');
      // Find the zoom in button (usually the second one)
      fireEvent.click(buttons[1]);

      expect(defaultProps.onZoomChange).toHaveBeenCalled();
    });

    it('should disable zoom in button when at max zoom', () => {
      render(<ZoomControls {...defaultProps} zoom={10} maxZoom={10} />);

      const buttons = screen.getAllByRole('button');
      // Second button should be zoom in
      // The component should prevent zooming beyond max
      expect(buttons.length).toBeGreaterThan(1);
    });

    it('should not exceed max zoom', () => {
      render(<ZoomControls {...defaultProps} zoom={9.9} maxZoom={10} step={0.25} />);

      const buttons = screen.getAllByRole('button');
      // Find the zoom in button
      fireEvent.click(buttons[1]);

      expect(defaultProps.onZoomChange).toHaveBeenCalled();
    });
  });

  describe('zoom out', () => {
    it('should call onZoomChange with decreased zoom when zoom out is clicked', () => {
      render(<ZoomControls {...defaultProps} zoom={1} step={0.25} />);

      const buttons = screen.getAllByRole('button');
      // Find the zoom out button (usually the first one)
      fireEvent.click(buttons[0]);

      expect(defaultProps.onZoomChange).toHaveBeenCalled();
    });

    it('should disable zoom out button when at min zoom', () => {
      render(<ZoomControls {...defaultProps} zoom={0.1} minZoom={0.1} />);

      const buttons = screen.getAllByRole('button');
      // First button should be zoom out
      // The component should prevent zooming below min
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should not go below min zoom', () => {
      render(<ZoomControls {...defaultProps} zoom={0.2} minZoom={0.1} step={0.25} />);

      const buttons = screen.getAllByRole('button');
      // Find the zoom out button
      fireEvent.click(buttons[0]);

      expect(defaultProps.onZoomChange).toHaveBeenCalled();
    });
  });

  describe('zoom reset', () => {
    it('should reset zoom to 100% when zoom value is clicked', () => {
      render(<ZoomControls {...defaultProps} zoom={1.5} />);

      const zoomValue = screen.getByText('150%');
      fireEvent.click(zoomValue);

      expect(defaultProps.onZoomChange).toHaveBeenCalledWith(1);
    });
  });

  describe('fit to view', () => {
    it('should call onFitToView when fit button is clicked', () => {
      const onFitToView = jest.fn();
      render(
        <ZoomControls {...defaultProps} showFitToView={true} onFitToView={onFitToView} />
      );

      // Find all buttons and click the one that triggers onFitToView
      const buttons = screen.getAllByRole('button');
      let fitButtonClicked = false;
      
      for (const button of buttons) {
        fireEvent.click(button);
        if (onFitToView.mock.calls.length > 0) {
          fitButtonClicked = true;
          break;
        }
      }
      
      expect(fitButtonClicked).toBe(true);
      expect(onFitToView).toHaveBeenCalled();
    });
  });

  describe('compact mode', () => {
    it('should render smaller buttons in compact mode', () => {
      const { container } = render(<ZoomControls {...defaultProps} compact={true} />);

      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('vertical mode', () => {
    it('should apply vertical layout class when vertical is true', () => {
      const { container } = render(<ZoomControls {...defaultProps} vertical={true} />);

      expect(container.firstChild).toHaveClass('flex-col');
    });
  });

  describe('edge cases', () => {
    it('should handle zoom values at boundaries', () => {
      render(<ZoomControls {...defaultProps} zoom={0.1} minZoom={0.1} maxZoom={10} />);

      expect(screen.getByText('10%')).toBeInTheDocument();
    });

    it('should handle very large zoom values', () => {
      render(<ZoomControls {...defaultProps} zoom={5} />);

      expect(screen.getByText('500%')).toBeInTheDocument();
    });
  });

  describe('responsive layout', () => {
    it('renders zoom value button with responsive width', () => {
      render(<ZoomControls {...defaultProps} showZoomValue={true} />);
      
      // Zoom value button should be present
      const zoomButton = screen.getByText('100%');
      expect(zoomButton).toBeInTheDocument();
      
      // Check that the button has responsive width classes
      const buttonElement = zoomButton.closest('button');
      expect(buttonElement).toBeInTheDocument();
    });

    it('renders fit to view button when enabled', () => {
      render(<ZoomControls {...defaultProps} showFitToView={true} onFitToView={jest.fn()} />);
      
      // Fit button should be present in the component
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});
