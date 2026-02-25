import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImageGalleryGrid } from './image-gallery-grid';
import type { GeneratedImageWithMeta } from '@/lib/image-studio';
import { PROMPT_TEMPLATES } from '@/lib/image-studio';

// Mock ScrollArea to just render children
jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'scroll-area' }, children),
}));

// Mock Skeleton
jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) =>
    React.createElement('div', { 'data-testid': 'skeleton', className }),
}));

// Mock Badge
jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: { children: React.ReactNode; variant?: string; className?: string }) =>
    React.createElement('span', { 'data-testid': `badge-${variant || 'default'}`, className }, children),
}));

// Mock Card
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) =>
    React.createElement('div', { 'data-testid': 'card', className, onClick }, children),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('div', { 'data-testid': 'card-content', className }, children),
}));

// Mock DropdownMenu
jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'dropdown-content' }, children),
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) =>
    React.createElement('button', { 'data-testid': 'dropdown-item', onClick }, children),
  DropdownMenuSeparator: () => React.createElement('hr'),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => children,
}));

const createMockImage = (overrides: Partial<GeneratedImageWithMeta> = {}): GeneratedImageWithMeta => ({
  id: 'img-1',
  url: 'https://example.com/image.png',
  prompt: 'A test prompt',
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
  images: [] as GeneratedImageWithMeta[],
  selectedImageId: null,
  zoomLevel: 2,
  onSelectImage: jest.fn(),
  onToggleFavorite: jest.fn(),
  onPreview: jest.fn(),
  onDownload: jest.fn(),
  onDelete: jest.fn(),
  onEditAction: jest.fn(),
  onApplyTemplate: jest.fn(),
};

describe('ImageGalleryGrid', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Empty State', () => {
    it('should render empty state with template cards when no images', () => {
      render(<ImageGalleryGrid {...defaultProps} />);

      // Should display the empty state title (actual English translations)
      expect(screen.getByText('No images yet')).toBeInTheDocument();
      expect(screen.getByText('Enter a prompt and click Generate to create your first image')).toBeInTheDocument();
    });

    it('should render template cards matching PROMPT_TEMPLATES count', () => {
      render(<ImageGalleryGrid {...defaultProps} />);

      // Each template should be rendered as a button
      for (const template of PROMPT_TEMPLATES) {
        expect(screen.getByText(template.label)).toBeInTheDocument();
      }
    });

    it('should call onApplyTemplate when a template card is clicked', () => {
      render(<ImageGalleryGrid {...defaultProps} />);

      const firstTemplate = PROMPT_TEMPLATES[0];
      const templateButton = screen.getByText(firstTemplate.label).closest('button');
      expect(templateButton).toBeInTheDocument();
      fireEvent.click(templateButton!);

      expect(defaultProps.onApplyTemplate).toHaveBeenCalledWith(firstTemplate.prompt);
    });

    it('should render random inspiration button', () => {
      render(<ImageGalleryGrid {...defaultProps} />);

      expect(screen.getByText('Random Inspiration')).toBeInTheDocument();
    });

    it('should call onApplyTemplate with a random prompt when random inspiration is clicked', () => {
      render(<ImageGalleryGrid {...defaultProps} />);

      fireEvent.click(screen.getByText('Random Inspiration'));

      expect(defaultProps.onApplyTemplate).toHaveBeenCalledTimes(1);
      // Should be called with one of the PROMPT_TEMPLATES prompts
      const calledWith = defaultProps.onApplyTemplate.mock.calls[0][0];
      const validPrompts = PROMPT_TEMPLATES.map((t) => t.prompt);
      expect(validPrompts).toContain(calledWith);
    });
  });

  describe('Grid with images', () => {
    const images = [
      createMockImage({ id: 'img-1', prompt: 'First image', model: 'dall-e-3' }),
      createMockImage({ id: 'img-2', prompt: 'Second image', model: 'gpt-image-1', isFavorite: true }),
    ];

    it('should render image cards', () => {
      render(<ImageGalleryGrid {...defaultProps} images={images} />);

      const cards = screen.getAllByTestId('card');
      expect(cards.length).toBeGreaterThanOrEqual(2);
    });

    it('should render model badge on each card', () => {
      render(<ImageGalleryGrid {...defaultProps} images={images} />);

      expect(screen.getByText('dall-e-3')).toBeInTheDocument();
      expect(screen.getByText('gpt-image-1')).toBeInTheDocument();
    });

    it('should render size badge with × separator', () => {
      render(<ImageGalleryGrid {...defaultProps} images={images} />);

      // 1024x1024 should be displayed as 1024×1024
      const sizeBadges = screen.getAllByText('1024×1024');
      expect(sizeBadges.length).toBeGreaterThanOrEqual(2);
    });

    it('should render version badge for images with parentId', () => {
      const versionedImages = [
        createMockImage({ id: 'img-1', parentId: 'parent-1', version: 3 }),
      ];
      render(<ImageGalleryGrid {...defaultProps} images={versionedImages} />);

      expect(screen.getByText('v3')).toBeInTheDocument();
    });

    it('should NOT render version badge for images without parentId', () => {
      const images = [createMockImage({ id: 'img-1' })];
      render(<ImageGalleryGrid {...defaultProps} images={images} />);

      expect(screen.queryByText(/^v\d+$/)).not.toBeInTheDocument();
    });

    it('should call onSelectImage when a card is clicked', () => {
      render(<ImageGalleryGrid {...defaultProps} images={images} />);

      const cards = screen.getAllByTestId('card');
      fireEvent.click(cards[0]);

      expect(defaultProps.onSelectImage).toHaveBeenCalledWith('img-1');
    });

    it('should show prompt text in card content with tooltip', () => {
      render(<ImageGalleryGrid {...defaultProps} images={images} />);

      expect(screen.getAllByText('First image').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Generation Skeleton', () => {
    it('should render skeleton card when isGenerating is true', () => {
      const images = [createMockImage()];
      render(
        <ImageGalleryGrid
          {...defaultProps}
          images={images}
          isGenerating={true}
          generatingPrompt="A test generation"
        />
      );

      expect(screen.getByTestId('skeleton')).toBeInTheDocument();
      expect(screen.getByText('A test generation')).toBeInTheDocument();
      expect(screen.getByText('Generating...')).toBeInTheDocument();
    });

    it('should NOT render skeleton when isGenerating is false', () => {
      const images = [createMockImage()];
      render(<ImageGalleryGrid {...defaultProps} images={images} isGenerating={false} />);

      expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();
    });

    it('should render cancel button when onCancelGeneration is provided', () => {
      const onCancel = jest.fn();
      const images = [createMockImage()];
      render(
        <ImageGalleryGrid
          {...defaultProps}
          images={images}
          isGenerating={true}
          generatingPrompt="test"
          onCancelGeneration={onCancel}
        />
      );

      const cancelBtn = screen.getByText('Cancel');
      fireEvent.click(cancelBtn);
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('i18n', () => {
    it('should use translated tooltip strings', () => {
      const images = [createMockImage()];
      render(<ImageGalleryGrid {...defaultProps} images={images} />);

      // Tooltip contents should use actual English translations
      expect(screen.getByText('Add to favorites')).toBeInTheDocument();
      expect(screen.getByText('Preview')).toBeInTheDocument();
      expect(screen.getByText('Download')).toBeInTheDocument();
    });

    it('should show removeFromFavorites for favorited images', () => {
      const images = [createMockImage({ isFavorite: true })];
      render(<ImageGalleryGrid {...defaultProps} images={images} />);

      expect(screen.getByText('Remove from favorites')).toBeInTheDocument();
    });
  });
});
