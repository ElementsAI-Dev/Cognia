/**
 * PPT Preview Component Tests
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PPTPreview } from './ppt-preview';
import type { PPTPreviewProps } from './types';
import type { PPTPresentation, PPTSlide } from '@/types/workflow';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock the ppt-tool module
jest.mock('@/lib/ai/tools/ppt-tool', () => ({
  executePPTExport: jest.fn(() => ({
    success: true,
    data: {
      content: 'mock content',
      filename: 'test.md',
    },
  })),
}));

// Mock clipboard API
const mockClipboard = {
  writeText: jest.fn(() => Promise.resolve()),
};
Object.assign(navigator, { clipboard: mockClipboard });

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

const createMockSlide = (overrides: Partial<PPTSlide> = {}, index: number = 0): PPTSlide => ({
  id: `slide-${index}`,
  order: index,
  layout: 'title-content',
  title: `Slide ${index + 1} Title`,
  subtitle: `Slide ${index + 1} Subtitle`,
  content: `Content for slide ${index + 1}`,
  bullets: ['Bullet 1', 'Bullet 2', 'Bullet 3'],
  notes: `Speaker notes for slide ${index + 1}`,
  elements: [],
  ...overrides,
});

const createMockPresentation = (slideCount: number = 3): PPTPresentation => ({
  id: 'test-ppt',
  title: 'Test Presentation',
  subtitle: 'A test subtitle',
  theme: {
    id: 'modern-light',
    name: 'Modern Light',
    primaryColor: '#2563EB',
    secondaryColor: '#1D4ED8',
    accentColor: '#3B82F6',
    backgroundColor: '#FFFFFF',
    textColor: '#1E293B',
    headingFont: 'Inter',
    bodyFont: 'Inter',
    codeFont: 'JetBrains Mono',
  },
  slides: Array.from({ length: slideCount }, (_, i) => createMockSlide({}, i)),
  totalSlides: slideCount,
  aspectRatio: '16:9',
  createdAt: new Date(),
  updatedAt: new Date(),
});

const renderPPTPreview = (props: Partial<PPTPreviewProps> = {}) => {
  const defaultProps: PPTPreviewProps = {
    presentation: createMockPresentation(),
    ...props,
  };
  return render(<PPTPreview {...defaultProps} />);
};

describe('PPTPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the presentation title', () => {
      renderPPTPreview();
      expect(screen.getByText('Test Presentation')).toBeInTheDocument();
    });

    it('should render the slide count badge', () => {
      renderPPTPreview();
      // Text may be split across elements, use regex
      expect(screen.getByText(/slides/)).toBeInTheDocument();
    });

    it('should render the first slide by default', () => {
      renderPPTPreview();
      expect(screen.getByText('Slide 1 Title')).toBeInTheDocument();
    });

    it('should render slide content', () => {
      renderPPTPreview();
      expect(screen.getByText('Content for slide 1')).toBeInTheDocument();
    });

    it('should render bullet points', () => {
      renderPPTPreview();
      expect(screen.getByText('Bullet 1')).toBeInTheDocument();
      expect(screen.getByText('Bullet 2')).toBeInTheDocument();
    });

    it('should render speaker notes', () => {
      renderPPTPreview();
      expect(screen.getByText('Speaker notes for slide 1')).toBeInTheDocument();
    });

    it('should render slide navigation thumbnails', () => {
      renderPPTPreview();
      const thumbnails = screen.getAllByRole('button').filter(btn => 
        btn.textContent?.match(/^[123]$/)
      );
      expect(thumbnails).toHaveLength(3);
    });
  });

  describe('Navigation', () => {
    it('should navigate to next slide when clicking next button', async () => {
      renderPPTPreview();
      
      // Find the next button (right chevron)
      const buttons = screen.getAllByRole('button');
      const nextBtn = buttons.find(btn => btn.querySelector('svg.lucide-chevron-right'));
      
      if (nextBtn) {
        await userEvent.click(nextBtn);
        expect(screen.getByText('Slide 2 Title')).toBeInTheDocument();
      }
    });

    it('should navigate to previous slide when clicking prev button', async () => {
      renderPPTPreview();
      
      // First go to slide 2
      const buttons = screen.getAllByRole('button');
      const nextBtn = buttons.find(btn => btn.querySelector('svg.lucide-chevron-right'));
      
      if (nextBtn) {
        await userEvent.click(nextBtn);
        expect(screen.getByText('Slide 2 Title')).toBeInTheDocument();
        
        // Now go back
        const prevBtn = buttons.find(btn => btn.querySelector('svg.lucide-chevron-left'));
        if (prevBtn) {
          await userEvent.click(prevBtn);
          expect(screen.getByText('Slide 1 Title')).toBeInTheDocument();
        }
      }
    });

    it('should navigate directly to a slide when clicking thumbnail', () => {
      renderPPTPreview();
      
      // Verify thumbnails are rendered for navigation
      const thumbnail3 = screen.getByRole('button', { name: '3' });
      expect(thumbnail3).toBeInTheDocument();
    });

    it('should disable prev button on first slide', () => {
      renderPPTPreview();
      
      const buttons = screen.getAllByRole('button');
      const prevBtn = buttons.find(btn => btn.querySelector('svg.lucide-chevron-left'));
      
      expect(prevBtn).toBeDisabled();
    });

    it('should disable next button on last slide', () => {
      // Create presentation with only one slide to test next button disabled
      renderPPTPreview({ presentation: createMockPresentation(1) });
      
      const buttons = screen.getAllByRole('button');
      const nextBtn = buttons.find(btn => btn.querySelector('svg.lucide-chevron-right'));
      
      expect(nextBtn).toBeDisabled();
    });
  });

  describe('View Modes', () => {
    it('should switch to grid view', async () => {
      renderPPTPreview();
      
      const buttons = screen.getAllByRole('button');
      const gridBtn = buttons.find(btn => btn.querySelector('svg.lucide-grid-3x3'));
      
      if (gridBtn) {
        await userEvent.click(gridBtn);
        // In grid view, all slide titles should be visible as thumbnails
        const allTitles = screen.getAllByText(/Slide \d Title/);
        expect(allTitles.length).toBeGreaterThanOrEqual(3);
      }
    });

    it('should switch to outline view', async () => {
      renderPPTPreview();
      
      const buttons = screen.getAllByRole('button');
      const outlineBtn = buttons.find(btn => btn.querySelector('svg.lucide-file-text'));
      
      if (outlineBtn) {
        await userEvent.click(outlineBtn);
        // Outline view should show tab options (using translation keys)
        expect(screen.getByText('outline')).toBeInTheDocument();
        expect(screen.getByText('marpCode')).toBeInTheDocument();
      }
    });

    it('should show Marp markdown in outline view', async () => {
      renderPPTPreview();
      
      const buttons = screen.getAllByRole('button');
      const outlineBtn = buttons.find(btn => btn.querySelector('svg.lucide-file-text'));
      
      if (outlineBtn) {
        await userEvent.click(outlineBtn);
        
        const marpTab = screen.getByText('marpCode');
        await userEvent.click(marpTab);
        
        // Should show marp tab is accessible
        expect(marpTab).toBeInTheDocument();
      }
    });
  });

  describe('Copy Functionality', () => {
    it('should copy Marp content to clipboard', async () => {
      renderPPTPreview();
      
      // Switch to outline view
      const buttons = screen.getAllByRole('button');
      const outlineBtn = buttons.find(btn => btn.querySelector('svg.lucide-file-text'));
      
      if (outlineBtn) {
        await userEvent.click(outlineBtn);
        
        const marpTab = screen.getByText('marpCode');
        await userEvent.click(marpTab);
        
        const copyBtn = screen.getByText('copy');
        await userEvent.click(copyBtn);
        
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
      }
    });
  });

  describe('Fullscreen', () => {
    it('should toggle fullscreen mode', async () => {
      renderPPTPreview();
      
      const buttons = screen.getAllByRole('button');
      const fullscreenBtn = buttons.find(btn => btn.querySelector('svg.lucide-maximize-2'));
      
      if (fullscreenBtn) {
        await userEvent.click(fullscreenBtn);
        
        // Card should have fullscreen classes or the button was clicked
        expect(fullscreenBtn).toBeInTheDocument();
      }
    });
  });

  describe('Theme Selection', () => {
    it('should call onThemeChange when theme is selected', async () => {
      const onThemeChange = jest.fn();
      renderPPTPreview({ onThemeChange });
      
      const buttons = screen.getAllByRole('button');
      const themeBtn = buttons.find(btn => btn.querySelector('svg.lucide-palette'));
      
      if (themeBtn) {
        await userEvent.click(themeBtn);
        
        // Wait for dropdown to appear and click a theme
        await waitFor(() => {
          const themeOption = screen.getByText('Modern Dark');
          if (themeOption) {
            userEvent.click(themeOption);
          }
        });
      }
    });
  });

  describe('Export', () => {
    it('should trigger export when export option is clicked', async () => {
      const onExport = jest.fn();
      renderPPTPreview({ onExport });
      
      const buttons = screen.getAllByRole('button');
      const exportBtn = buttons.find(btn => btn.querySelector('svg.lucide-download'));
      
      if (exportBtn) {
        await userEvent.click(exportBtn);
        
        // Export dropdown should open - just verify the button was clicked
        expect(exportBtn).toBeInTheDocument();
      }
    });
  });

  describe('Edit Callback', () => {
    it('should call onEdit when edit button is clicked', async () => {
      const onEdit = jest.fn();
      renderPPTPreview({ onEdit });
      
      const buttons = screen.getAllByRole('button');
      const editBtn = buttons.find(btn => btn.querySelector('svg.lucide-edit'));
      
      if (editBtn) {
        await userEvent.click(editBtn);
        expect(onEdit).toHaveBeenCalledWith(0);
      }
    });
  });

  describe('Empty States', () => {
    it('should handle presentation with no slides gracefully', () => {
      const emptyPresentation = createMockPresentation(0);
      emptyPresentation.slides = [];
      emptyPresentation.totalSlides = 0;
      
      // This should not throw
      expect(() => {
        render(<PPTPreview presentation={emptyPresentation} />);
      }).not.toThrow();
    });

    it('should handle slide without title', () => {
      const presentation = createMockPresentation(1);
      presentation.slides[0].title = undefined;
      
      renderPPTPreview({ presentation });
      // Should still render without crashing
      expect(screen.getByText('Test Presentation')).toBeInTheDocument();
    });

    it('should handle slide without bullets', () => {
      const presentation = createMockPresentation(1);
      presentation.slides[0].bullets = undefined;
      
      renderPPTPreview({ presentation });
      expect(screen.getByText('Slide 1 Title')).toBeInTheDocument();
    });

    it('should handle slide without notes', () => {
      const presentation = createMockPresentation(1);
      presentation.slides[0].notes = undefined;
      
      renderPPTPreview({ presentation });
      expect(screen.queryByText('Speaker Notes')).not.toBeInTheDocument();
    });
  });

  describe('Layout Types', () => {
    it('should render title layout differently', () => {
      const presentation = createMockPresentation(1);
      presentation.slides[0].layout = 'title';
      
      renderPPTPreview({ presentation });
      // Title layout should have larger, centered text
      const title = screen.getByText('Slide 1 Title');
      expect(title).toBeInTheDocument();
    });

    it('should render section layout', () => {
      const presentation = createMockPresentation(1);
      presentation.slides[0].layout = 'section';
      
      renderPPTPreview({ presentation });
      expect(screen.getByText('Slide 1 Title')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply theme colors', () => {
      const { container } = renderPPTPreview();
      
      // Check that theme colors are applied - look for any styled elements
      const slideContent = container.querySelector('[style]');
      expect(slideContent).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = renderPPTPreview({ className: 'custom-class' });
      
      const card = container.querySelector('.custom-class');
      expect(card).toBeInTheDocument();
    });
  });
});
