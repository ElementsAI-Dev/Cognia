/**
 * Tests for NativeToolSidebar component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { NativeToolSidebar, NATIVE_TOOLS } from './native-tool-sidebar';

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

describe('NativeToolSidebar', () => {
  const mockOnTabChange = jest.fn();

  beforeEach(() => {
    mockOnTabChange.mockClear();
  });

  it('renders all native tools', () => {
    render(<NativeToolSidebar activeTab="clipboard" onTabChange={mockOnTabChange} />);

    NATIVE_TOOLS.forEach((tool) => {
      expect(
        screen.getByRole('button', { name: new RegExp(tool.labelKey, 'i') })
      ).toBeInTheDocument();
    });
  });

  it('highlights active tab', () => {
    render(<NativeToolSidebar activeTab="screenshot" onTabChange={mockOnTabChange} />);

    const screenshotButton = screen.getByRole('button', { name: /screenshot/i });
    expect(screenshotButton).toHaveAttribute('aria-current', 'page');
  });

  it('calls onTabChange when tool is clicked', () => {
    render(<NativeToolSidebar activeTab="clipboard" onTabChange={mockOnTabChange} />);

    const sandboxButton = screen.getByRole('button', { name: /sandbox/i });
    fireEvent.click(sandboxButton);

    expect(mockOnTabChange).toHaveBeenCalledWith('sandbox');
  });

  it('renders in collapsed mode', () => {
    render(<NativeToolSidebar activeTab="clipboard" onTabChange={mockOnTabChange} collapsed />);

    // In collapsed mode, labels should not be visible (only icons with tooltips)
    const sidebar = screen.getByRole('navigation');
    expect(sidebar.closest('aside')).toHaveClass('w-16');
  });

  it('applies custom className', () => {
    render(
      <NativeToolSidebar
        activeTab="clipboard"
        onTabChange={mockOnTabChange}
        className="custom-class"
      />
    );

    const sidebar = screen.getByRole('navigation').closest('aside');
    expect(sidebar).toHaveClass('custom-class');
  });

  it('exports NATIVE_TOOLS constant with correct structure', () => {
    expect(NATIVE_TOOLS).toHaveLength(10);
    NATIVE_TOOLS.forEach((tool) => {
      expect(tool).toHaveProperty('id');
      expect(tool).toHaveProperty('icon');
      expect(tool).toHaveProperty('labelKey');
    });
  });
});
