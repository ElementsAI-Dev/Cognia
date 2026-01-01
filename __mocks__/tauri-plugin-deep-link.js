/**
 * Mock for @tauri-apps/plugin-deep-link
 */

module.exports = {
  getCurrent: jest.fn(),
  onOpenUrl: jest.fn(),
  register: jest.fn(),
  unregister: jest.fn(),
  isRegistered: jest.fn(),
};
