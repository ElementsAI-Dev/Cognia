/**
 * Tests for PlatformWarning component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import {
  PlatformWarning,
  PlatformBadge,
  DesktopOnly,
  detectPlatform,
} from './platform-warning';

// Mock isTauri
jest.mock('@/lib/native/utils', () => ({
  isTauri: jest.fn(() => true),
}));

import { isTauri } from '@/lib/native/utils';

const mockIsTauri = isTauri as jest.MockedFunction<typeof isTauri>;

const messages = {
  platformWarning: {
    notSupported: '{feature} is only available on {platforms}',
    limitedSupport: 'Limited Support',
    desktopOnly: 'This feature requires the desktop app',
  },
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <NextIntlClientProvider locale="en" messages={messages}>
    {children}
  </NextIntlClientProvider>
);

describe('detectPlatform', () => {
  const originalNavigator = global.navigator;

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
    });
  });

  it('detects Windows platform', () => {
    Object.defineProperty(global, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      writable: true,
    });
    expect(detectPlatform()).toBe('windows');
  });

  it('detects macOS platform', () => {
    Object.defineProperty(global, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
      writable: true,
    });
    expect(detectPlatform()).toBe('macos');
  });

  it('detects Linux platform', () => {
    Object.defineProperty(global, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 (X11; Linux x86_64)' },
      writable: true,
    });
    expect(detectPlatform()).toBe('linux');
  });

  it('returns unknown for unrecognized platform', () => {
    Object.defineProperty(global, 'navigator', {
      value: { userAgent: 'UnknownBrowser/1.0' },
      writable: true,
    });
    expect(detectPlatform()).toBe('unknown');
  });

  // Note: Testing undefined window is not reliable in JSDOM
  // The function handles this case in production
});

describe('PlatformWarning', () => {
  beforeEach(() => {
    mockIsTauri.mockReturnValue(true);
    // Set up as Linux platform to test Windows-only warnings
    Object.defineProperty(global, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 (X11; Linux x86_64)' },
      writable: true,
    });
  });

  it('renders nothing in web environment', () => {
    mockIsTauri.mockReturnValue(false);
    const { container } = render(
      <PlatformWarning
        supportedPlatforms={['windows']}
        featureName="Screenshot"
      />,
      { wrapper }
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when platform is supported', () => {
    Object.defineProperty(global, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      writable: true,
    });
    const { container } = render(
      <PlatformWarning
        supportedPlatforms={['windows']}
        featureName="Screenshot"
      />,
      { wrapper }
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders alert when platform is not supported', () => {
    render(
      <PlatformWarning
        supportedPlatforms={['windows']}
        featureName="Screenshot"
        mode="alert"
      />,
      { wrapper }
    );
    expect(screen.getByText('Limited Support')).toBeInTheDocument();
  });

  it('renders badge mode correctly', () => {
    render(
      <PlatformWarning
        supportedPlatforms={['windows']}
        featureName="Screenshot"
        mode="badge"
      />,
      { wrapper }
    );
    expect(screen.getByText('Windows only')).toBeInTheDocument();
  });

  it('renders inline mode correctly', () => {
    render(
      <PlatformWarning
        supportedPlatforms={['windows', 'macos']}
        featureName="Screenshot"
        mode="inline"
      />,
      { wrapper }
    );
    expect(screen.getByText(/Screenshot is only available on Windows, macOS/)).toBeInTheDocument();
  });

  it('renders custom message', () => {
    render(
      <PlatformWarning
        supportedPlatforms={['windows']}
        featureName="Screenshot"
        message="Custom warning message"
        mode="inline"
      />,
      { wrapper }
    );
    expect(screen.getByText('Custom warning message')).toBeInTheDocument();
  });

  it('renders children in tooltip mode when unsupported', () => {
    render(
      <PlatformWarning
        supportedPlatforms={['windows']}
        featureName="Screenshot"
        mode="tooltip"
      >
        <button>Click me</button>
      </PlatformWarning>,
      { wrapper }
    );
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('renders children without warning in tooltip mode when supported', () => {
    Object.defineProperty(global, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      writable: true,
    });
    const { container } = render(
      <PlatformWarning
        supportedPlatforms={['windows']}
        featureName="Screenshot"
        mode="tooltip"
      >
        <button>Click me</button>
      </PlatformWarning>,
      { wrapper }
    );
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
    // Should not have warning icon
    expect(container.querySelector('svg.text-yellow-600')).toBeNull();
  });

  it('supports multiple platforms in list', () => {
    // When all platforms are listed, on Linux it would be supported so nothing renders
    // Let's test with just Windows and macOS (Linux excluded)
    render(
      <PlatformWarning
        supportedPlatforms={['windows', 'macos']}
        featureName="Feature"
        mode="badge"
      />,
      { wrapper }
    );
    expect(screen.getByText('Windows, macOS only')).toBeInTheDocument();
  });
});

describe('PlatformBadge', () => {
  it('renders single platform badge', () => {
    render(<PlatformBadge platform="windows" />);
    expect(screen.getByText('🪟')).toBeInTheDocument();
    expect(screen.getByText('Win')).toBeInTheDocument();
  });

  it('renders multiple platform badge', () => {
    render(<PlatformBadge platform={['windows', 'macos']} />);
    expect(screen.getByText('🪟 🍎')).toBeInTheDocument();
    expect(screen.getByText('Win/Mac')).toBeInTheDocument();
  });

  it('renders Linux platform', () => {
    render(<PlatformBadge platform="linux" />);
    expect(screen.getByText('🐧')).toBeInTheDocument();
    expect(screen.getByText('Linux')).toBeInTheDocument();
  });
});

describe('DesktopOnly', () => {
  beforeEach(() => {
    mockIsTauri.mockReturnValue(true);
  });

  it('renders children in desktop environment', () => {
    render(
      <DesktopOnly>
        <span>Desktop content</span>
      </DesktopOnly>,
      { wrapper }
    );
    expect(screen.getByText('Desktop content')).toBeInTheDocument();
  });

  it('renders fallback message in web environment', () => {
    mockIsTauri.mockReturnValue(false);
    render(
      <DesktopOnly>
        <span>Desktop content</span>
      </DesktopOnly>,
      { wrapper }
    );
    expect(screen.queryByText('Desktop content')).not.toBeInTheDocument();
    expect(screen.getByText('This feature is only available in the desktop app.')).toBeInTheDocument();
  });

  it('renders custom fallback in web environment', () => {
    mockIsTauri.mockReturnValue(false);
    render(
      <DesktopOnly fallback={<span>Custom fallback</span>}>
        <span>Desktop content</span>
      </DesktopOnly>,
      { wrapper }
    );
    expect(screen.queryByText('Desktop content')).not.toBeInTheDocument();
    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
  });
});
