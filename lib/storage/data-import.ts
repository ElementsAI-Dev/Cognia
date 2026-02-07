/**
 * Data Import Utilities
 * Comprehensive data import with validation and merge strategies
 */

import {
  db,
  type DBSession,
  type DBMessage,
  type DBDocument,
  type DBProject,
  type DBWorkflow,
  type DBWorkflowExecution,
  type DBSummary,
  type DBKnowledgeFile,
  type DBAgentTrace,
  type DBFolder,
  type DBMCPServer,
} from '@/lib/db';
import type { Session, Artifact } from '@/types';

/**
 * Export data structure
 */
export interface ExportData {
  version: string;
  exportedAt: string;
  checksum?: string;
  sessions?: Session[];
  settings?: Record<string, unknown>;
  artifacts?: Record<string, Artifact>;
  canvasDocuments?: Record<string, unknown>;
  indexedDB?: {
    sessions?: DBSession[];
    messages?: DBMessage[];
    documents?: DBDocument[];
    projects?: DBProject[];
    workflows?: DBWorkflow[];
    workflowExecutions?: DBWorkflowExecution[];
    summaries?: DBSummary[];
    knowledgeFiles?: DBKnowledgeFile[];
    agentTraces?: DBAgentTrace[];
    folders?: DBFolder[];
    mcpServers?: DBMCPServer[];
  };
}

/**
 * Import options
 */
export interface ImportOptions {
  /** Merge strategy for existing data */
  mergeStrategy: 'replace' | 'merge' | 'skip';
  /** Generate new IDs for imported data */
  generateNewIds: boolean;
  /** Validate data before import */
  validateData: boolean;
  /** Import specific categories only */
  categories?: ('sessions' | 'settings' | 'artifacts' | 'indexedDB')[];
}

/**
 * Import result
 */
export interface ImportResult {
  success: boolean;
  imported: {
    sessions: number;
    messages: number;
    artifacts: number;
    documents: number;
    projects: number;
    settings: boolean;
  };
  skipped: {
    sessions: number;
    messages: number;
    artifacts: number;
  };
  errors: ImportError[];
  warnings: string[];
  duration: number;
}

/**
 * Import error
 */
export interface ImportError {
  category: string;
  id?: string;
  message: string;
}

/**
 * Default import options
 */
const DEFAULT_IMPORT_OPTIONS: ImportOptions = {
  mergeStrategy: 'merge',
  generateNewIds: false,
  validateData: true,
};

/**
 * Validate export data structure
 */
export function validateExportData(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    errors.push('Invalid data format: expected object');
    return { valid: false, errors };
  }

  const exportData = data as Record<string, unknown>;

  // Check version
  if (!exportData.version || typeof exportData.version !== 'string') {
    errors.push('Missing or invalid version field');
  }

  // Check exportedAt
  if (!exportData.exportedAt || typeof exportData.exportedAt !== 'string') {
    errors.push('Missing or invalid exportedAt field');
  }

  // Validate sessions if present
  if (exportData.sessions !== undefined) {
    if (!Array.isArray(exportData.sessions)) {
      errors.push('sessions must be an array');
    }
  }

  // Validate artifacts if present
  if (exportData.artifacts !== undefined) {
    if (typeof exportData.artifacts !== 'object') {
      errors.push('artifacts must be an object');
    }
  }

  // Validate indexedDB if present
  if (exportData.indexedDB !== undefined) {
    if (typeof exportData.indexedDB !== 'object') {
      errors.push('indexedDB must be an object');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Generate a simple checksum for data integrity
 */
export function generateChecksum(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Verify checksum
 */
export function verifyChecksum(data: string, checksum: string): boolean {
  return generateChecksum(data) === checksum;
}

/**
 * Import full backup data
 */
export async function importFullBackup(
  data: ExportData,
  options: Partial<ImportOptions> = {}
): Promise<ImportResult> {
  const opts = { ...DEFAULT_IMPORT_OPTIONS, ...options };
  const startTime = Date.now();

  const result: ImportResult = {
    success: true,
    imported: {
      sessions: 0,
      messages: 0,
      artifacts: 0,
      documents: 0,
      projects: 0,
      settings: false,
    },
    skipped: {
      sessions: 0,
      messages: 0,
      artifacts: 0,
    },
    errors: [],
    warnings: [],
    duration: 0,
  };

  try {
    // Validate data if enabled
    if (opts.validateData) {
      const validation = validateExportData(data);
      if (!validation.valid) {
        result.success = false;
        result.errors = validation.errors.map((msg) => ({
          category: 'validation',
          message: msg,
        }));
        result.duration = Date.now() - startTime;
        return result;
      }
    }

    // Import sessions to Zustand store
    if (data.sessions && (!opts.categories || opts.categories.includes('sessions'))) {
      const sessionResult = await importSessions(data.sessions, opts);
      result.imported.sessions = sessionResult.imported;
      result.skipped.sessions = sessionResult.skipped;
      result.errors.push(...sessionResult.errors);
      result.warnings.push(...sessionResult.warnings);
    }

    // Import settings
    if (data.settings && (!opts.categories || opts.categories.includes('settings'))) {
      try {
        await importSettings(data.settings, opts);
        result.imported.settings = true;
      } catch (error) {
        result.errors.push({
          category: 'settings',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Import artifacts
    if (data.artifacts && (!opts.categories || opts.categories.includes('artifacts'))) {
      const artifactResult = await importArtifacts(data.artifacts, opts);
      result.imported.artifacts = artifactResult.imported;
      result.skipped.artifacts = artifactResult.skipped;
      result.errors.push(...artifactResult.errors);
    }

    // Import IndexedDB data
    if (data.indexedDB && (!opts.categories || opts.categories.includes('indexedDB'))) {
      const idbResult = await importIndexedDB(data.indexedDB, opts);
      result.imported.messages = idbResult.messages;
      result.imported.documents = idbResult.documents;
      result.imported.projects = idbResult.projects;
      result.errors.push(...idbResult.errors);
      if (idbResult.workflows > 0) result.warnings.push(`Imported ${idbResult.workflows} workflows`);
      if (idbResult.summaries > 0) result.warnings.push(`Imported ${idbResult.summaries} summaries`);
      if (idbResult.knowledgeFiles > 0) result.warnings.push(`Imported ${idbResult.knowledgeFiles} knowledge files`);
      if (idbResult.agentTraces > 0) result.warnings.push(`Imported ${idbResult.agentTraces} agent traces`);
      if (idbResult.folders > 0) result.warnings.push(`Imported ${idbResult.folders} folders`);
    }

    result.success = result.errors.length === 0;
  } catch (error) {
    result.success = false;
    result.errors.push({
      category: 'global',
      message: error instanceof Error ? error.message : String(error),
    });
  }

  result.duration = Date.now() - startTime;
  return result;
}

/**
 * Import sessions
 */
async function importSessions(
  sessions: Session[],
  options: ImportOptions
): Promise<{ imported: number; skipped: number; errors: ImportError[]; warnings: string[] }> {
  const errors: ImportError[] = [];
  const warnings: string[] = [];
  let imported = 0;
  let skipped = 0;

  // Dynamic import to avoid circular dependencies
  const { useSessionStore } = await import('@/stores');
  const store = useSessionStore.getState();

  for (const session of sessions) {
    try {
      const existingSession = store.sessions.find((s) => s.id === session.id);

      if (existingSession) {
        if (options.mergeStrategy === 'skip') {
          skipped++;
          continue;
        } else if (options.mergeStrategy === 'replace') {
          // Delete existing and add new
          store.deleteSession(session.id);
        }
        // For 'merge', we'll add with new ID
      }

      // Generate new ID if needed
      const newSession = options.generateNewIds || (existingSession && options.mergeStrategy === 'merge')
        ? { ...session, id: crypto.randomUUID() }
        : session;

      // Use store's createSession method
      store.createSession({
        title: newSession.title || 'Imported Session',
        provider: newSession.provider || 'openai',
        model: newSession.model || 'gpt-4',
        mode: newSession.mode || 'chat',
      });

      imported++;
    } catch (error) {
      errors.push({
        category: 'sessions',
        id: session.id,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (imported > 0) {
    warnings.push(`Imported ${imported} sessions`);
  }

  return { imported, skipped, errors, warnings };
}

/**
 * Import settings
 */
async function importSettings(
  settings: Record<string, unknown>,
  options: ImportOptions
): Promise<void> {
  const { useSettingsStore } = await import('@/stores');
  const store = useSettingsStore.getState();

  // Import theme
  if (settings.theme && typeof settings.theme === 'string') {
    store.setTheme(settings.theme as 'light' | 'dark' | 'system');
  }

  // Import provider settings
  if (settings.providerSettings && typeof settings.providerSettings === 'object') {
    const providerSettings = settings.providerSettings as Record<string, Record<string, unknown>>;
    for (const [providerId, providerConfig] of Object.entries(providerSettings)) {
      if (options.mergeStrategy === 'replace' || !store.providerSettings[providerId]) {
        store.updateProviderSettings(providerId, providerConfig);
      }
    }
  }

  // Import default provider
  if (settings.defaultProvider && typeof settings.defaultProvider === 'string') {
    store.setDefaultProvider(settings.defaultProvider);
  }
}

/**
 * Import artifacts
 */
async function importArtifacts(
  artifacts: Record<string, Artifact>,
  options: ImportOptions
): Promise<{ imported: number; skipped: number; errors: ImportError[] }> {
  const errors: ImportError[] = [];
  let imported = 0;
  let skipped = 0;

  const { useArtifactStore } = await import('@/stores');
  const store = useArtifactStore.getState();

  for (const [id, artifact] of Object.entries(artifacts)) {
    try {
      const existingArtifact = store.artifacts[id];

      if (existingArtifact) {
        if (options.mergeStrategy === 'skip') {
          skipped++;
          continue;
        }
      }

      // Generate new ID if needed
      const newId = options.generateNewIds ? crypto.randomUUID() : id;
      const newArtifact = { ...artifact, id: newId };

      // Use createArtifact for new artifacts
      store.createArtifact({
        sessionId: newArtifact.sessionId || '',
        messageId: newArtifact.messageId || '',
        type: newArtifact.type || 'code',
        title: newArtifact.title || 'Imported Artifact',
        content: newArtifact.content || '',
        language: newArtifact.language,
      });
      imported++;
    } catch (error) {
      errors.push({
        category: 'artifacts',
        id,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { imported, skipped, errors };
}

/**
 * Import IndexedDB data
 */
interface IndexedDBImportResult {
  messages: number;
  documents: number;
  projects: number;
  workflows: number;
  workflowExecutions: number;
  summaries: number;
  knowledgeFiles: number;
  agentTraces: number;
  folders: number;
  mcpServers: number;
  errors: ImportError[];
}

/**
 * Generic bulk import helper for a single IndexedDB table
 */
async function importTable<T extends { id: string }>(
  items: T[] | undefined,
  table: { put: (item: T) => Promise<string> },
  tableName: string,
  options: ImportOptions
): Promise<{ imported: number; errors: ImportError[] }> {
  const errors: ImportError[] = [];
  let imported = 0;

  if (!items || items.length === 0) return { imported, errors };

  for (const item of items) {
    try {
      const newItem = options.generateNewIds
        ? { ...item, id: crypto.randomUUID() }
        : item;
      await table.put(newItem);
      imported++;
    } catch (error) {
      errors.push({
        category: `indexedDB.${tableName}`,
        id: item.id,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { imported, errors };
}

async function importIndexedDB(
  data: NonNullable<ExportData['indexedDB']>,
  options: ImportOptions
): Promise<IndexedDBImportResult> {
  const errors: ImportError[] = [];
  const counts: Omit<IndexedDBImportResult, 'errors'> = {
    messages: 0,
    documents: 0,
    projects: 0,
    workflows: 0,
    workflowExecutions: 0,
    summaries: 0,
    knowledgeFiles: 0,
    agentTraces: 0,
    folders: 0,
    mcpServers: 0,
  };

  try {
    // Clear existing data if replace strategy
    if (options.mergeStrategy === 'replace') {
      await Promise.all([
        db.sessions.clear(),
        db.messages.clear(),
        db.documents.clear(),
        db.projects.clear(),
        db.workflows.clear(),
        db.workflowExecutions.clear(),
        db.summaries.clear(),
        db.knowledgeFiles.clear(),
        db.agentTraces.clear(),
        db.folders.clear(),
        db.mcpServers.clear(),
      ]);
    }

    // Import sessions first (other tables may reference them)
    const sessionResult = await importTable(
      data.sessions,
      db.sessions,
      'sessions',
      options
    );
    errors.push(...sessionResult.errors);

    // Import messages
    const msgResult = await importTable(data.messages, db.messages, 'messages', options);
    counts.messages = msgResult.imported;
    errors.push(...msgResult.errors);

    // Import documents
    const docResult = await importTable(data.documents, db.documents, 'documents', options);
    counts.documents = docResult.imported;
    errors.push(...docResult.errors);

    // Import projects
    const projResult = await importTable(data.projects, db.projects, 'projects', options);
    counts.projects = projResult.imported;
    errors.push(...projResult.errors);

    // Import workflows
    const wfResult = await importTable(data.workflows, db.workflows, 'workflows', options);
    counts.workflows = wfResult.imported;
    errors.push(...wfResult.errors);

    // Import workflow executions
    const wfeResult = await importTable(data.workflowExecutions, db.workflowExecutions, 'workflowExecutions', options);
    counts.workflowExecutions = wfeResult.imported;
    errors.push(...wfeResult.errors);

    // Import summaries
    const sumResult = await importTable(data.summaries, db.summaries, 'summaries', options);
    counts.summaries = sumResult.imported;
    errors.push(...sumResult.errors);

    // Import knowledge files
    const kfResult = await importTable(data.knowledgeFiles, db.knowledgeFiles, 'knowledgeFiles', options);
    counts.knowledgeFiles = kfResult.imported;
    errors.push(...kfResult.errors);

    // Import agent traces
    const atResult = await importTable(data.agentTraces, db.agentTraces, 'agentTraces', options);
    counts.agentTraces = atResult.imported;
    errors.push(...atResult.errors);

    // Import folders
    const folderResult = await importTable(data.folders, db.folders, 'folders', options);
    counts.folders = folderResult.imported;
    errors.push(...folderResult.errors);

    // Import MCP servers
    const mcpResult = await importTable(data.mcpServers, db.mcpServers, 'mcpServers', options);
    counts.mcpServers = mcpResult.imported;
    errors.push(...mcpResult.errors);
  } catch (error) {
    errors.push({
      category: 'indexedDB',
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return { ...counts, errors };
}

/**
 * Parse and validate import file
 */
export async function parseImportFile(file: File): Promise<{
  data: ExportData | null;
  errors: string[];
}> {
  const errors: string[] = [];

  try {
    const text = await file.text();
    const data = JSON.parse(text) as ExportData;

    // Validate checksum if present
    if (data.checksum) {
      // Remove checksum from data for verification
      const dataWithoutChecksum = { ...data };
      delete dataWithoutChecksum.checksum;
      const dataString = JSON.stringify(dataWithoutChecksum);

      if (!verifyChecksum(dataString, data.checksum)) {
        errors.push('Checksum verification failed - data may be corrupted');
      }
    }

    // Validate structure
    const validation = validateExportData(data);
    if (!validation.valid) {
      errors.push(...validation.errors);
      return { data: null, errors };
    }

    return { data, errors };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Failed to parse import file');
    return { data: null, errors };
  }
}
