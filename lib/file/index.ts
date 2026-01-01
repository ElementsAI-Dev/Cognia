/**
 * File operations module
 */

export {
  readTextFile,
  readBinaryFile,
  writeTextFile,
  listDirectory,
  exists,
  deleteFile,
  createDirectory,
  copyFile,
  renameFile,
  openFileDialog,
  saveFileDialog,
  getFileInfo,
  searchFiles,
  appendTextFile,
  isInTauri,
  watchPath,
  watchPathImmediate,
  truncateFile,
  lstat,
  readTextFileFromBaseDir,
  writeTextFileToBaseDir,
  existsInBaseDir,
  createDirectoryInBaseDir,
  deleteFileInBaseDir,
  BaseDirectory,
  type FileInfo,
  type DirectoryContents,
  type FileReadResult,
  type FileWriteResult,
  type FileOperationOptions,
  type WatchOptions,
  type WatchEvent,
} from './file-operations';
export * from './clipboard';
