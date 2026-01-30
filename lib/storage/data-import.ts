/**
 * Data Import Utilities
 * Comprehensive data import with validation and merge strategies
 */

import { db, type DBSession, type DBMessage, type DBDocument, type DBProject } from '@/lib/db';
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
async function importIndexedDB(
  data: NonNullable<ExportData['indexedDB']>,
  options: ImportOptions
): Promise<{ messages: number; documents: number; projects: number; errors: ImportError[] }> {
  const errors: ImportError[] = [];
  let messages = 0;
  let documents = 0;
  let projects = 0;

  try {
    // Clear existing data if replace strategy
    if (options.mergeStrategy === 'replace') {
      await db.messages.clear();
      await db.documents.clear();
      await db.projects.clear();
    }

    // Import sessions
    if (data.sessions && data.sessions.length > 0) {
      for (const session of data.sessions) {
        try {
          const newSession = options.generateNewIds
            ? { ...session, id: crypto.randomUUID() }
            : session;
          await db.sessions.put(newSession);
        } catch (error) {
          errors.push({
            category: 'indexedDB.sessions',
            id: session.id,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    // Import messages
    if (data.messages && data.messages.length > 0) {
      for (const message of data.messages) {
        try {
          const newMessage = options.generateNewIds
            ? { ...message, id: crypto.randomUUID() }
            : message;
          await db.messages.put(newMessage);
          messages++;
        } catch (error) {
          errors.push({
            category: 'indexedDB.messages',
            id: message.id,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    // Import documents
    if (data.documents && data.documents.length > 0) {
      for (const doc of data.documents) {
        try {
          const newDoc = options.generateNewIds
            ? { ...doc, id: crypto.randomUUID() }
            : doc;
          await db.documents.put(newDoc);
          documents++;
        } catch (error) {
          errors.push({
            category: 'indexedDB.documents',
            id: doc.id,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    // Import projects
    if (data.projects && data.projects.length > 0) {
      for (const project of data.projects) {
        try {
          const newProject = options.generateNewIds
            ? { ...project, id: crypto.randomUUID() }
            : project;
          await db.projects.put(newProject);
          projects++;
        } catch (error) {
          errors.push({
            category: 'indexedDB.projects',
            id: project.id,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
  } catch (error) {
    errors.push({
      category: 'indexedDB',
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return { messages, documents, projects, errors };
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
