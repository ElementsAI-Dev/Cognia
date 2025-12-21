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
  type FileInfo,
  type DirectoryContents,
  type FileReadResult,
  type FileWriteResult,
  type FileOperationOptions,
} from './file-operations';
export * from './clipboard';
