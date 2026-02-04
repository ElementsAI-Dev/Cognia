/**
 * Tests for PluginPermissionRequestDialog
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { PluginPermissionRequestDialog } from './permission-request-dialog';
import {
  resolvePluginPermission,
  subscribePermissionRequests,
} from '@/lib/plugin/security/permission-requests';
import { getPermissionGuard } from '@/lib/plugin/security/permission-guard';

jest.mock('@/lib/plugin/security/permission-requests', () => ({
  resolvePluginPermission: jest.fn(),
  requestPluginPermission: jest.fn(),
  subscribePermissionRequests: jest.fn(),
}));

jest.mock('@/lib/plugin/security/permission-guard', () => ({
  getPermissionGuard: jest.fn(),
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      title: 'Plugin Permission Request',
      description: 'Review permission request',
      pluginLabel: 'Plugin',
      permissionLabel: 'Permission',
      reasonLabel: 'Reason',
      allow: 'Allow',
      deny: 'Deny',
      kindApi: 'API',
      kindManifest: 'Manifest',
      queueNotice: `${params?.count ?? 0} more request(s) waiting`,
    };
    return translations[key] || key;
  },
}));

describe('PluginPermissionRequestDialog', () => {
  const mockGuard = {
    setRequestHandler: jest.fn(),
  };

  beforeEach(() => {
    (getPermissionGuard as jest.Mock).mockReturnValue(mockGuard);
    (subscribePermissionRequests as jest.Mock).mockImplementation((listener) => {
      listener({
        current: {
          id: 'req-1',
          pluginId: 'plugin-a',
          permission: 'session:read',
          reason: 'Need session access',
          kind: 'api',
          timestamp: Date.now(),
        },
        queue: [],
      });
      return jest.fn();
    });
  });

  it('renders a permission request', () => {
    render(<PluginPermissionRequestDialog />);

    expect(screen.getByText('Plugin Permission Request')).toBeInTheDocument();
    expect(screen.getByText('plugin-a')).toBeInTheDocument();
    expect(screen.getByText('session:read')).toBeInTheDocument();
  });

  it('resolves request on allow', () => {
    render(<PluginPermissionRequestDialog />);

    fireEvent.click(screen.getByText('Allow'));

    expect(resolvePluginPermission).toHaveBeenCalledWith('req-1', true);
  });

  it('resolves request on deny', () => {
    render(<PluginPermissionRequestDialog />);

    fireEvent.click(screen.getByText('Deny'));

    expect(resolvePluginPermission).toHaveBeenCalledWith('req-1', false);
  });
});
