/**
 * @jest-environment jsdom
 */
import * as EditorExports from './index';

describe('editor index exports', () => {
  it('should export MonacoSandpackEditor', () => {
    expect(EditorExports.MonacoSandpackEditor).toBeDefined();
    expect(typeof EditorExports.MonacoSandpackEditor).toBe('function');
  });

  it('should export MonacoDiffEditor', () => {
    expect(EditorExports.MonacoDiffEditor).toBeDefined();
    expect(typeof EditorExports.MonacoDiffEditor).toBe('function');
  });

  it('should export ReactSandbox', () => {
    expect(EditorExports.ReactSandbox).toBeDefined();
  });

  it('should export SandboxFileExplorer', () => {
    expect(EditorExports.SandboxFileExplorer).toBeDefined();
  });

  it('should export SandboxErrorBoundary', () => {
    expect(EditorExports.SandboxErrorBoundary).toBeDefined();
  });

  it('should export useErrorBoundaryReset hook', () => {
    expect(EditorExports.useErrorBoundaryReset).toBeDefined();
    expect(typeof EditorExports.useErrorBoundaryReset).toBe('function');
  });

  it('should export useConsoleErrorInterceptor hook', () => {
    expect(EditorExports.useConsoleErrorInterceptor).toBeDefined();
    expect(typeof EditorExports.useConsoleErrorInterceptor).toBe('function');
  });
});
