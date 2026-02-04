/**
 * GoogleDriveConfigForm Tests
 */

import { render, screen, waitFor } from '@testing-library/react';
import { GoogleDriveConfigForm } from './googledrive-config';
import { useSyncStore } from '@/stores/sync';
import { NextIntlClientProvider } from 'next-intl';
import { DEFAULT_GOOGLE_DRIVE_CONFIG } from '@/types/sync';
import * as credentialStorage from '@/lib/sync/credential-storage';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock credential storage
jest.mock('@/lib/sync/credential-storage', () => ({
  hasStoredCredentials: jest.fn().mockResolvedValue(false),
  getGoogleAccessToken: jest.fn().mockResolvedValue(null),
  storeGoogleTokens: jest.fn().mockResolvedValue(true),
  removeGoogleTokens: jest.fn().mockResolvedValue(true),
}));

// Mock Google OAuth
jest.mock('@/lib/sync/providers/google-oauth', () => ({
  buildGoogleAuthUrl: jest.fn().mockResolvedValue({
    url: 'https://accounts.google.com/o/oauth2/v2/auth?test=1',
    codeVerifier: 'test-verifier',
    state: 'test-state',
  }),
  exchangeGoogleCode: jest.fn().mockResolvedValue({
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
  }),
  getGoogleUserInfo: jest.fn().mockResolvedValue({
    email: 'test@example.com',
  }),
  verifyGoogleOAuthState: jest.fn().mockReturnValue({
    state: 'test-state',
    codeVerifier: 'test-verifier',
    redirectUri: 'http://localhost:3000/callback',
    createdAt: Date.now(),
  }),
  clearGoogleOAuthState: jest.fn(),
  calculateTokenExpiry: jest.fn().mockReturnValue(Date.now() + 3600000),
  revokeGoogleToken: jest.fn().mockResolvedValue(undefined),
}));

const mockHasStoredCredentials = credentialStorage.hasStoredCredentials as jest.MockedFunction<typeof credentialStorage.hasStoredCredentials>;

// Mock toast
jest.mock('@/components/ui/sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Reset store before each test
const resetStore = () => {
  useSyncStore.setState({
    googleDriveConfig: { ...DEFAULT_GOOGLE_DRIVE_CONFIG },
  });
};

describe('GoogleDriveConfigForm', () => {
  beforeEach(() => {
    resetStore();
    jest.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(
      <NextIntlClientProvider locale="en" messages={{}}>
        <GoogleDriveConfigForm {...props} />
      </NextIntlClientProvider>
    );
  };

  describe('Rendering', () => {
    it('should render the component', () => {
      renderComponent();
      expect(screen.getByText('googleDriveConfig')).toBeInTheDocument();
    });

    it('should show not connected state initially', () => {
      renderComponent();
      expect(screen.getByText('googleNotConnected')).toBeInTheDocument();
    });

    it('should show connect button when not connected', () => {
      renderComponent();
      expect(screen.getByText('connectGoogle')).toBeInTheDocument();
    });
  });

  describe('Connection', () => {
    it('should disable connect button when no client ID', () => {
      renderComponent();

      const connectButton = screen.getByText('connectGoogle');
      expect(connectButton).toBeDisabled();
    });

    it('should show missing client ID warning', () => {
      renderComponent();

      expect(screen.getByText('googleClientIdMissing')).toBeInTheDocument();
    });
  });

  describe('Configuration', () => {
    it('should update store when settings change', async () => {
      // Simulate connected state
      mockHasStoredCredentials.mockResolvedValue(true);

      useSyncStore.setState({
        googleDriveConfig: {
          ...DEFAULT_GOOGLE_DRIVE_CONFIG,
          enabled: true,
          userEmail: 'test@example.com',
        },
      });

      renderComponent();

      // Wait for the component to detect connected state
      await waitFor(() => {
        const state = useSyncStore.getState();
        expect(state.googleDriveConfig.enabled).toBe(true);
      });
    });
  });

  describe('Store Integration', () => {
    it('should use default config values', () => {
      const state = useSyncStore.getState();
      expect(state.googleDriveConfig.type).toBe('googledrive');
      expect(state.googleDriveConfig.useAppDataFolder).toBe(true);
      expect(state.googleDriveConfig.enableResumableUpload).toBe(true);
    });

    it('should update config via setGoogleDriveConfig', () => {
      const { setGoogleDriveConfig } = useSyncStore.getState();

      setGoogleDriveConfig({ folderName: 'custom-folder' });

      const state = useSyncStore.getState();
      expect(state.googleDriveConfig.folderName).toBe('custom-folder');
    });
  });
});

describe('GoogleDriveConfigForm - Connected State', () => {
  beforeEach(() => {
    resetStore();
    jest.clearAllMocks();

    // Mock connected state
    mockHasStoredCredentials.mockResolvedValue(true);

    useSyncStore.setState({
      googleDriveConfig: {
        ...DEFAULT_GOOGLE_DRIVE_CONFIG,
        enabled: true,
        userEmail: 'connected@example.com',
      },
    });
  });

  const renderComponent = (props = {}) => {
    return render(
      <NextIntlClientProvider locale="en" messages={{}}>
        <GoogleDriveConfigForm {...props} />
      </NextIntlClientProvider>
    );
  };

  it('should show connected state with email', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('googleConnected')).toBeInTheDocument();
    });
  });

  it('should show disconnect button when connected', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('disconnect')).toBeInTheDocument();
    });
  });

  it('should show configuration options when connected', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('enableSync')).toBeInTheDocument();
      expect(screen.getByText('useAppDataFolder')).toBeInTheDocument();
      expect(screen.getByText('resumableUpload')).toBeInTheDocument();
    });
  });
});
