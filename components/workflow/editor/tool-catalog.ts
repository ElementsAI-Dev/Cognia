export interface WorkflowToolCatalogItem {
  name: string;
  label: string;
  category: string;
  description: string;
}

export const WORKFLOW_TOOL_CATALOG: WorkflowToolCatalogItem[] = [
  { name: 'web_search', label: 'Web Search', category: 'search', description: 'Search the web for information' },
  { name: 'rag_search', label: 'RAG Search', category: 'search', description: 'Search knowledge base' },
  { name: 'calculator', label: 'Calculator', category: 'system', description: 'Perform calculations' },
  { name: 'document_summarize', label: 'Document Summarize', category: 'file', description: 'Summarize documents' },
  { name: 'document_chunk', label: 'Document Chunk', category: 'file', description: 'Split documents into chunks' },
  { name: 'document_analyze', label: 'Document Analyze', category: 'file', description: 'Analyze document structure' },
  { name: 'file_read', label: 'File Read', category: 'file', description: 'Read file contents' },
  { name: 'file_write', label: 'File Write', category: 'file', description: 'Write to file' },
  { name: 'file_list', label: 'File List', category: 'file', description: 'List directory contents' },
  { name: 'file_exists', label: 'File Exists', category: 'file', description: 'Check if file exists' },
  { name: 'file_delete', label: 'File Delete', category: 'file', description: 'Delete file' },
  { name: 'file_copy', label: 'File Copy', category: 'file', description: 'Copy file' },
  { name: 'file_rename', label: 'File Rename', category: 'file', description: 'Rename/move file' },
  { name: 'file_info', label: 'File Info', category: 'file', description: 'Get file information' },
  { name: 'file_search', label: 'File Search', category: 'file', description: 'Search for files' },
  { name: 'file_append', label: 'File Append', category: 'file', description: 'Append to file' },
  { name: 'directory_create', label: 'Directory Create', category: 'file', description: 'Create directory' },
  {
    name: 'recording_start_fullscreen',
    label: 'Recording Start Fullscreen',
    category: 'recording',
    description: 'Start fullscreen screen recording',
  },
  {
    name: 'recording_start_window',
    label: 'Recording Start Window',
    category: 'recording',
    description: 'Start window screen recording',
  },
  {
    name: 'recording_start_region',
    label: 'Recording Start Region',
    category: 'recording',
    description: 'Start region screen recording',
  },
  { name: 'recording_pause', label: 'Recording Pause', category: 'recording', description: 'Pause active recording' },
  { name: 'recording_resume', label: 'Recording Resume', category: 'recording', description: 'Resume paused recording' },
  { name: 'recording_stop', label: 'Recording Stop', category: 'recording', description: 'Stop recording and save file' },
  { name: 'recording_cancel', label: 'Recording Cancel', category: 'recording', description: 'Cancel recording and discard file' },
  { name: 'recording_status', label: 'Recording Status', category: 'recording', description: 'Get current recording status' },
  { name: 'recording_duration', label: 'Recording Duration', category: 'recording', description: 'Get active recording duration' },
];

