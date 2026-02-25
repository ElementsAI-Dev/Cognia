import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImageDetailView } from './image-detail-view';
import type { GeneratedImageWithMeta } from '@/lib/image-studio';

// Mock LayersPanel
jest.mock('../panels/layers-panel', () => ({
  LayersPanel: () => React.createElement('div', { 'data-testid': 'layers-panel' }, 'LayersPanel'),
}));

const createMockImage = (overrides: Partial<GeneratedImageWithMeta> = {}): GeneratedImageWithMeta => ({
  id: 'img-1',
  url: 'https://example.com/image.png',
  prompt: 'A beautiful sunset',
  model: 'dall-e-3',
  timestamp: Date.now(),
  settings: {
    size: '1024x1024' as const,
    quality: 'standard' as const,
    style: 'vivid' as const,
  },
  isFavorite: false,
  ...overrides,
});

const defaultProps = {
  image: createMockImage(),
  previewZoom: 1,
  previewPan: { x: 0, y: 0 },
  onPreviewZoomChange: jest.fn(),
  onPreviewPanChange: jest.fn(),
  onDownload: jest.fn(),
  onRegenerate: jest.fn(),
  layers: [],
  activeLayerId: null,
  onLayerSelect: jest.fn(),
  onLayerUpdate: jest.fn(),
  onLayerDelete: jest.fn(),
  onLayerDuplicate: jest.fn(),
  onLayerAdd: jest.fn(),
  onLayerReorder: jest.fn(),
  showHistogram: false,
  onShowHistogramChange: jest.fn(),
  histogramData: null,
  isLoadingHistogram: false,
  batchProcessing: {
    isProcessing: false,
    processedCount: 0,
    errorCount: 0,
    progress: 0,
    onPause: jest.fn(),
    onCancel: jest.fn(),
  },
  batchPresetsCount: 0,
};

describe('ImageDetailView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(<ImageDetailView {...defaultProps} />);
    expect(screen.getByText('A beautiful sunset')).toBeInTheDocument();
  });

  it('should display image details', () => {
    render(<ImageDetailView {...defaultProps} />);
    expect(screen.getByText('dall-e-3')).toBeInTheDocument();
    expect(screen.getByText('1024x1024')).toBeInTheDocument();
    expect(screen.getByText('standard')).toBeInTheDocument();
    expect(screen.getByText('vivid')).toBeInTheDocument();
  });

  it('should render download and regenerate buttons', () => {
    render(<ImageDetailView {...defaultProps} />);
    expect(screen.getByText('Download')).toBeInTheDocument();
    expect(screen.getByText('Regenerate')).toBeInTheDocument();
  });

  it('should call onDownload when download button is clicked', () => {
    render(<ImageDetailView {...defaultProps} />);
    fireEvent.click(screen.getByText('Download'));
    expect(defaultProps.onDownload).toHaveBeenCalledWith(defaultProps.image);
  });

  it('should call onRegenerate when regenerate button is clicked', () => {
    render(<ImageDetailView {...defaultProps} />);
    fireEvent.click(screen.getByText('Regenerate'));
    expect(defaultProps.onRegenerate).toHaveBeenCalledWith(defaultProps.image);
  });

  it('should display the image with correct src', () => {
    render(<ImageDetailView {...defaultProps} />);
    const img = screen.getByAltText('A beautiful sunset');
    expect(img).toHaveAttribute('src', 'https://example.com/image.png');
  });

  it('should display noImageToDisplay when url is empty', () => {
    const image = createMockImage({ url: '' });
    render(<ImageDetailView {...defaultProps} image={image} />);
    expect(screen.getByText('No image to display')).toBeInTheDocument();
  });

  describe('Version Timeline', () => {
    it('should NOT render version timeline when image has no parentId', () => {
      render(<ImageDetailView {...defaultProps} />);
      expect(screen.queryByText('Versions')).not.toBeInTheDocument();
    });

    it('should NOT render version timeline when allImages is empty', () => {
      const image = createMockImage({ parentId: 'parent-1' });
      render(<ImageDetailView {...defaultProps} image={image} allImages={[]} />);
      expect(screen.queryByText('Versions')).not.toBeInTheDocument();
    });

    it('should render version timeline when image has parentId and allImages provided', () => {
      const parentImage = createMockImage({ id: 'parent-1', version: 1 });
      const currentImage = createMockImage({ id: 'img-1', parentId: 'parent-1', version: 2 });
      const allImages = [parentImage, currentImage];

      render(
        <ImageDetailView
          {...defaultProps}
          image={currentImage}
          allImages={allImages}
        />
      );

      expect(screen.getByText('Versions')).toBeInTheDocument();
    });

    it('should render version thumbnails as clickable buttons', () => {
      const parentImage = createMockImage({ id: 'parent-1', version: 1, url: 'https://example.com/parent.png' });
      const currentImage = createMockImage({ id: 'child-1', parentId: 'parent-1', version: 2, url: 'https://example.com/child.png' });
      const allImages = [parentImage, currentImage];

      render(
        <ImageDetailView
          {...defaultProps}
          image={currentImage}
          allImages={allImages}
        />
      );

      // Should have version thumbnail images
      const versionImgs = screen.getAllByAltText(/^v\d+$/);
      expect(versionImgs.length).toBeGreaterThanOrEqual(1);
    });

    it('should call onSelectImage when a version thumbnail is clicked', () => {
      const onSelectImage = jest.fn();
      const parentImage = createMockImage({ id: 'parent-1', version: 1 });
      const currentImage = createMockImage({ id: 'child-1', parentId: 'parent-1', version: 2 });
      const allImages = [parentImage, currentImage];

      render(
        <ImageDetailView
          {...defaultProps}
          image={currentImage}
          allImages={allImages}
          onSelectImage={onSelectImage}
        />
      );

      // Click the parent version thumbnail
      const parentThumb = screen.getByAltText('v1');
      fireEvent.click(parentThumb.closest('button')!);

      expect(onSelectImage).toHaveBeenCalledWith('parent-1');
    });
  });

  describe('Zoom Controls', () => {
    it('should call onPreviewZoomChange when zoom in is clicked', () => {
      render(<ImageDetailView {...defaultProps} />);
      const zoomInBtn = screen.getByText('+').closest('button');
      if (zoomInBtn) fireEvent.click(zoomInBtn);
      expect(defaultProps.onPreviewZoomChange).toHaveBeenCalled();
    });

    it('should display current zoom percentage', () => {
      render(<ImageDetailView {...defaultProps} previewZoom={1.5} />);
      expect(screen.getByText('150%')).toBeInTheDocument();
    });
  });

  describe('Copy Prompt', () => {
    it('should render a copy button near the prompt', () => {
      render(<ImageDetailView {...defaultProps} />);
      // The copy button is a small icon button with shrink-0 class
      const buttons = screen.getAllByRole('button');
      const copyBtn = buttons.find((btn) => btn.className.includes('shrink-0'));
      expect(copyBtn).toBeDefined();
    });
  });

  describe('Layers Panel', () => {
    it('should toggle layers panel visibility', () => {
      render(<ImageDetailView {...defaultProps} />);

      const layersBtn = screen.getByText('Show Layers');
      fireEvent.click(layersBtn);

      expect(screen.getByTestId('layers-panel')).toBeInTheDocument();
      expect(screen.getByText('Hide Layers')).toBeInTheDocument();
    });
  });
});
