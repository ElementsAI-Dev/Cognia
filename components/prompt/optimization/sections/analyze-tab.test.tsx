/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnalyzeTab } from './analyze-tab';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: { children: React.ReactNode; htmlFor?: string }) => (
    <label {...props}>{children}</label>
  ),
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, id }: { checked?: boolean; onCheckedChange?: (v: boolean) => void; id?: string }) => (
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      data-testid={`switch-${id}`}
    />
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div data-testid="alert">{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('@/components/ai-elements/loader', () => ({
  Loader: () => <span data-testid="loader">Loading...</span>,
}));

describe('AnalyzeTab', () => {
  const defaultProps = {
    templateContent: 'Test prompt content',
    quickAnalysisResult: { clarity: 70, specificity: 60, structureQuality: 80, overallScore: 70 },
    analysisResult: null,
    bestPracticeSuggestions: [],
    useIterative: false,
    isAnalyzing: false,
    error: null,
    onUseIterativeChange: jest.fn(),
    onAnalyze: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders template content', () => {
    render(<AnalyzeTab {...defaultProps} />);
    expect(screen.getByText('Test prompt content')).toBeInTheDocument();
  });

  it('displays quick analysis scores', () => {
    render(<AnalyzeTab {...defaultProps} />);
    // 70 appears twice (clarity=70 and overallScore=70)
    expect(screen.getAllByText('70').length).toBe(2);
    expect(screen.getByText('60')).toBeInTheDocument();
    expect(screen.getByText('80')).toBeInTheDocument();
  });

  it('shows noContent when template content is empty', () => {
    render(<AnalyzeTab {...defaultProps} templateContent="" />);
    expect(screen.getByText('noContent')).toBeInTheDocument();
  });

  it('displays analyze button', () => {
    render(<AnalyzeTab {...defaultProps} />);
    expect(screen.getByText('runAnalysis')).toBeInTheDocument();
  });

  it('calls onAnalyze when button is clicked', () => {
    render(<AnalyzeTab {...defaultProps} />);
    fireEvent.click(screen.getByText('runAnalysis'));
    expect(defaultProps.onAnalyze).toHaveBeenCalled();
  });

  it('shows loading state when analyzing', () => {
    render(<AnalyzeTab {...defaultProps} isAnalyzing />);
    expect(screen.getByText('analyzing')).toBeInTheDocument();
    expect(screen.getByTestId('loader')).toBeInTheDocument();
  });

  it('disables button when analyzing', () => {
    render(<AnalyzeTab {...defaultProps} isAnalyzing />);
    const button = screen.getByText('analyzing').closest('button');
    expect(button).toBeDisabled();
  });

  it('displays error message', () => {
    render(<AnalyzeTab {...defaultProps} error="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('shows AI analysis when result is available', () => {
    const analysisResult = {
      analysis: { clarity: 85, specificity: 75, structureQuality: 90, overallScore: 83 },
    };
    render(<AnalyzeTab {...defaultProps} analysisResult={analysisResult} />);
    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();
    expect(screen.getByText('90')).toBeInTheDocument();
    expect(screen.getByText('83')).toBeInTheDocument();
  });

  it('shows best practice suggestions when no AI analysis', () => {
    const suggestions = [
      { id: 'bp1', description: 'Add more context', type: 'context', priority: 'high' as const },
    ];
    render(<AnalyzeTab {...defaultProps} bestPracticeSuggestions={suggestions} />);
    expect(screen.getByText('Add more context')).toBeInTheDocument();
  });

  it('hides best practice suggestions when AI analysis exists', () => {
    const suggestions = [
      { id: 'bp1', description: 'Add more context', type: 'context', priority: 'high' as const },
    ];
    const analysisResult = {
      analysis: { clarity: 85, specificity: 75, structureQuality: 90, overallScore: 83 },
    };
    render(<AnalyzeTab {...defaultProps} bestPracticeSuggestions={suggestions} analysisResult={analysisResult} />);
    expect(screen.queryByText('Add more context')).not.toBeInTheDocument();
  });

  it('renders iterative toggle', () => {
    render(<AnalyzeTab {...defaultProps} />);
    expect(screen.getByTestId('switch-iterative')).toBeInTheDocument();
  });

  it('calls onUseIterativeChange when toggle is changed', () => {
    render(<AnalyzeTab {...defaultProps} />);
    fireEvent.click(screen.getByTestId('switch-iterative'));
    expect(defaultProps.onUseIterativeChange).toHaveBeenCalled();
  });
});
