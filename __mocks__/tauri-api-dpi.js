// Minimal mock for @tauri-apps/api/dpi

class PhysicalPosition {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

module.exports = {
  PhysicalPosition,
};
