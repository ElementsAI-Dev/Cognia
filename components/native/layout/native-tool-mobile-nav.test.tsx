/**
 * Tests for NativeToolMobileNav component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { NativeToolMobileNav } from './native-tool-mobile-nav';
import { NATIVE_TOOLS } from './native-tool-sidebar';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'tabs.history': 'History',
      'tabs.smart': 'Smart',
      'tabs.templates': 'Templates',
      'tabs.screenshot': 'Screenshot',
      'tabs.focus': 'Focus',
      'tabs.context': 'Context',
      'tabs.system': 'System',
      'tabs.processes': 'Processes',
      'tabs.sandbox': 'Sandbox',
    };
    return translations[key] || key;
  },
}));

describe('NativeToolMobileNav', () => {
  const mockOnTabChange = jest.fn();

  beforeEach(() => {
    mockOnTabChange.mockClear();
  });

  it('renders all native tools', () => {
    render(<NativeToolMobileNav activeTab="clipboard" onTabChange={mockOnTabChange} />);

    NATIVE_TOOLS.forEach((tool) => {
      expect(
        screen.getByRole('button', { name: new RegExp(tool.labelKey, 'i') })
      ).toBeInTheDocument();
    });
  });

  it('highlights active tab', () => {
    render(<NativeToolMobileNav activeTab="focus" onTabChange={mockOnTabChange} />);

    const focusButton = screen.getByRole('button', { name: /focus/i });
    expect(focusButton).toHaveAttribute('aria-current', 'page');
  });

  it('calls onTabChange when tool is clicked', () => {
    render(<NativeToolMobileNav activeTab="clipboard" onTabChange={mockOnTabChange} />);

    const systemButton = screen.getByRole('button', { name: /system/i });
    fireEvent.click(systemButton);

    expect(mockOnTabChange).toHaveBeenCalledWith('system');
  });

  it('applies custom className', () => {
    render(
      <NativeToolMobileNav
        activeTab="clipboard"
        onTabChange={mockOnTabChange}
        className="custom-nav-class"
      />
    );

    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('custom-nav-class');
  });

  it('renders with horizontal scroll area', () => {
    render(<NativeToolMobileNav activeTab="clipboard" onTabChange={mockOnTabChange} />);

    // The nav should have scroll area with all buttons visible
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(NATIVE_TOOLS.length);
  });
});
