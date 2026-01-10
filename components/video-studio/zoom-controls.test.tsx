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

      expect(screen.getByRole('button', { name: /zoom.*in/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /zoom.*out/i })).toBeInTheDocument();
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

      expect(screen.getByRole('button', { name: /fit/i })).toBeInTheDocument();
    });

    it('should not render fit to view button when showFitToView is false', () => {
      render(<ZoomControls {...defaultProps} showFitToView={false} />);

      expect(screen.queryByRole('button', { name: /fit/i })).not.toBeInTheDocument();
    });
  });

  describe('zoom in', () => {
    it('should call onZoomChange with increased zoom when zoom in is clicked', () => {
      render(<ZoomControls {...defaultProps} zoom={1} step={0.25} />);

      const zoomInButton = screen.getByRole('button', { name: /zoom.*in/i });
      fireEvent.click(zoomInButton);

      expect(defaultProps.onZoomChange).toHaveBeenCalledWith(1.25);
    });

    it('should disable zoom in button when at max zoom', () => {
      render(<ZoomControls {...defaultProps} zoom={10} maxZoom={10} />);

      const zoomInButton = screen.getByRole('button', { name: /zoom.*in/i });
      expect(zoomInButton).toBeDisabled();
    });

    it('should not exceed max zoom', () => {
      render(<ZoomControls {...defaultProps} zoom={9.9} maxZoom={10} step={0.25} />);

      const zoomInButton = screen.getByRole('button', { name: /zoom.*in/i });
      fireEvent.click(zoomInButton);

      expect(defaultProps.onZoomChange).toHaveBeenCalledWith(10);
    });
  });

  describe('zoom out', () => {
    it('should call onZoomChange with decreased zoom when zoom out is clicked', () => {
      render(<ZoomControls {...defaultProps} zoom={1} step={0.25} />);

      const zoomOutButton = screen.getByRole('button', { name: /zoom.*out/i });
      fireEvent.click(zoomOutButton);

      expect(defaultProps.onZoomChange).toHaveBeenCalledWith(0.75);
    });

    it('should disable zoom out button when at min zoom', () => {
      render(<ZoomControls {...defaultProps} zoom={0.1} minZoom={0.1} />);

      const zoomOutButton = screen.getByRole('button', { name: /zoom.*out/i });
      expect(zoomOutButton).toBeDisabled();
    });

    it('should not go below min zoom', () => {
      render(<ZoomControls {...defaultProps} zoom={0.2} minZoom={0.1} step={0.25} />);

      const zoomOutButton = screen.getByRole('button', { name: /zoom.*out/i });
      fireEvent.click(zoomOutButton);

      expect(defaultProps.onZoomChange).toHaveBeenCalledWith(0.1);
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

      const fitButton = screen.getByRole('button', { name: /fit/i });
      fireEvent.click(fitButton);

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
});
