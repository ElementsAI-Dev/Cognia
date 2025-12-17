/**
 * Mock for @tauri-apps/plugin-fs
 */

module.exports = {
  readTextFile: jest.fn(),
  readFile: jest.fn(),
  writeTextFile: jest.fn(),
  mkdir: jest.fn(),
  readDir: jest.fn(),
  stat: jest.fn(),
  exists: jest.fn(),
  remove: jest.fn(),
  copyFile: jest.fn(),
  rename: jest.fn(),
};
