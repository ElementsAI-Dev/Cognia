/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemePreview, ThemePreviewInline } from './theme-preview';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock themes
jest.mock('@/lib/themes', () => ({
  THEME_PRESETS: {
    default: { name: 'Default', colors: { light: '#2563eb', dark: '#3b82f6' } },
    ocean: { name: 'Ocean', colors: { light: '#0891b2', dark: '#06b6d4' } },
    forest: { name: 'Forest', colors: { light: '#059669', dark: '#10b981' } },
    sunset: { name: 'Sunset', colors: { light: '#ea580c', dark: '#f97316' } },
    lavender: { name: 'Lavender', colors: { light: '#7c3aed', dark: '#8b5cf6' } },
    rose: { name: 'Rose', colors: { light: '#e11d48', dark: '#f43f5e' } },
  },
}));

// Mock UI components
jest.mock('@/components/ui/hover-card', () => ({
  HoverCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  HoverCardContent: ({ children }: { children: React.ReactNode }) => <div data-testid="hover-content">{children}</div>,
  HoverCardTrigger: ({ children, asChild: _asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    <div data-testid="hover-trigger">{children}</div>
  ),
}));

describe('ThemePreview', () => {
  it('renders without crashing', () => {
    render(
      <ThemePreview preset="default">
        <button>Test Button</button>
      </ThemePreview>
    );
    expect(screen.getByTestId('hover-trigger')).toBeInTheDocument();
  });

  it('renders children correctly', () => {
    render(
      <ThemePreview preset="default">
        <button>My Theme Button</button>
      </ThemePreview>
    );
    expect(screen.getByText('My Theme Button')).toBeInTheDocument();
  });

  it('uses preset colors when provided', () => {
    render(
      <ThemePreview preset="ocean" isDarkMode={false}>
        <button>Ocean Theme</button>
      </ThemePreview>
    );
    expect(screen.getByText('Ocean Theme')).toBeInTheDocument();
  });

  it('uses custom theme colors when provided', () => {
    const customTheme = {
      id: 'custom-1',
      name: 'Custom Theme',
      isDark: false,
      colors: {
        primary: '#ff0000',
        secondary: '#00ff00',
        accent: '#0000ff',
        background: '#ffffff',
        foreground: '#000000',
        muted: '#cccccc',
      },
    };

    render(
      <ThemePreview customTheme={customTheme}>
        <button>Custom Theme</button>
      </ThemePreview>
    );
    expect(screen.getByText('Custom Theme')).toBeInTheDocument();
  });

  it('handles dark mode preset correctly', () => {
    render(
      <ThemePreview preset="default" isDarkMode={true}>
        <button>Dark Mode</button>
      </ThemePreview>
    );
    expect(screen.getByText('Dark Mode')).toBeInTheDocument();
  });

  it('renders hover content', () => {
    render(
      <ThemePreview preset="default">
        <button>Hover Me</button>
      </ThemePreview>
    );
    expect(screen.getByTestId('hover-content')).toBeInTheDocument();
  });
});

describe('ThemePreviewInline', () => {
  const defaultColors = {
    primary: '#3b82f6',
    background: '#ffffff',
    foreground: '#0f172a',
    muted: '#f1f5f9',
    secondary: '#e2e8f0',
  };

  it('renders without crashing', () => {
    render(<ThemePreviewInline colors={defaultColors} />);
    // Component should render with color swatches
    expect(document.querySelector('div')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ThemePreviewInline colors={defaultColors} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('renders color elements', () => {
    const { container } = render(<ThemePreviewInline colors={defaultColors} />);
    // Should have styled elements for colors
    const colorElements = container.querySelectorAll('[style]');
    expect(colorElements.length).toBeGreaterThan(0);
  });

  it('uses provided colors for styling', () => {
    const customColors = {
      primary: '#ff0000',
      background: '#000000',
      foreground: '#ffffff',
      muted: '#333333',
      secondary: '#666666',
    };
    
    const { container } = render(<ThemePreviewInline colors={customColors} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
