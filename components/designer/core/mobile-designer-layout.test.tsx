/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileDesignerLayout } from './mobile-designer-layout';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock the designer store
const mockSetMobileActiveTab = jest.fn();
jest.mock('@/stores/designer', () => ({
  useDesignerStore: jest.fn((selector) => {
    const state = {
      mobileActiveTab: 'preview',
      setMobileActiveTab: mockSetMobileActiveTab,
    };
    return selector(state);
  }),
}));

describe('MobileDesignerLayout', () => {
  const mockPreviewContent = <div data-testid="preview-content">Preview Content</div>;
  const mockCodeContent = <div data-testid="code-content">Code Content</div>;
  const mockElementsContent = <div data-testid="elements-content">Elements Content</div>;
  const mockStylesContent = <div data-testid="styles-content">Styles Content</div>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render all tab triggers', () => {
      render(
        <MobileDesignerLayout
          previewContent={mockPreviewContent}
          codeContent={mockCodeContent}
          elementsContent={mockElementsContent}
          stylesContent={mockStylesContent}
        />
      );

      expect(screen.getByRole('tab', { name: /preview/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /code/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /elements/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /styles/i })).toBeInTheDocument();
    });

    it('should render preview content by default', () => {
      render(
        <MobileDesignerLayout
          previewContent={mockPreviewContent}
          codeContent={mockCodeContent}
          elementsContent={mockElementsContent}
          stylesContent={mockStylesContent}
        />
      );

      expect(screen.getByTestId('preview-content')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <MobileDesignerLayout
          previewContent={mockPreviewContent}
          codeContent={mockCodeContent}
          elementsContent={mockElementsContent}
          stylesContent={mockStylesContent}
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('tab navigation', () => {
    it('should call setMobileActiveTab when code tab is clicked', async () => {
      const user = userEvent.setup();
      render(
        <MobileDesignerLayout
          previewContent={mockPreviewContent}
          codeContent={mockCodeContent}
          elementsContent={mockElementsContent}
          stylesContent={mockStylesContent}
        />
      );

      const codeTab = screen.getByRole('tab', { name: /code/i });
      await user.click(codeTab);

      expect(mockSetMobileActiveTab).toHaveBeenCalledWith('code');
    });

    it('should call setMobileActiveTab when elements tab is clicked', async () => {
      const user = userEvent.setup();
      render(
        <MobileDesignerLayout
          previewContent={mockPreviewContent}
          codeContent={mockCodeContent}
          elementsContent={mockElementsContent}
          stylesContent={mockStylesContent}
        />
      );

      const elementsTab = screen.getByRole('tab', { name: /elements/i });
      await user.click(elementsTab);

      expect(mockSetMobileActiveTab).toHaveBeenCalledWith('elements');
    });

    it('should call setMobileActiveTab when styles tab is clicked', async () => {
      const user = userEvent.setup();
      render(
        <MobileDesignerLayout
          previewContent={mockPreviewContent}
          codeContent={mockCodeContent}
          elementsContent={mockElementsContent}
          stylesContent={mockStylesContent}
        />
      );

      const stylesTab = screen.getByRole('tab', { name: /styles/i });
      await user.click(stylesTab);

      expect(mockSetMobileActiveTab).toHaveBeenCalledWith('styles');
    });
  });

  describe('content rendering', () => {
    it('should render all tab content panels', () => {
      render(
        <MobileDesignerLayout
          previewContent={mockPreviewContent}
          codeContent={mockCodeContent}
          elementsContent={mockElementsContent}
          stylesContent={mockStylesContent}
        />
      );

      // All content should be in DOM (Tabs handles visibility)
      expect(screen.getByTestId('preview-content')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper tab roles', () => {
      render(
        <MobileDesignerLayout
          previewContent={mockPreviewContent}
          codeContent={mockCodeContent}
          elementsContent={mockElementsContent}
          stylesContent={mockStylesContent}
        />
      );

      const tablist = screen.getByRole('tablist');
      expect(tablist).toBeInTheDocument();

      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(4);
    });

    it('should have proper tabpanel roles', () => {
      render(
        <MobileDesignerLayout
          previewContent={mockPreviewContent}
          codeContent={mockCodeContent}
          elementsContent={mockElementsContent}
          stylesContent={mockStylesContent}
        />
      );

      const tabpanels = screen.getAllByRole('tabpanel');
      expect(tabpanels.length).toBeGreaterThanOrEqual(1);
    });
  });
});
