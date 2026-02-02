/**
 * Tests for BeautifulExportDialog component and custom theme integration
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { BeautifulExportDialog } from './beautiful-export-dialog';
import { getSyntaxTheme, type SyntaxTheme } from '@/lib/export/html/syntax-themes';
import type { Session } from '@/types';

// Mock the message repository
jest.mock('@/lib/db', () => ({
  messageRepository: {
    getBySessionId: jest.fn().mockResolvedValue([
      {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        createdAt: new Date(),
        tokens: { total: 10 },
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: 'Hi there!',
        createdAt: new Date(),
        tokens: { total: 20 },
      },
    ]),
  },
}));

// Mock exports
jest.mock('@/lib/export', () => ({
  exportToBeautifulHTML: jest.fn().mockReturnValue('<!DOCTYPE html>'),
  downloadFile: jest.fn(),
  generateFilename: jest.fn().mockReturnValue('test.html'),
}));

jest.mock('@/lib/export/html/beautiful-html', () => ({
  exportToBeautifulHTML: jest.fn().mockReturnValue('<!DOCTYPE html>'),
}));

jest.mock('@/lib/export/document/beautiful-pdf', () => ({
  exportToBeautifulPDF: jest.fn().mockResolvedValue(undefined),
}));

// Mock custom theme store
jest.mock('@/stores/settings', () => ({
  useCustomThemeStore: () => ({
    customThemes: [],
    deleteTheme: jest.fn(),
  }),
}));

// Mock sub-components
jest.mock('./custom-theme-editor', () => ({
  CustomThemeEditor: () => null,
}));

jest.mock('./social-share-dialog', () => ({
  SocialShareDialog: () => <button>Share</button>,
}));

jest.mock('./image-export-dialog', () => ({
  ImageExportDialog: () => <button>Image</button>,
}));

const mockSession = {
  id: 'test-session',
  title: 'Test Conversation',
  provider: 'openai',
  model: 'gpt-4',
  mode: 'chat',
  createdAt: new Date(),
  updatedAt: new Date(),
} as Session;

const messages = {
  export: {
    title: 'Export Conversation',
    description: 'Choose format and customize export options',
    exportNow: 'Export',
    format: 'Format',
    options: 'Options',
    theme: 'Theme',
    light: 'Light',
    dark: 'Dark',
    auto: 'Auto',
    display: 'Display',
    showTimestamps: 'Show Timestamps',
    showTimestampsDesc: 'Include message timestamps',
    showTokenCount: 'Show Token Count',
    showTokenCountDesc: 'Display token usage',
    showThinking: 'Show Thinking',
    showThinkingDesc: 'Include AI thinking process',
    showToolCalls: 'Show Tool Calls',
    showToolCallsDesc: 'Include tool call details',
    document: 'Document',
    coverPage: 'Cover Page',
    coverPageDesc: 'Include a cover page',
    tableOfContents: 'Table of Contents',
    tableOfContentsDesc: 'Generate table of contents',
    codeTheme: 'Code Theme',
    custom: 'Custom',
    yourThemes: 'Your Themes',
    builtInThemes: 'Built-in Themes',
    moreThemes: '+{count} more themes',
    syntaxHighlighting: 'Syntax Highlighting',
    syntaxHighlightingDesc: 'Highlight code blocks',
    compactMode: 'Compact Mode',
    compactModeDesc: 'Reduce spacing',
    exportSummary: 'Export Summary',
    messages: 'Messages',
    tokens: 'Tokens',
    user: 'User',
    assistant: 'Assistant',
    preview: 'Preview',
    previewNotAvailable: 'Preview not available',
    exportToSeeResult: 'Export to see result',
    cancel: 'Cancel',
    exporting: 'Exporting...',
    exportFormat: 'Export {ext}',
    exportedAs: 'Exported as {format}',
    share: 'Share',
    imageFormatShare: 'Image',
    openInGoogleSheets: 'Open in Google Sheets',
    googleSheetsHint: 'Export CSV and open in Google Sheets',
    wordOptions: 'Word Options',
  },
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

// Sample custom theme for testing
const customTheme: SyntaxTheme = {
  name: 'my-custom-theme',
  displayName: 'My Custom Theme',
  isDark: true,
  colors: {
    background: '#1a1a1a',
    foreground: '#ffffff',
    comment: '#888888',
    keyword: '#ff6b6b',
    string: '#98c379',
    number: '#d19a66',
    function: '#61afef',
    operator: '#56b6c2',
    property: '#e06c75',
    className: '#e5c07b',
    constant: '#d19a66',
    tag: '#e06c75',
    attrName: '#d19a66',
    attrValue: '#98c379',
    punctuation: '#abb2bf',
    selection: 'rgba(97, 175, 239, 0.3)',
    lineHighlight: '#2c313c',
  },
};

describe('BeautifulExportDialog Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render trigger button', () => {
    renderWithProviders(<BeautifulExportDialog session={mockSession} />);
    
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('should render custom trigger when provided', () => {
    renderWithProviders(
      <BeautifulExportDialog
        session={mockSession}
        trigger={<button data-testid="custom-trigger">Custom Export</button>}
      />
    );
    
    expect(screen.getByTestId('custom-trigger')).toBeInTheDocument();
  });

  it('should open dialog when trigger is clicked', async () => {
    renderWithProviders(<BeautifulExportDialog session={mockSession} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(screen.getByText('Export Conversation')).toBeInTheDocument();
    });
  });

  it('should display format and options tabs', async () => {
    renderWithProviders(<BeautifulExportDialog session={mockSession} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(screen.getByText('Format')).toBeInTheDocument();
      expect(screen.getByText('Options')).toBeInTheDocument();
    });
  });

  it('should display export summary after loading messages', async () => {
    renderWithProviders(<BeautifulExportDialog session={mockSession} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(screen.getByText('Export Summary')).toBeInTheDocument();
    });
  });

  it('should display preview section', async () => {
    renderWithProviders(<BeautifulExportDialog session={mockSession} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(screen.getByText('Preview')).toBeInTheDocument();
    });
  });

  it('should have Cancel button', async () => {
    renderWithProviders(<BeautifulExportDialog session={mockSession} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  it('should have Share and Image buttons', async () => {
    renderWithProviders(<BeautifulExportDialog session={mockSession} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(screen.getByText('Share')).toBeInTheDocument();
      expect(screen.getByText('Image')).toBeInTheDocument();
    });
  });
});

describe('Custom theme integration with export', () => {
  describe('getSyntaxTheme with custom themes', () => {
    it('should return custom theme when name matches', () => {
      const result = getSyntaxTheme('my-custom-theme', [customTheme]);
      
      expect(result.name).toBe('my-custom-theme');
      expect(result.displayName).toBe('My Custom Theme');
      expect(result.colors.background).toBe('#1a1a1a');
    });

    it('should prefer built-in theme over custom with same name', () => {
      const conflictingTheme: SyntaxTheme = {
        ...customTheme,
        name: 'monokai', // Same as built-in
        displayName: 'Fake Monokai',
      };

      const result = getSyntaxTheme('monokai', [conflictingTheme]);
      
      // Should return built-in, not custom
      expect(result.displayName).toBe('Monokai');
    });

    it('should fallback to default when custom theme not found', () => {
      const result = getSyntaxTheme('non-existent', [customTheme]);
      
      expect(result.name).toBe('one-dark-pro');
    });

    it('should work with empty custom themes array', () => {
      const result = getSyntaxTheme('monokai', []);
      
      expect(result.name).toBe('monokai');
    });

    it('should work when customThemes is undefined', () => {
      const result = getSyntaxTheme('dracula');
      
      expect(result.name).toBe('dracula');
    });
  });

  describe('Custom theme structure validation', () => {
    it('should have all required color properties', () => {
      const requiredColors = [
        'background', 'foreground', 'comment', 'keyword', 'string',
        'number', 'function', 'operator', 'property', 'className',
        'constant', 'tag', 'attrName', 'attrValue', 'punctuation',
        'selection', 'lineHighlight'
      ];

      requiredColors.forEach(color => {
        expect(customTheme.colors[color as keyof typeof customTheme.colors]).toBeDefined();
      });
    });

    it('should have required metadata fields', () => {
      expect(customTheme.name).toBeDefined();
      expect(customTheme.displayName).toBeDefined();
      expect(typeof customTheme.isDark).toBe('boolean');
    });
  });

  describe('Multiple custom themes', () => {
    const multipleThemes: SyntaxTheme[] = [
      customTheme,
      {
        name: 'another-theme',
        displayName: 'Another Theme',
        isDark: false,
        colors: {
          background: '#ffffff',
          foreground: '#000000',
          comment: '#666666',
          keyword: '#0000ff',
          string: '#008000',
          number: '#ff0000',
          function: '#800080',
          operator: '#000000',
          property: '#0000ff',
          className: '#2b91af',
          constant: '#2b91af',
          tag: '#800000',
          attrName: '#ff0000',
          attrValue: '#0000ff',
          punctuation: '#000000',
          selection: 'rgba(0, 0, 255, 0.2)',
          lineHighlight: '#f0f0f0',
        },
      },
    ];

    it('should find correct theme from multiple custom themes', () => {
      const result1 = getSyntaxTheme('my-custom-theme', multipleThemes);
      const result2 = getSyntaxTheme('another-theme', multipleThemes);

      expect(result1.displayName).toBe('My Custom Theme');
      expect(result2.displayName).toBe('Another Theme');
    });

    it('should return first matching theme', () => {
      const duplicateThemes: SyntaxTheme[] = [
        { ...customTheme, displayName: 'First' },
        { ...customTheme, displayName: 'Second' },
      ];

      const result = getSyntaxTheme('my-custom-theme', duplicateThemes);
      expect(result.displayName).toBe('First');
    });
  });
});

describe('Export options with custom themes', () => {
  it('should correctly structure options with customThemes', () => {
    const exportOptions = {
      theme: 'dark' as const,
      syntaxTheme: 'my-custom-theme',
      customThemes: [customTheme],
      showTimestamps: true,
      showTokens: false,
    };

    // Verify the theme can be resolved
    const resolvedTheme = getSyntaxTheme(
      exportOptions.syntaxTheme,
      exportOptions.customThemes
    );

    expect(resolvedTheme.name).toBe('my-custom-theme');
    expect(resolvedTheme.colors.background).toBe('#1a1a1a');
  });

  it('should handle fallback when custom theme is deleted', () => {
    const exportOptions = {
      syntaxTheme: 'deleted-theme',
      customThemes: [customTheme], // doesn't include 'deleted-theme'
    };

    const resolvedTheme = getSyntaxTheme(
      exportOptions.syntaxTheme,
      exportOptions.customThemes
    );

    // Should fallback to default
    expect(resolvedTheme.name).toBe('one-dark-pro');
  });
});
