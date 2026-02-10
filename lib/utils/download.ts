/**
 * File download utility
 * Shared download logic for creating and triggering file downloads in the browser
 */

/**
 * Download content as a file in the browser
 * Creates a temporary blob URL, triggers download via anchor click, then cleans up
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
