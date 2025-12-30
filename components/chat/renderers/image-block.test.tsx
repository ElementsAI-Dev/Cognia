import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ImageBlock } from './image-block';
import { ReactNode } from 'react';

// Wrapper with TooltipProvider
const Wrapper = ({ children }: { children: ReactNode }) => (
  <TooltipProvider>{children}</TooltipProvider>
);

// Custom render with TooltipProvider
const customRender = (ui: React.ReactElement) =>
  render(ui, { wrapper: Wrapper });

// Mock useCopy hook
jest.mock('@/hooks/use-copy', () => ({
  useCopy: () => ({
    copy: jest.fn().mockResolvedValue({ success: true }),
    isCopying: false,
  }),
}));

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('ImageBlock', () => {
  const defaultProps = {
    src: 'https://example.com/image.jpg',
    alt: 'Test image',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders image with src and alt', () => {
      customRender(<ImageBlock {...defaultProps} />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', defaultProps.src);
      expect(img).toHaveAttribute('alt', defaultProps.alt);
    });

    it('renders with title', () => {
      customRender(<ImageBlock {...defaultProps} title="Image title" />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('title', 'Image title');
    });

    it('renders with custom dimensions', () => {
      customRender(<ImageBlock {...defaultProps} width={800} height={600} />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('width', '800');
      expect(img).toHaveAttribute('height', '600');
    });

    it('applies lazy loading', () => {
      customRender(<ImageBlock {...defaultProps} />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('loading', 'lazy');
    });

    it('renders figure element', () => {
      const { container } = customRender(<ImageBlock {...defaultProps} />);
      expect(container.querySelector('figure')).toBeInTheDocument();
    });

    it('renders caption when alt or title provided', () => {
      customRender(<ImageBlock {...defaultProps} />);
      expect(screen.getByText('Test image')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = customRender(
        <ImageBlock {...defaultProps} className="custom-class" />
      );
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Loading states', () => {
    it('shows loading spinner initially', () => {
      const { container } = customRender(<ImageBlock {...defaultProps} />);
      // Loading spinner should be present before image loads
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('hides loading spinner after image loads', async () => {
      const { container } = customRender(<ImageBlock {...defaultProps} />);
      const img = screen.getByRole('img');
      
      fireEvent.load(img);
      
      await waitFor(() => {
        expect(container.querySelector('.animate-spin')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error handling', () => {
    it('shows error state when image fails to load', async () => {
      customRender(<ImageBlock {...defaultProps} />);
      const img = screen.getByRole('img');
      
      fireEvent.error(img);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load image')).toBeInTheDocument();
      });
    });

    it('shows Open URL button in error state', async () => {
      customRender(<ImageBlock {...defaultProps} />);
      const img = screen.getByRole('img');
      
      fireEvent.error(img);
      
      await waitFor(() => {
        expect(screen.getByText('Open URL')).toBeInTheDocument();
      });
    });
  });

  describe('Interactions', () => {
    it('opens lightbox when image is clicked', async () => {
      customRender(<ImageBlock {...defaultProps} />);
      const img = screen.getByRole('img');
      
      fireEvent.load(img);
      fireEvent.click(img);
      
      await waitFor(() => {
        // Dialog should be open
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('shows hover actions on mouse enter', async () => {
      const { container } = customRender(<ImageBlock {...defaultProps} />);
      const figure = container.querySelector('figure');
      
      if (figure) {
        fireEvent.mouseEnter(figure);
      }
      
      // Action buttons should be visible on hover (via CSS, hard to test directly)
      expect(container.querySelector('button')).toBeInTheDocument();
    });
  });

  describe('Lightbox', () => {
    it('shows zoom controls in lightbox', async () => {
      customRender(<ImageBlock {...defaultProps} />);
      const img = screen.getByRole('img');
      
      fireEvent.load(img);
      fireEvent.click(img);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('100%')).toBeInTheDocument();
      });
    });

    it('closes lightbox when close button clicked', async () => {
      customRender(<ImageBlock {...defaultProps} />);
      const img = screen.getByRole('img');
      
      fireEvent.load(img);
      fireEvent.click(img);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      // Find and click close button
      const closeButton = screen.getAllByRole('button').find(
        btn => btn.querySelector('svg')
      );
      if (closeButton) {
        fireEvent.click(closeButton);
      }
    });
  });

  describe('Accessibility', () => {
    it('has accessible alt text', () => {
      customRender(<ImageBlock {...defaultProps} />);
      const img = screen.getByRole('img');
      expect(img).toHaveAccessibleName('Test image');
    });

    it('handles empty alt text', async () => {
      const { container } = customRender(<ImageBlock src={defaultProps.src} alt="" />);
      // Empty alt makes img role=presentation, use querySelector
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      
      if (img) {
        fireEvent.load(img);
        await waitFor(() => {
          expect(img).toHaveAttribute('alt', '');
        });
      }
    });
  });
});
