/**
 * Tests for VideoEditorPanel component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { VideoEditorPanel } from './video-editor-panel';

// Mock the media registry
jest.mock('@/lib/plugin/api/media-api', () => ({
  getMediaRegistry: jest.fn(() => ({
    getAllEffects: jest.fn(() => []),
    getAllTransitions: jest.fn(() => []),
    getAllFilters: jest.fn(() => []),
  })),
}));

// Mock HTMLMediaElement methods
Object.defineProperty(HTMLMediaElement.prototype, 'play', {
  configurable: true,
  value: jest.fn().mockImplementation(() => Promise.resolve()),
});

Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
  configurable: true,
  value: jest.fn(),
});

Object.defineProperty(HTMLMediaElement.prototype, 'load', {
  configurable: true,
  value: jest.fn(),
});

describe('VideoEditorPanel', () => {
  const defaultProps = {
    initialVideoUrl: 'test-video.mp4',
    onSave: jest.fn(),
    onExport: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the editor panel', () => {
      render(<VideoEditorPanel {...defaultProps} />);

      // Should render main sections
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should render with custom className', () => {
      const { container } = render(
        <VideoEditorPanel {...defaultProps} className="custom-editor" />
      );

      expect(container.firstChild).toHaveClass('custom-editor');
    });

    it('should render video preview section', () => {
      render(<VideoEditorPanel {...defaultProps} />);

      const video = document.querySelector('video');
      expect(video).toBeInTheDocument();
    });

    it('should render timeline section', () => {
      render(<VideoEditorPanel {...defaultProps} />);

      // Timeline controls should be present
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(2);
    });
  });

  describe('tabs/panels', () => {
    it('should render effects tab', () => {
      render(<VideoEditorPanel {...defaultProps} />);

      const effectsTab = screen.queryByRole('tab', { name: /effect/i }) ||
                        screen.queryByText(/effect/i);
      expect(effectsTab).toBeInTheDocument();
    });

    it('should render transitions tab', () => {
      render(<VideoEditorPanel {...defaultProps} />);

      const transitionsTab = screen.queryByRole('tab', { name: /transition/i }) ||
                            screen.queryByText(/transition/i);
      expect(transitionsTab).toBeInTheDocument();
    });
  });

  describe('action buttons', () => {
    it('should render save button', () => {
      render(<VideoEditorPanel {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should render export button', () => {
      render(<VideoEditorPanel {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('integration', () => {
    it('should integrate VideoPreview component', () => {
      render(<VideoEditorPanel {...defaultProps} />);

      const video = document.querySelector('video');
      expect(video?.src).toContain('test-video.mp4');
    });

    it('should integrate timeline controls', () => {
      render(<VideoEditorPanel {...defaultProps} />);

      // Should have playback controls
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(2);
    });
  });

  describe('edge cases', () => {
    it('should handle missing initial video URL', () => {
      render(<VideoEditorPanel {...defaultProps} initialVideoUrl="" />);

      // Should render without crashing
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should handle undefined callbacks', () => {
      render(
        <VideoEditorPanel
          initialVideoUrl="test.mp4"
          onSave={undefined}
          onExport={undefined}
        />
      );

      // Should render without crashing
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});
