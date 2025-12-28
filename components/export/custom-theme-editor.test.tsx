/**
 * Tests for CustomThemeEditor component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomThemeEditor } from './custom-theme-editor';

// Mock the store
const mockAddTheme = jest.fn().mockReturnValue('new-theme-id');
const mockUpdateTheme = jest.fn();
const mockGetTheme = jest.fn();
const mockExportTheme = jest.fn();
const mockImportTheme = jest.fn();

jest.mock('@/stores/custom-theme-store', () => ({
  useCustomThemeStore: () => ({
    addTheme: mockAddTheme,
    updateTheme: mockUpdateTheme,
    getTheme: mockGetTheme,
    exportTheme: mockExportTheme,
    importTheme: mockImportTheme,
  }),
  createDefaultThemeTemplate: (name: string, isDark: boolean) => ({
    name: name.toLowerCase().replace(/\s+/g, '-'),
    displayName: name,
    isDark,
    colors: {
      background: isDark ? '#1e1e1e' : '#ffffff',
      foreground: isDark ? '#d4d4d4' : '#24292f',
      comment: '#6a9955',
      keyword: '#569cd6',
      string: '#ce9178',
      number: '#b5cea8',
      function: '#dcdcaa',
      operator: '#d4d4d4',
      property: '#9cdcfe',
      className: '#4ec9b0',
      constant: '#4fc1ff',
      tag: '#569cd6',
      attrName: '#9cdcfe',
      attrValue: '#ce9178',
      punctuation: '#d4d4d4',
      selection: 'rgba(38, 79, 120, 0.8)',
      lineHighlight: '#282828',
    },
  }),
}));

// Mock toast
jest.mock('@/components/ui/toaster', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('CustomThemeEditor', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    editingThemeId: null,
    onSave: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTheme.mockReturnValue(null);
  });

  it('should render dialog when open', () => {
    render(<CustomThemeEditor {...defaultProps} />);

    expect(screen.getByText('Create Custom Theme')).toBeInTheDocument();
  });

  it('should not render dialog when closed', () => {
    render(<CustomThemeEditor {...defaultProps} open={false} />);

    expect(screen.queryByText('Create Custom Theme')).not.toBeInTheDocument();
  });

  it('should show edit title when editing existing theme', () => {
    mockGetTheme.mockReturnValue({
      id: 'existing-id',
      name: 'existing-theme',
      displayName: 'Existing Theme',
      isDark: true,
      isCustom: true,
      colors: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        comment: '#6a9955',
        keyword: '#569cd6',
        string: '#ce9178',
        number: '#b5cea8',
        function: '#dcdcaa',
        operator: '#d4d4d4',
        property: '#9cdcfe',
        className: '#4ec9b0',
        constant: '#4fc1ff',
        tag: '#569cd6',
        attrName: '#9cdcfe',
        attrValue: '#ce9178',
        punctuation: '#d4d4d4',
        selection: 'rgba(38, 79, 120, 0.8)',
        lineHighlight: '#282828',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    render(<CustomThemeEditor {...defaultProps} editingThemeId="existing-id" />);

    expect(screen.getByText('Edit Theme')).toBeInTheDocument();
  });

  it('should have theme name input', () => {
    render(<CustomThemeEditor {...defaultProps} />);

    const input = screen.getByLabelText('Theme Name');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('My Custom Theme');
  });

  it('should have dark theme toggle', () => {
    render(<CustomThemeEditor {...defaultProps} />);

    expect(screen.getByLabelText('Dark Theme')).toBeInTheDocument();
  });

  it('should have color tabs', () => {
    render(<CustomThemeEditor {...defaultProps} />);

    expect(screen.getByRole('tab', { name: 'Basic Colors' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Advanced' })).toBeInTheDocument();
  });

  it('should show live preview section', () => {
    render(<CustomThemeEditor {...defaultProps} />);

    expect(screen.getByText('Live Preview')).toBeInTheDocument();
  });

  it('should have Reset button', () => {
    render(<CustomThemeEditor {...defaultProps} />);

    expect(screen.getByRole('button', { name: /Reset/ })).toBeInTheDocument();
  });

  it('should have Import button', () => {
    render(<CustomThemeEditor {...defaultProps} />);

    expect(screen.getByRole('button', { name: /Import/ })).toBeInTheDocument();
  });

  it('should have Export button when editing', () => {
    mockGetTheme.mockReturnValue({
      id: 'existing-id',
      name: 'test',
      displayName: 'Test',
      isDark: true,
      isCustom: true,
      colors: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        comment: '#6a9955',
        keyword: '#569cd6',
        string: '#ce9178',
        number: '#b5cea8',
        function: '#dcdcaa',
        operator: '#d4d4d4',
        property: '#9cdcfe',
        className: '#4ec9b0',
        constant: '#4fc1ff',
        tag: '#569cd6',
        attrName: '#9cdcfe',
        attrValue: '#ce9178',
        punctuation: '#d4d4d4',
        selection: 'rgba(38, 79, 120, 0.8)',
        lineHighlight: '#282828',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    render(<CustomThemeEditor {...defaultProps} editingThemeId="existing-id" />);

    expect(screen.getByRole('button', { name: /Export/ })).toBeInTheDocument();
  });

  it('should have Cancel and Create buttons', () => {
    render(<CustomThemeEditor {...defaultProps} />);

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Theme/ })).toBeInTheDocument();
  });

  it('should show Update button when editing', () => {
    mockGetTheme.mockReturnValue({
      id: 'existing-id',
      name: 'test',
      displayName: 'Test',
      isDark: true,
      isCustom: true,
      colors: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        comment: '#6a9955',
        keyword: '#569cd6',
        string: '#ce9178',
        number: '#b5cea8',
        function: '#dcdcaa',
        operator: '#d4d4d4',
        property: '#9cdcfe',
        className: '#4ec9b0',
        constant: '#4fc1ff',
        tag: '#569cd6',
        attrName: '#9cdcfe',
        attrValue: '#ce9178',
        punctuation: '#d4d4d4',
        selection: 'rgba(38, 79, 120, 0.8)',
        lineHighlight: '#282828',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    render(<CustomThemeEditor {...defaultProps} editingThemeId="existing-id" />);

    expect(screen.getByRole('button', { name: /Update Theme/ })).toBeInTheDocument();
  });

  it('should call onOpenChange when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onOpenChange = jest.fn();

    render(<CustomThemeEditor {...defaultProps} onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should update theme name when input changes', async () => {
    const user = userEvent.setup();
    render(<CustomThemeEditor {...defaultProps} />);

    const input = screen.getByLabelText('Theme Name');
    await user.clear(input);
    await user.type(input, 'New Theme Name');

    expect(input).toHaveValue('New Theme Name');
  });

  it('should call addTheme when creating new theme', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();

    render(<CustomThemeEditor {...defaultProps} onSave={onSave} />);

    const input = screen.getByLabelText('Theme Name');
    await user.clear(input);
    await user.type(input, 'Test Theme');

    await user.click(screen.getByRole('button', { name: /Create Theme/ }));

    expect(mockAddTheme).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'test-theme',
        displayName: 'Test Theme',
      })
    );
    expect(onSave).toHaveBeenCalledWith('new-theme-id');
  });

  it('should call updateTheme when editing existing theme', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();

    mockGetTheme.mockReturnValue({
      id: 'existing-id',
      name: 'existing',
      displayName: 'Existing',
      isDark: true,
      isCustom: true,
      colors: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        comment: '#6a9955',
        keyword: '#569cd6',
        string: '#ce9178',
        number: '#b5cea8',
        function: '#dcdcaa',
        operator: '#d4d4d4',
        property: '#9cdcfe',
        className: '#4ec9b0',
        constant: '#4fc1ff',
        tag: '#569cd6',
        attrName: '#9cdcfe',
        attrValue: '#ce9178',
        punctuation: '#d4d4d4',
        selection: 'rgba(38, 79, 120, 0.8)',
        lineHighlight: '#282828',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    render(
      <CustomThemeEditor
        {...defaultProps}
        editingThemeId="existing-id"
        onSave={onSave}
      />
    );

    const input = screen.getByLabelText('Theme Name');
    await user.clear(input);
    await user.type(input, 'Updated Name');

    await user.click(screen.getByRole('button', { name: /Update Theme/ }));

    expect(mockUpdateTheme).toHaveBeenCalledWith(
      'existing-id',
      expect.objectContaining({
        displayName: 'Updated Name',
      })
    );
    expect(onSave).toHaveBeenCalledWith('existing-id');
  });

  it('should switch between Basic and Advanced color tabs', async () => {
    const user = userEvent.setup();
    render(<CustomThemeEditor {...defaultProps} />);

    const advancedTab = screen.getByRole('tab', { name: 'Advanced' });
    await user.click(advancedTab);

    expect(advancedTab).toHaveAttribute('data-state', 'active');
  });
});

describe('CustomThemeEditor color fields', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    editingThemeId: null,
    onSave: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTheme.mockReturnValue(null);
  });

  it('should display color fields in Basic tab', () => {
    render(<CustomThemeEditor {...defaultProps} />);

    expect(screen.getByText('Background')).toBeInTheDocument();
    expect(screen.getByText('Foreground')).toBeInTheDocument();
    expect(screen.getByText('Comments')).toBeInTheDocument();
    expect(screen.getByText('Keywords')).toBeInTheDocument();
  });

  it('should display color fields in Advanced tab', async () => {
    const user = userEvent.setup();
    render(<CustomThemeEditor {...defaultProps} />);

    await user.click(screen.getByRole('tab', { name: 'Advanced' }));

    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByText('Attr Names')).toBeInTheDocument();
    expect(screen.getByText('Selection')).toBeInTheDocument();
  });
});
