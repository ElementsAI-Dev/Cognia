// Minimal mock for @tauri-apps/api/window

let currentWindow = {
  setPosition: jest.fn(async () => {}),
  onMoved: jest.fn(async () => () => {}),
  onResized: jest.fn(async () => () => {}),
  onScaleChanged: jest.fn(async () => () => {}),
  innerSize: jest.fn(async () => ({ width: 420, height: 600 })),
  scaleFactor: jest.fn(async () => 1),
  outerPosition: jest.fn(async () => ({ x: 100, y: 100 })),
  startDragging: jest.fn(async () => {}),
};

function __setCurrentWindow(next) {
  currentWindow = next;
}

function getCurrentWindow() {
  return currentWindow;
}

module.exports = {
  getCurrentWindow,
  __setCurrentWindow,
};
