/**
 * File operations module
 */

export {
  // File I/O
  readTextFile,
  readBinaryFile,
  writeTextFile,
  writeBinaryFile,
  appendTextFile,
  
  // Directory operations
  listDirectory,
  createDirectory,
  
  // File management
  exists,
  deleteFile,
  copyFile,
  renameFile,
  getFileInfo,
  searchFiles,
  
  // Dialogs
  openFileDialog,
  saveFileDialog,
  
  // Utilities
  isInTauri,
  
  // File watching
  watchPath,
  watchPathImmediate,
  
  // Advanced operations
  truncateFile,
  lstat,
  
  // Base directory operations
  readTextFileFromBaseDir,
  writeTextFileToBaseDir,
  existsInBaseDir,
  createDirectoryInBaseDir,
  deleteFileInBaseDir,
  BaseDirectory,
  
  // Error codes
  FileErrorCode,
  
  // Types
  type FileInfo,
  type DirectoryContents,
  type FileReadResult,
  type FileWriteResult,
  type FileOperationOptions,
  type WatchOptions,
  type WatchEvent,
} from './file-operations';
export * from './clipboard';
