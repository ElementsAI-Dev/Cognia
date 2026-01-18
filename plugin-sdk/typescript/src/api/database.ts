/**
 * Database API Types
 *
 * @description Type definitions for database operations in plugins.
 */

/**
 * Database API for local database operations
 *
 * @remarks
 * Provides SQLite database operations with transaction support.
 *
 * @example
 * ```typescript
 * // Create a table
 * await context.db.createTable('users', {
 *   columns: [
 *     { name: 'id', type: 'integer', nullable: false },
 *     { name: 'name', type: 'text', nullable: false },
 *     { name: 'email', type: 'text', nullable: false, unique: true },
 *   ],
 *   primaryKey: 'id',
 * });
 *
 * // Execute a query
 * const users = await context.db.query<User>('SELECT * FROM users');
 *
 * // Execute a statement
 * const result = await context.db.execute(
 *   'INSERT INTO users (name, email) VALUES (?, ?)',
 *   ['John', 'john@example.com']
 * );
 *
 * // Transaction
 * await context.db.transaction(async (tx) => {
 *   await tx.execute('INSERT INTO users (name) VALUES (?)', ['Alice']);
 *   await tx.execute('INSERT INTO users (name) VALUES (?)', ['Bob']);
 * });
 * ```
 */
export interface PluginDatabaseAPI {
  query: <T>(sql: string, params?: unknown[]) => Promise<T[]>;
  execute: (sql: string, params?: unknown[]) => Promise<DatabaseResult>;
  transaction: <T>(fn: (tx: DatabaseTransaction) => Promise<T>) => Promise<T>;
  createTable: (name: string, schema: TableSchema) => Promise<void>;
  dropTable: (name: string) => Promise<void>;
  tableExists: (name: string) => Promise<boolean>;
}

/**
 * Database result
 */
export interface DatabaseResult {
  rowsAffected: number;
  lastInsertId?: number;
}

/**
 * Database transaction
 */
export interface DatabaseTransaction {
  query: <T>(sql: string, params?: unknown[]) => Promise<T[]>;
  execute: (sql: string, params?: unknown[]) => Promise<DatabaseResult>;
}

/**
 * Table schema
 */
export interface TableSchema {
  columns: TableColumn[];
  primaryKey?: string | string[];
  indexes?: TableIndex[];
}

/**
 * Table column
 */
export interface TableColumn {
  name: string;
  type: 'text' | 'integer' | 'real' | 'blob' | 'boolean' | 'datetime';
  nullable?: boolean;
  default?: unknown;
  unique?: boolean;
}

/**
 * Table index
 */
export interface TableIndex {
  name: string;
  columns: string[];
  unique?: boolean;
}
