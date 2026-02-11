'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { MobileBottomNav } from './mobile-bottom-nav';

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

jest.mock('@/stores', () => ({
  useSessionStore: jest.fn((selector) => {
    const state = {
      createSession: jest.fn(),
      sessions: [{ id: '1' }, { id: '2' }],
    };
    return typeof selector === 'function' ? selector(state) : state;
  }),
  useUIStore: jest.fn((selector) => {
    const state = {
      setMobileNavOpen: jest.fn(),
      openModal: jest.fn(),
    };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

const messages = {
  mobileNav: {
    home: 'Home',
    sessions: 'Sessions',
    newChat: 'New Chat',
    projects: 'Projects',
    more: 'More',
    settings: 'Settings',
    pptStudio: 'PPT Studio',
    imageStudio: 'Image Studio',
  },
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('MobileBottomNav', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders navigation bar', () => {
    renderWithProviders(<MobileBottomNav />);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('renders home link', () => {
    renderWithProviders(<MobileBottomNav />);
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('renders sessions link with badge', () => {
    renderWithProviders(<MobileBottomNav />);
    expect(screen.getByText('Sessions')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders new chat button', () => {
    renderWithProviders(<MobileBottomNav />);
    expect(screen.getByText('New Chat')).toBeInTheDocument();
  });

  it('renders projects link', () => {
    renderWithProviders(<MobileBottomNav />);
    expect(screen.getByText('Projects')).toBeInTheDocument();
  });

  it('renders more button', () => {
    renderWithProviders(<MobileBottomNav />);
    expect(screen.getByText('More')).toBeInTheDocument();
  });

  it('opens more menu on click', () => {
    renderWithProviders(<MobileBottomNav />);
    fireEvent.click(screen.getByText('More'));
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('shows additional items in more menu', () => {
    renderWithProviders(<MobileBottomNav />);
    fireEvent.click(screen.getByText('More'));
    expect(screen.getByText('PPT Studio')).toBeInTheDocument();
    expect(screen.getByText('Image Studio')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    renderWithProviders(<MobileBottomNav className="custom-class" />);
    expect(screen.getByRole('navigation')).toHaveClass('custom-class');
  });

  it('has fixed positioning', () => {
    renderWithProviders(<MobileBottomNav />);
    expect(screen.getByRole('navigation')).toHaveClass('fixed');
  });
});
