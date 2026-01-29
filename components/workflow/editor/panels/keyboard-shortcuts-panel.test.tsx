/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { KeyboardShortcutsPanel } from './keyboard-shortcuts-panel';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock Radix Dialog - simplified for testing
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) => 
    open ? <div role="dialog">{children}</div> : <>{children}</>,
  DialogTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

describe('KeyboardShortcutsPanel', () => {
  it('renders trigger button', () => {
    render(<KeyboardShortcutsPanel />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('renders with keyboard icon', () => {
    render(<KeyboardShortcutsPanel />);
    
    const button = screen.getByRole('button');
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<KeyboardShortcutsPanel className="custom-class" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  it('has tooltip content', () => {
    render(<KeyboardShortcutsPanel />);
    
    const tooltipTexts = screen.getAllByText(/keyboardShortcuts/);
    expect(tooltipTexts.length).toBeGreaterThan(0);
  });
});
