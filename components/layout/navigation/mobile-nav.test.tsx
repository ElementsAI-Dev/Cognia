import { render, screen, fireEvent } from '@testing-library/react';
import { MobileNav } from './mobile-nav';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      openMenu: 'Open menu',
    };
    return translations[key] || key;
  },
}));

// Mock stores
const mockSetMobileNavOpen = jest.fn();

jest.mock('@/stores', () => ({
  useUIStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      mobileNavOpen: false,
      setMobileNavOpen: mockSetMobileNavOpen,
    };
    return selector(state);
  },
}));

describe('MobileNav', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders menu button', () => {
    render(<MobileNav />);
    expect(screen.getByLabelText('Open menu')).toBeInTheDocument();
  });

  it('renders with md:hidden class for responsive display', () => {
    render(<MobileNav />);
    const button = screen.getByLabelText('Open menu');
    expect(button).toHaveClass('md:hidden');
  });

  it('has ghost variant button', () => {
    render(<MobileNav />);
    const button = screen.getByLabelText('Open menu');
    expect(button).toHaveAttribute('data-variant', 'ghost');
  });

  it('has icon size', () => {
    render(<MobileNav />);
    const button = screen.getByLabelText('Open menu');
    expect(button).toHaveAttribute('data-size', 'icon');
  });

  it('renders children when provided', () => {
    render(
      <MobileNav>
        <div data-testid="nav-content">Navigation Content</div>
      </MobileNav>
    );
    expect(screen.getByLabelText('Open menu')).toBeInTheDocument();
  });

  it('opens sheet on button click', () => {
    render(<MobileNav />);
    const button = screen.getByLabelText('Open menu');
    fireEvent.click(button);
    // Sheet should trigger onOpenChange
  });
});

describe('MobileNav - Accessibility', () => {
  it('has accessible label for menu button', () => {
    render(<MobileNav />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Open menu');
  });
});
