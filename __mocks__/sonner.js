// Mock for sonner toast library
module.exports = {
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn(),
    promise: jest.fn(),
  },
  Toaster: () => null,
};
