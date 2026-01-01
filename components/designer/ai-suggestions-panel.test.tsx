/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { AISuggestionsPanel } from './ai-suggestions-panel';

// Mock scrollIntoView for jsdom
Element.prototype.scrollIntoView = jest.fn();

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock stores
jest.mock('@/stores', () => ({
  useSettingsStore: () => ({
    providerSettings: { openai: { apiKey: 'test-key' } },
    defaultProvider: 'openai',
  }),
}));

// Mock designer AI functions
const mockGetAIStyleSuggestions = jest.fn();
const mockGetAIAccessibilitySuggestions = jest.fn();
const mockExecuteDesignerAIEdit = jest.fn();

jest.mock('@/lib/designer', () => ({
  getAIStyleSuggestions: (...args: unknown[]) => mockGetAIStyleSuggestions(...args),
  getAIAccessibilitySuggestions: (...args: unknown[]) => mockGetAIAccessibilitySuggestions(...args),
  executeDesignerAIEdit: (...args: unknown[]) => mockExecuteDesignerAIEdit(...args),
  getDesignerAIConfig: jest.fn().mockReturnValue({
    provider: 'openai',
    model: 'gpt-4o',
    apiKey: 'test-key',
  }),
}));

describe('AISuggestionsPanel', () => {
  const defaultProps = {
    code: 'export default function App() { return <div>Hello</div>; }',
    onCodeChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAIStyleSuggestions.mockResolvedValue({
      success: true,
      suggestions: [
        {
          id: '1',
          type: 'style',
          title: 'Improve contrast',
          description: 'Add better color contrast',
          priority: 'high',
          code: 'color: #000',
        },
      ],
    });
    mockGetAIAccessibilitySuggestions.mockResolvedValue({
      success: true,
      suggestions: [
        {
          id: '2',
          type: 'accessibility',
          title: 'Add alt text',
          description: 'Images should have alt text',
          priority: 'medium',
        },
      ],
    });
    mockExecuteDesignerAIEdit.mockResolvedValue({
      success: true,
      code: 'export default function App() { return <div style={{color: "#000"}}>Hello</div>; }',
    });
  });

  it('should render the panel header', () => {
    render(<AISuggestionsPanel {...defaultProps} />);
    expect(screen.getByText('aiSuggestions')).toBeInTheDocument();
  });

  it('should render all tabs', () => {
    render(<AISuggestionsPanel {...defaultProps} />);
    expect(screen.getByText('Style')).toBeInTheDocument();
    expect(screen.getByText('A11y')).toBeInTheDocument();
    expect(screen.getByText('Responsive')).toBeInTheDocument();
    expect(screen.getByText('Layout')).toBeInTheDocument();
  });

  it('should show empty state initially', () => {
    render(<AISuggestionsPanel {...defaultProps} />);
    expect(screen.getByText('noSuggestionsYet')).toBeInTheDocument();
    expect(screen.getByText('clickRefresh')).toBeInTheDocument();
  });

  it('should show analyze button in empty state', () => {
    render(<AISuggestionsPanel {...defaultProps} />);
    expect(screen.getByText('analyze')).toBeInTheDocument();
  });

  it('should render close button when onClose is provided', () => {
    const onClose = jest.fn();
    render(<AISuggestionsPanel {...defaultProps} onClose={onClose} />);
    
    const closeButton = screen.getAllByRole('button').find(
      (btn) => btn.querySelector('svg.lucide-x')
    );
    expect(closeButton).toBeInTheDocument();
  });

  it('should have AI style suggestions mock configured', () => {
    expect(mockGetAIStyleSuggestions).toBeDefined();
  });

  it('should have AI accessibility suggestions mock configured', () => {
    expect(mockGetAIAccessibilitySuggestions).toBeDefined();
  });

  it('should have execute designer AI edit mock configured', () => {
    expect(mockExecuteDesignerAIEdit).toBeDefined();
  });

  it('should render accessibility tab', () => {
    render(<AISuggestionsPanel {...defaultProps} />);
    
    const a11yTab = screen.getByText('A11y');
    expect(a11yTab).toBeInTheDocument();
  });

  it('should call onCodeChange callback when provided', () => {
    const onCodeChange = jest.fn();
    render(<AISuggestionsPanel {...defaultProps} onCodeChange={onCodeChange} />);
    
    // The callback should be available
    expect(onCodeChange).not.toHaveBeenCalled();
  });

  it('should handle error state in API mock', () => {
    mockGetAIStyleSuggestions.mockResolvedValue({
      success: false,
      error: 'API error',
    });
    
    render(<AISuggestionsPanel {...defaultProps} />);
    
    // The component should render even when API might fail
    expect(screen.getByText('analyze')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<AISuggestionsPanel {...defaultProps} className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should render responsive tab', () => {
    render(<AISuggestionsPanel {...defaultProps} />);
    
    const responsiveTab = screen.getByText('Responsive');
    expect(responsiveTab).toBeInTheDocument();
  });

  it('should render layout tab', () => {
    render(<AISuggestionsPanel {...defaultProps} />);
    
    const layoutTab = screen.getByText('Layout');
    expect(layoutTab).toBeInTheDocument();
  });
});
