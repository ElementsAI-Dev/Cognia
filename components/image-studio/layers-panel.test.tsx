/**
 * Tests for LayersPanel component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LayersPanel } from './layers-panel';
import type { Layer } from './layers-panel';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

describe('LayersPanel', () => {
  const mockLayers: Layer[] = [
    {
      id: 'layer-1',
      name: 'Background',
      type: 'image',
      visible: true,
      locked: false,
      opacity: 100,
      blendMode: 'normal',
      order: 0,
    },
    {
      id: 'layer-2',
      name: 'Mask Layer',
      type: 'mask',
      visible: true,
      locked: false,
      opacity: 80,
      blendMode: 'multiply',
      order: 1,
    },
    {
      id: 'layer-3',
      name: 'Adjustment',
      type: 'adjustment',
      visible: true,
      locked: true,
      opacity: 100,
      blendMode: 'overlay',
      order: 2,
    },
  ];

  const defaultProps = {
    layers: mockLayers,
    activeLayerId: 'layer-2',
    onLayerSelect: jest.fn(),
    onLayerUpdate: jest.fn(),
    onLayerDelete: jest.fn(),
    onLayerDuplicate: jest.fn(),
    onLayerAdd: jest.fn(),
    onLayerReorder: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should export LayersPanel component', () => {
      expect(LayersPanel).toBeDefined();
      expect(typeof LayersPanel).toBe('function');
    });

    it('should have correct display name or name', () => {
      expect(LayersPanel.name).toBe('LayersPanel');
    });

    it('should render the component with title', () => {
      render(<LayersPanel {...defaultProps} />);
      expect(screen.getByText('Layers')).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const { container } = render(<LayersPanel {...defaultProps} className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should display layer count', () => {
      render(<LayersPanel {...defaultProps} />);
      expect(screen.getByText('(3)')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no layers', () => {
      render(<LayersPanel {...defaultProps} layers={[]} activeLayerId={null} />);
      expect(screen.getByText('No layers yet. Add one to get started.')).toBeInTheDocument();
    });
  });

  describe('Layer List', () => {
    it('should render all layers', () => {
      render(<LayersPanel {...defaultProps} />);
      expect(screen.getByText('Background')).toBeInTheDocument();
      expect(screen.getByText('Mask Layer')).toBeInTheDocument();
      expect(screen.getByText('Adjustment')).toBeInTheDocument();
    });

    it('should select layer on click', async () => {
      const user = userEvent.setup();
      render(<LayersPanel {...defaultProps} />);
      
      await user.click(screen.getByText('Background'));
      expect(defaultProps.onLayerSelect).toHaveBeenCalledWith('layer-1');
    });
  });

  describe('Active Layer Settings', () => {
    it('should show opacity slider for active layer', () => {
      render(<LayersPanel {...defaultProps} />);
      expect(screen.getByText('Opacity')).toBeInTheDocument();
    });

    it('should show blend mode dropdown for active layer', () => {
      render(<LayersPanel {...defaultProps} />);
      expect(screen.getByText('Blend Mode')).toBeInTheDocument();
    });

    it('should display current opacity value', () => {
      render(<LayersPanel {...defaultProps} />);
      expect(screen.getByText('80%')).toBeInTheDocument();
    });
  });

  describe('Merge Layers', () => {
    it('should render merge button when onLayerMerge is provided', () => {
      const onLayerMerge = jest.fn();
      render(<LayersPanel {...defaultProps} onLayerMerge={onLayerMerge} />);
      expect(screen.getByText('Merge Visible')).toBeInTheDocument();
    });

    it('should not render merge button when onLayerMerge is not provided', () => {
      render(<LayersPanel {...defaultProps} />);
      expect(screen.queryByText('Merge Visible')).not.toBeInTheDocument();
    });

    it('should call onLayerMerge when merge is clicked', async () => {
      const onLayerMerge = jest.fn();
      const user = userEvent.setup();
      render(<LayersPanel {...defaultProps} onLayerMerge={onLayerMerge} />);
      
      await user.click(screen.getByText('Merge Visible'));
      expect(onLayerMerge).toHaveBeenCalled();
    });
  });

  describe('Layer Thumbnails', () => {
    it('should display thumbnails when provided', () => {
      const layersWithThumbnails: Layer[] = [
        {
          ...mockLayers[0],
          thumbnail: 'data:image/png;base64,mockthumb',
        },
      ];
      render(<LayersPanel {...defaultProps} layers={layersWithThumbnails} activeLayerId="layer-1" />);
      const img = document.querySelector('img');
      expect(img).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria attributes', () => {
      render(<LayersPanel {...defaultProps} />);
      expect(screen.getByRole('region', { name: 'Layers Panel' })).toBeInTheDocument();
    });
  });

  describe('Props', () => {
    it('should accept all required props', () => {
      const { container } = render(<LayersPanel {...defaultProps} />);
      expect(container).toBeInTheDocument();
    });
  });
});
