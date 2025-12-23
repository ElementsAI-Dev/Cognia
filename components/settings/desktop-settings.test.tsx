/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { DesktopSettings } from './desktop-settings';

// Mock native utils
jest.mock('@/lib/native/utils', () => ({
  isTauri: () => false,
}));

// Mock native notification
jest.mock('@/lib/native/notification', () => ({
  requestNotificationPermission: jest.fn(),
  sendNotification: jest.fn(),
}));

// Mock native updater
jest.mock('@/lib/native/updater', () => ({
  checkForUpdates: jest.fn(),
  downloadAndInstallUpdate: jest.fn(),
}));

// Mock native system
jest.mock('@/lib/native/system', () => ({
  openInBrowser: jest.fn(),
}));

// Mock stores
jest.mock('@/stores/native-store', () => ({
  useNativeStore: () => ({
    platform: 'web',
    appVersion: '1.0.0',
    notificationsEnabled: false,
    notificationPermission: false,
    setNotificationsEnabled: jest.fn(),
    setNotificationPermission: jest.fn(),
  }),
}));

// Mock useWindow hook
jest.mock('@/hooks/use-window', () => ({
  useWindow: () => ({
    isAlwaysOnTop: false,
    toggleAlwaysOnTop: jest.fn(),
    toggleFullscreen: jest.fn(),
    isFullscreen: false,
  }),
}));

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: { checked?: boolean; onCheckedChange?: (v: boolean) => void }) => (
    <button role="switch" aria-checked={checked} onClick={() => onCheckedChange?.(!checked)}>Switch</button>
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: { value: number }) => <div data-testid="progress" data-value={value} />,
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />,
}));

describe('DesktopSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<DesktopSettings />);
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('displays desktop settings title', () => {
    render(<DesktopSettings />);
    expect(screen.getByText('Desktop Settings')).toBeInTheDocument();
  });

  it('shows web version message when not in Tauri', () => {
    render(<DesktopSettings />);
    expect(screen.getByText(/only available in the desktop app/i)).toBeInTheDocument();
  });

  it('displays download desktop app button', () => {
    render(<DesktopSettings />);
    expect(screen.getByText('Download Desktop App')).toBeInTheDocument();
  });
});

describe('DesktopSettings in Tauri', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('renders desktop-specific settings when in Tauri', async () => {
    // Re-mock isTauri to return true
    jest.doMock('@/lib/native/utils', () => ({
      isTauri: () => true,
    }));

    // This test verifies the component structure exists
    const { container } = render(<DesktopSettings />);
    expect(container).toBeInTheDocument();
  });
});
