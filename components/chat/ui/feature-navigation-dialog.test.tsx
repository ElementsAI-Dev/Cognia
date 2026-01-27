/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FeatureNavigationDialog, FeatureNavigationSuggestion } from './feature-navigation-dialog';
import type { FeatureRoute } from '@/types/routing/feature-router';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, string>) => {
    const translations: Record<string, string> = {
      intentDetected: 'Intent Detected',
      suggestNavigation: `Your request is better suited for ${params?.feature || 'this feature'}`,
      confidence: 'Confidence',
      yourRequest: 'Your request',
      dontShowAgain: "Don't show again",
      continueChat: 'Continue Chat',
      goToFeature: 'Go to Feature',
      suggestFeature: 'Suggest using',
      go: 'Go',
    };
    return translations[key] || key;
  },
}));

// Mock UI components
jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => (
    open ? <div data-testid="alert-dialog">{children}</div> : null
  ),
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-dialog-content">{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-dialog-header">{children}</div>
  ),
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="alert-dialog-title">{children}</h2>
  ),
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="alert-dialog-description">{children}</p>
  ),
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-dialog-footer">{children}</div>
  ),
  AlertDialogAction: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    asChild ? <>{children}</> : <button>{children}</button>
  ),
  AlertDialogCancel: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    asChild ? <>{children}</> : <button>{children}</button>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="badge">{children}</span>
  ),
}));

jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ onCheckedChange, id }: { onCheckedChange?: (checked: boolean) => void; id?: string }) => (
    <input
      type="checkbox"
      id={id}
      data-testid="checkbox"
      onChange={(e) => onCheckedChange?.(e.target.checked)}
    />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

describe('FeatureNavigationDialog', () => {
  const mockFeature: FeatureRoute = {
    id: 'video-studio',
    path: '/video-studio',
    name: 'Video Studio',
    nameZh: '视频工作室',
    description: 'Create and edit videos',
    descriptionZh: '创建和编辑视频',
    category: 'creation',
    icon: 'Video',
    patterns: {
      chinese: [/视频/],
      english: [/video/i],
    },
    keywords: {
      chinese: ['视频', '制作'],
      english: ['video', 'create'],
    },
    priority: 1,
    enabled: true,
  };

  const defaultProps = {
    open: true,
    feature: mockFeature,
    confidence: 0.85,
    originalMessage: 'I want to create a video',
    matchedPatterns: ['create', 'video'],
    onNavigate: jest.fn(),
    onContinue: jest.fn(),
    onDismiss: jest.fn(),
    onOpenChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open is true', () => {
    render(<FeatureNavigationDialog {...defaultProps} />);
    expect(screen.getByTestId('alert-dialog')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(<FeatureNavigationDialog {...defaultProps} open={false} />);
    expect(screen.queryByTestId('alert-dialog')).not.toBeInTheDocument();
  });

  it('returns null when feature is null', () => {
    const { container } = render(<FeatureNavigationDialog {...defaultProps} feature={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('displays the feature name', () => {
    render(<FeatureNavigationDialog {...defaultProps} />);
    expect(screen.getByText('视频工作室')).toBeInTheDocument();
  });

  it('displays the original message', () => {
    render(<FeatureNavigationDialog {...defaultProps} />);
    // Text is split across elements with quotes, use substring match
    expect(screen.getByText(/I want to create a video/)).toBeInTheDocument();
  });

  it('displays confidence percentage', () => {
    render(<FeatureNavigationDialog {...defaultProps} />);
    expect(screen.getByText(/85%/)).toBeInTheDocument();
  });

  it('displays matched patterns', () => {
    render(<FeatureNavigationDialog {...defaultProps} />);
    expect(screen.getByText('create')).toBeInTheDocument();
    expect(screen.getByText('video')).toBeInTheDocument();
  });

  it('calls onNavigate when navigate button is clicked', () => {
    render(<FeatureNavigationDialog {...defaultProps} />);
    
    const navigateButton = screen.getByText(/Go to Feature|前往/);
    fireEvent.click(navigateButton);
    
    expect(defaultProps.onNavigate).toHaveBeenCalled();
  });

  it('calls onContinue when continue button is clicked', () => {
    render(<FeatureNavigationDialog {...defaultProps} />);
    
    const continueButton = screen.getByText(/Continue Chat|继续对话/);
    fireEvent.click(continueButton);
    
    expect(defaultProps.onContinue).toHaveBeenCalled();
  });

  it('calls onDismiss when checkbox is checked', () => {
    render(<FeatureNavigationDialog {...defaultProps} />);
    
    const checkbox = screen.getByTestId('checkbox');
    fireEvent.click(checkbox);
    
    expect(defaultProps.onDismiss).toHaveBeenCalled();
  });

  it('renders without matched patterns', () => {
    render(<FeatureNavigationDialog {...defaultProps} matchedPatterns={[]} />);
    expect(screen.getByTestId('alert-dialog')).toBeInTheDocument();
  });
});

describe('FeatureNavigationSuggestion', () => {
  const mockFeature: FeatureRoute = {
    id: 'video-studio',
    path: '/video-studio',
    name: 'Video Studio',
    nameZh: '视频工作室',
    description: 'Create and edit videos',
    descriptionZh: '创建和编辑视频',
    category: 'creation',
    icon: 'Video',
    patterns: {
      chinese: [/视频/],
      english: [/video/i],
    },
    keywords: {
      chinese: ['视频'],
      english: ['video'],
    },
    priority: 1,
    enabled: true,
  };

  const defaultProps = {
    feature: mockFeature,
    confidence: 0.9,
    onNavigate: jest.fn(),
    onDismiss: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { container } = render(<FeatureNavigationSuggestion {...defaultProps} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('displays the feature name', () => {
    render(<FeatureNavigationSuggestion {...defaultProps} />);
    expect(screen.getByText('视频工作室')).toBeInTheDocument();
  });

  it('calls onNavigate when go button is clicked', () => {
    render(<FeatureNavigationSuggestion {...defaultProps} />);
    
    const buttons = screen.getAllByRole('button');
    const goButton = buttons.find(btn => btn.textContent?.includes('Go') || btn.textContent?.includes('前往'));
    expect(goButton).toBeTruthy();
    fireEvent.click(goButton!);
    
    expect(defaultProps.onNavigate).toHaveBeenCalled();
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    render(<FeatureNavigationSuggestion {...defaultProps} />);
    
    const buttons = screen.getAllByRole('button');
    // Dismiss button is the one without text (just X icon)
    const dismissButton = buttons[buttons.length - 1];
    fireEvent.click(dismissButton);
    
    expect(defaultProps.onDismiss).toHaveBeenCalled();
  });

  it('applies custom className', () => {
    const { container } = render(
      <FeatureNavigationSuggestion {...defaultProps} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
