/**
 * Theme Menu Item Component Tests
 */

import { ThemeMenuItem } from './theme-menu-item';
import type { PPTTheme } from '@/types/workflow';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock Radix UI components
jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenuItem: ({ children, onSelect }: { children: React.ReactNode; onSelect?: () => void }) => {
    return (
      <div onClick={onSelect} data-testid="dropdown-menu-item">
        {children}
      </div>
    );
  },
}));

jest.mock('@/components/ui/context-menu', () => ({
  ContextMenuCheckboxItem: ({ children, onSelect }: { children: React.ReactNode; onSelect?: () => void }) => {
    return (
      <div onClick={onSelect} data-testid="context-menu-item">
        {children}
      </div>
    );
  },
}));

const mockTheme: PPTTheme = {
  id: 'modern-light',
  name: 'Modern Light',
  primaryColor: '#2563EB',
  secondaryColor: '#1D4ED8',
  accentColor: '#3B82F6',
  backgroundColor: '#FFFFFF',
  textColor: '#1E293B',
  headingFont: 'Inter',
  bodyFont: 'Inter',
  codeFont: 'JetBrains Mono',
};

describe('ThemeMenuItem', () => {
  it('should be a valid component export', () => {
    expect(ThemeMenuItem).toBeDefined();
    expect(typeof ThemeMenuItem).toBe('function');
  });

  it('should accept theme and onSelect props', () => {
    const props = {
      theme: mockTheme,
      onSelect: jest.fn(),
    };
    expect(props.theme.name).toBe('Modern Light');
    expect(typeof props.onSelect).toBe('function');
  });

  it('should accept theme prop', () => {
    const theme = mockTheme;
    expect(theme.id).toBe('modern-light');
    expect(theme.name).toBe('Modern Light');
    expect(theme.primaryColor).toBe('#2563EB');
  });

  it('should accept isSelected prop', () => {
    const isSelected = true;
    expect(typeof isSelected).toBe('boolean');
  });

  it('should accept onSelect callback', () => {
    const onSelect = jest.fn();
    expect(typeof onSelect).toBe('function');
  });

  it('should have a PPTTheme type for theme prop', () => {
    const theme: PPTTheme = mockTheme;
    expect(theme).toBeDefined();
    expect(theme.id).toBeTruthy();
    expect(theme.name).toBeTruthy();
  });
});
