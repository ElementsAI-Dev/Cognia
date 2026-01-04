/**
 * Tests for BatchExportDialog component
 * 
 * Note: This component uses complex canvas operations that are difficult to mock
 * in unit tests. Canvas interaction tests are covered in E2E tests.
 */

import { BatchExportDialog } from './batch-export-dialog';

describe('BatchExportDialog', () => {
  it('should export BatchExportDialog component', () => {
    expect(BatchExportDialog).toBeDefined();
    expect(typeof BatchExportDialog).toBe('function');
  });

  it('should have correct display name or name', () => {
    expect(BatchExportDialog.name).toBe('BatchExportDialog');
  });
});
