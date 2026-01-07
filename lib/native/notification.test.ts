/**
 * Notification Tests
 *
 * Tests for native notification functions.
 */

jest.mock('./utils', () => ({
  isTauri: jest.fn(),
}));

jest.mock('@tauri-apps/plugin-notification', () => ({
  isPermissionGranted: jest.fn(),
  requestPermission: jest.fn(),
  sendNotification: jest.fn(),
}));

import { isTauri } from './utils';
import {
  isNotificationPermissionGranted,
  requestNotificationPermission,
  sendNotification,
  notify,
  type NotificationOptions,
} from './notification';

const mockIsTauri = isTauri as jest.MockedFunction<typeof isTauri>;

describe('Notification - isNotificationPermissionGranted', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should check browser notification permission when not in Tauri', async () => {
    mockIsTauri.mockReturnValue(false);

    // Mock browser Notification API
    const originalNotification = global.Notification;
    // @ts-expect-error - mocking Notification
    global.Notification = { permission: 'granted' };

    const result = await isNotificationPermissionGranted();
    expect(result).toBe(true);

    global.Notification = originalNotification;
  });

  it('should return false when browser Notification API is not available', async () => {
    mockIsTauri.mockReturnValue(false);

    const originalNotification = global.Notification;
    // @ts-expect-error - mocking Notification
    delete global.Notification;

    const result = await isNotificationPermissionGranted();
    expect(result).toBe(false);

    global.Notification = originalNotification;
  });

  it('should check Tauri notification permission when in Tauri', async () => {
    mockIsTauri.mockReturnValue(true);
    const { isPermissionGranted } = await import('@tauri-apps/plugin-notification');
    (isPermissionGranted as jest.Mock).mockResolvedValue(true);

    const result = await isNotificationPermissionGranted();
    expect(result).toBe(true);
    expect(isPermissionGranted).toHaveBeenCalled();
  });

  it('should return false on Tauri error', async () => {
    mockIsTauri.mockReturnValue(true);
    const { isPermissionGranted } = await import('@tauri-apps/plugin-notification');
    (isPermissionGranted as jest.Mock).mockRejectedValue(new Error('Test error'));

    const result = await isNotificationPermissionGranted();
    expect(result).toBe(false);
  });
});

describe('Notification - requestNotificationPermission', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should request browser notification permission when not in Tauri', async () => {
    mockIsTauri.mockReturnValue(false);

    const originalNotification = global.Notification;
    const mockRequestPermission = jest.fn().mockResolvedValue('granted');
    // @ts-expect-error - mocking Notification
    global.Notification = { requestPermission: mockRequestPermission };

    const result = await requestNotificationPermission();
    expect(result).toBe(true);
    expect(mockRequestPermission).toHaveBeenCalled();

    global.Notification = originalNotification;
  });

  it('should return false when browser permission is denied', async () => {
    mockIsTauri.mockReturnValue(false);

    const originalNotification = global.Notification;
    const mockRequestPermission = jest.fn().mockResolvedValue('denied');
    // @ts-expect-error - mocking Notification
    global.Notification = { requestPermission: mockRequestPermission };

    const result = await requestNotificationPermission();
    expect(result).toBe(false);

    global.Notification = originalNotification;
  });

  it('should return false when browser Notification API is not available', async () => {
    mockIsTauri.mockReturnValue(false);

    const originalNotification = global.Notification;
    // @ts-expect-error - mocking Notification
    delete global.Notification;

    const result = await requestNotificationPermission();
    expect(result).toBe(false);

    global.Notification = originalNotification;
  });

  it('should request Tauri notification permission when in Tauri', async () => {
    mockIsTauri.mockReturnValue(true);
    const { isPermissionGranted, requestPermission } = await import('@tauri-apps/plugin-notification');
    (isPermissionGranted as jest.Mock)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    (requestPermission as jest.Mock).mockResolvedValue(undefined);

    const result = await requestNotificationPermission();
    expect(result).toBe(true);
    expect(requestPermission).toHaveBeenCalled();
  });

  it('should return true if already granted in Tauri', async () => {
    mockIsTauri.mockReturnValue(true);
    const { isPermissionGranted } = await import('@tauri-apps/plugin-notification');
    (isPermissionGranted as jest.Mock).mockResolvedValue(true);

    const result = await requestNotificationPermission();
    expect(result).toBe(true);
  });

  it('should return false on Tauri error', async () => {
    mockIsTauri.mockReturnValue(true);
    const { isPermissionGranted } = await import('@tauri-apps/plugin-notification');
    (isPermissionGranted as jest.Mock).mockRejectedValue(new Error('Test error'));

    const result = await requestNotificationPermission();
    expect(result).toBe(false);
  });
});

describe('Notification - sendNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should send browser notification when not in Tauri and permission granted', async () => {
    mockIsTauri.mockReturnValue(false);

    const originalNotification = global.Notification;
    const mockNotificationConstructor = jest.fn();
    Object.defineProperty(mockNotificationConstructor, 'permission', {
      value: 'granted',
      writable: true,
    });
    // @ts-expect-error - mocking Notification
    global.Notification = mockNotificationConstructor;

    const options: NotificationOptions = {
      title: 'Test Title',
      body: 'Test Body',
      icon: 'test-icon.png',
    };

    const result = await sendNotification(options);
    expect(result).toBe(true);
    expect(mockNotificationConstructor).toHaveBeenCalledWith('Test Title', {
      body: 'Test Body',
      icon: 'test-icon.png',
    });

    global.Notification = originalNotification;
  });

  it('should return false when browser permission not granted', async () => {
    mockIsTauri.mockReturnValue(false);

    const originalNotification = global.Notification;
    const mockNotification = jest.fn();
    Object.defineProperty(mockNotification, 'permission', {
      value: 'denied',
      writable: true,
    });
    // @ts-expect-error - mocking Notification
    global.Notification = mockNotification;

    const result = await sendNotification({ title: 'Test' });
    expect(result).toBe(false);

    global.Notification = originalNotification;
  });

  it('should send Tauri notification when in Tauri', async () => {
    mockIsTauri.mockReturnValue(true);
    const { sendNotification: tauriNotify } = await import('@tauri-apps/plugin-notification');
    (tauriNotify as jest.Mock).mockResolvedValue(undefined);

    const options: NotificationOptions = {
      title: 'Test Title',
      body: 'Test Body',
      sound: 'default',
    };

    const result = await sendNotification(options);
    expect(result).toBe(true);
    expect(tauriNotify).toHaveBeenCalledWith({
      title: 'Test Title',
      body: 'Test Body',
      sound: 'default',
    });
  });

  it('should only include defined properties in Tauri notification', async () => {
    mockIsTauri.mockReturnValue(true);
    const { sendNotification: tauriNotify } = await import('@tauri-apps/plugin-notification');
    (tauriNotify as jest.Mock).mockResolvedValue(undefined);

    const result = await sendNotification({ title: 'Only Title' });
    expect(result).toBe(true);
    expect(tauriNotify).toHaveBeenCalledWith({
      title: 'Only Title',
    });
  });

  it('should return false on Tauri error', async () => {
    mockIsTauri.mockReturnValue(true);
    const { sendNotification: tauriNotify } = await import('@tauri-apps/plugin-notification');
    (tauriNotify as jest.Mock).mockRejectedValue(new Error('Test error'));

    const result = await sendNotification({ title: 'Test' });
    expect(result).toBe(false);
  });
});

describe('Notification - notify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call sendNotification with title and body', async () => {
    mockIsTauri.mockReturnValue(true);
    const { sendNotification: tauriNotify } = await import('@tauri-apps/plugin-notification');
    (tauriNotify as jest.Mock).mockResolvedValue(undefined);

    const result = await notify('Simple Title', 'Simple Body');
    expect(result).toBe(true);
    expect(tauriNotify).toHaveBeenCalledWith({
      title: 'Simple Title',
      body: 'Simple Body',
    });
  });

  it('should work with only title', async () => {
    mockIsTauri.mockReturnValue(true);
    const { sendNotification: tauriNotify } = await import('@tauri-apps/plugin-notification');
    (tauriNotify as jest.Mock).mockResolvedValue(undefined);

    const result = await notify('Only Title');
    expect(result).toBe(true);
    expect(tauriNotify).toHaveBeenCalledWith({
      title: 'Only Title',
    });
  });
});
