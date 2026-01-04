/**
 * Unit tests for DocumentFormatToolbar component
 * Note: Icon-only buttons don't have accessible names, so we test by position/structure
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { DocumentFormatToolbar, type FormatState } from './document-format-toolbar';

const messages = {
  document: {
    undo: 'Undo',
    redo: 'Redo',
    bold: 'Bold',
    italic: 'Italic',
    underline: 'Underline',
    strikethrough: 'Strikethrough',
    fontColor: 'Font Color',
    highlightColor: 'Highlight Color',
    alignLeft: 'Align Left',
    alignCenter: 'Align Center',
    alignRight: 'Align Right',
    alignJustify: 'Justify',
    bulletList: 'Bullet List',
    numberedList: 'Numbered List',
    decreaseIndent: 'Decrease Indent',
    increaseIndent: 'Increase Indent',
    heading1: 'Heading 1',
    heading2: 'Heading 2',
    heading3: 'Heading 3',
    normalText: 'Normal Text',
    quote: 'Quote',
    codeBlock: 'Code Block',
    insert: 'Insert',
    insertLink: 'Link',
    insertImage: 'Image',
    insertTable: 'Table',
    horizontalLine: 'Horizontal Line',
    pageBreak: 'Page Break',
  },
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('DocumentFormatToolbar', () => {
  const mockOnFormatAction = jest.fn();
  const mockOnFontSizeChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { container } = renderWithProviders(
        <DocumentFormatToolbar onFormatAction={mockOnFormatAction} />
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render multiple buttons', () => {
      renderWithProviders(
        <DocumentFormatToolbar onFormatAction={mockOnFormatAction} />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(10);
    });

    it('should render font family selector when not compact', () => {
      renderWithProviders(
        <DocumentFormatToolbar 
          onFormatAction={mockOnFormatAction}
          compact={false}
        />
      );

      const comboboxes = screen.getAllByRole('combobox');
      expect(comboboxes.length).toBe(2); // Font family and font size
    });

    it('should hide font family selector in compact mode', () => {
      renderWithProviders(
        <DocumentFormatToolbar 
          onFormatAction={mockOnFormatAction}
          compact={true}
        />
      );

      const comboboxes = screen.getAllByRole('combobox');
      expect(comboboxes.length).toBe(1); // Only font size
    });

    it('should apply custom className', () => {
      const { container } = renderWithProviders(
        <DocumentFormatToolbar 
          onFormatAction={mockOnFormatAction}
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should render insert dropdown trigger with text', () => {
      renderWithProviders(
        <DocumentFormatToolbar onFormatAction={mockOnFormatAction} />
      );

      expect(screen.getByText(/insert/i)).toBeInTheDocument();
    });

    it('should render separators', () => {
      renderWithProviders(
        <DocumentFormatToolbar onFormatAction={mockOnFormatAction} />
      );

      const separators = screen.getAllByRole('none');
      expect(separators.length).toBeGreaterThan(0);
    });
  });

  describe('Format Actions', () => {
    it('should call onFormatAction when buttons are clicked', async () => {
      renderWithProviders(
        <DocumentFormatToolbar onFormatAction={mockOnFormatAction} />
      );

      const buttons = screen.getAllByRole('button');
      // Click the first few icon buttons (skip dropdowns)
      await userEvent.click(buttons[0]); // undo
      expect(mockOnFormatAction).toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    it('should disable buttons when disabled is true', () => {
      renderWithProviders(
        <DocumentFormatToolbar 
          onFormatAction={mockOnFormatAction}
          disabled={true}
        />
      );

      const buttons = screen.getAllByRole('button');
      // Check first button is disabled
      expect(buttons[0]).toBeDisabled();
    });

    it('should not call onFormatAction when disabled', async () => {
      renderWithProviders(
        <DocumentFormatToolbar 
          onFormatAction={mockOnFormatAction}
          disabled={true}
        />
      );

      const buttons = screen.getAllByRole('button');
      await userEvent.click(buttons[0]);

      expect(mockOnFormatAction).not.toHaveBeenCalled();
    });
  });

  describe('Font Size Changes', () => {
    it('should render font size selector', () => {
      renderWithProviders(
        <DocumentFormatToolbar 
          onFormatAction={mockOnFormatAction}
          onFontSizeChange={mockOnFontSizeChange}
        />
      );

      const comboboxes = screen.getAllByRole('combobox');
      expect(comboboxes.length).toBeGreaterThan(0);
    });
  });

  describe('Format State', () => {
    it('should apply active class to buttons based on formatState', () => {
      const formatState: FormatState = { bold: true };
      const { container } = renderWithProviders(
        <DocumentFormatToolbar 
          onFormatAction={mockOnFormatAction}
          formatState={formatState}
        />
      );

      // Check that at least one button has the active class
      const activeButtons = container.querySelectorAll('.bg-accent');
      expect(activeButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Dropdown Menus', () => {
    it('should render insert dropdown trigger', () => {
      renderWithProviders(
        <DocumentFormatToolbar onFormatAction={mockOnFormatAction} />
      );

      const insertButton = screen.getByText(/insert/i);
      expect(insertButton).toBeInTheDocument();
    });
  });
});
