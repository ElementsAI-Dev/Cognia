/**
 * Database API Tests
 *
 * @description Tests for database API type definitions.
 */

import type {
  PluginDatabaseAPI,
  DatabaseResult,
  DatabaseTransaction,
  TableSchema,
  TableColumn,
  TableIndex,
} from './database';

describe('Database API Types', () => {
  describe('DatabaseResult', () => {
    it('should create a valid result with rows affected', () => {
      const result: DatabaseResult = {
        rowsAffected: 5,
      };

      expect(result.rowsAffected).toBe(5);
      expect(result.lastInsertId).toBeUndefined();
    });

    it('should create a result with last insert id', () => {
      const result: DatabaseResult = {
        rowsAffected: 1,
        lastInsertId: 42,
      };

      expect(result.rowsAffected).toBe(1);
      expect(result.lastInsertId).toBe(42);
    });
  });

  describe('DatabaseTransaction', () => {
    it('should define transaction methods', () => {
      const mockTx: DatabaseTransaction = {
        query: jest.fn(),
        execute: jest.fn(),
      };

      expect(mockTx.query).toBeDefined();
      expect(mockTx.execute).toBeDefined();
    });

    it('should call query in transaction', async () => {
      const mockTx: DatabaseTransaction = {
        query: jest.fn().mockResolvedValue([{ id: 1, name: 'Test' }]),
        execute: jest.fn(),
      };

      const results = await mockTx.query<{ id: number; name: string }>(
        'SELECT * FROM users WHERE id = ?',
        [1],
      );

      expect(mockTx.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = ?', [1]);
      expect(results[0].id).toBe(1);
    });

    it('should call execute in transaction', async () => {
      const mockTx: DatabaseTransaction = {
        query: jest.fn(),
        execute: jest.fn().mockResolvedValue({ rowsAffected: 1 }),
      };

      const result = await mockTx.execute(
        'INSERT INTO users (name) VALUES (?)',
        ['John'],
      );

      expect(mockTx.execute).toHaveBeenCalledWith('INSERT INTO users (name) VALUES (?)', ['John']);
      expect(result.rowsAffected).toBe(1);
    });
  });

  describe('TableColumn', () => {
    it('should create a text column', () => {
      const column: TableColumn = {
        name: 'name',
        type: 'text',
        nullable: false,
      };

      expect(column.name).toBe('name');
      expect(column.type).toBe('text');
      expect(column.nullable).toBe(false);
    });

    it('should create an integer column with default', () => {
      const column: TableColumn = {
        name: 'count',
        type: 'integer',
        nullable: true,
        default: 0,
      };

      expect(column.type).toBe('integer');
      expect(column.default).toBe(0);
    });

    it('should create a unique column', () => {
      const column: TableColumn = {
        name: 'email',
        type: 'text',
        nullable: false,
        unique: true,
      };

      expect(column.unique).toBe(true);
    });

    it('should support all column types', () => {
      const types: TableColumn['type'][] = [
        'text',
        'integer',
        'real',
        'blob',
        'boolean',
        'datetime',
      ];

      expect(types).toContain('text');
      expect(types).toContain('integer');
      expect(types).toContain('real');
      expect(types).toContain('blob');
      expect(types).toContain('boolean');
      expect(types).toContain('datetime');
      expect(types).toHaveLength(6);
    });
  });

  describe('TableIndex', () => {
    it('should create a simple index', () => {
      const index: TableIndex = {
        name: 'idx_name',
        columns: ['name'],
      };

      expect(index.name).toBe('idx_name');
      expect(index.columns).toEqual(['name']);
    });

    it('should create a unique index', () => {
      const index: TableIndex = {
        name: 'idx_email_unique',
        columns: ['email'],
        unique: true,
      };

      expect(index.unique).toBe(true);
    });

    it('should create a composite index', () => {
      const index: TableIndex = {
        name: 'idx_user_project',
        columns: ['user_id', 'project_id'],
      };

      expect(index.columns).toHaveLength(2);
    });
  });

  describe('TableSchema', () => {
    it('should create a valid table schema', () => {
      const schema: TableSchema = {
        columns: [
          { name: 'id', type: 'integer', nullable: false },
          { name: 'name', type: 'text', nullable: false },
          { name: 'email', type: 'text', nullable: false, unique: true },
          { name: 'created_at', type: 'datetime', nullable: true },
        ],
        primaryKey: 'id',
        indexes: [
          { name: 'idx_email', columns: ['email'], unique: true },
        ],
      };

      expect(schema.columns).toHaveLength(4);
      expect(schema.primaryKey).toBe('id');
      expect(schema.indexes).toHaveLength(1);
    });

    it('should create schema with composite primary key', () => {
      const schema: TableSchema = {
        columns: [
          { name: 'user_id', type: 'integer', nullable: false },
          { name: 'project_id', type: 'integer', nullable: false },
          { name: 'role', type: 'text', nullable: false },
        ],
        primaryKey: ['user_id', 'project_id'],
      };

      expect(schema.primaryKey).toEqual(['user_id', 'project_id']);
    });

    it('should create schema without indexes', () => {
      const schema: TableSchema = {
        columns: [
          { name: 'id', type: 'integer', nullable: false },
          { name: 'data', type: 'text', nullable: true },
        ],
        primaryKey: 'id',
      };

      expect(schema.indexes).toBeUndefined();
    });
  });

  describe('PluginDatabaseAPI', () => {
    it('should define all required API methods', () => {
      const mockAPI: PluginDatabaseAPI = {
        query: jest.fn(),
        execute: jest.fn(),
        transaction: jest.fn(),
        createTable: jest.fn(),
        dropTable: jest.fn(),
        tableExists: jest.fn(),
      };

      expect(mockAPI.query).toBeDefined();
      expect(mockAPI.execute).toBeDefined();
      expect(mockAPI.transaction).toBeDefined();
      expect(mockAPI.createTable).toBeDefined();
      expect(mockAPI.dropTable).toBeDefined();
      expect(mockAPI.tableExists).toBeDefined();
    });

    it('should call query correctly', async () => {
      interface User {
        id: number;
        name: string;
        email: string;
      }

      const mockAPI: PluginDatabaseAPI = {
        query: jest.fn().mockResolvedValue([
          { id: 1, name: 'John', email: 'john@example.com' },
          { id: 2, name: 'Jane', email: 'jane@example.com' },
        ]),
        execute: jest.fn(),
        transaction: jest.fn(),
        createTable: jest.fn(),
        dropTable: jest.fn(),
        tableExists: jest.fn(),
      };

      const users = await mockAPI.query<User>('SELECT * FROM users');

      expect(mockAPI.query).toHaveBeenCalledWith('SELECT * FROM users');
      expect(users).toHaveLength(2);
      expect(users[0].name).toBe('John');
    });

    it('should call execute with parameters', async () => {
      const mockAPI: PluginDatabaseAPI = {
        query: jest.fn(),
        execute: jest.fn().mockResolvedValue({ rowsAffected: 1, lastInsertId: 3 }),
        transaction: jest.fn(),
        createTable: jest.fn(),
        dropTable: jest.fn(),
        tableExists: jest.fn(),
      };

      const result = await mockAPI.execute(
        'INSERT INTO users (name, email) VALUES (?, ?)',
        ['Bob', 'bob@example.com'],
      );

      expect(mockAPI.execute).toHaveBeenCalledWith(
        'INSERT INTO users (name, email) VALUES (?, ?)',
        ['Bob', 'bob@example.com'],
      );
      expect(result.lastInsertId).toBe(3);
    });

    it('should handle transactions', async () => {
      const mockAPI: PluginDatabaseAPI = {
        query: jest.fn(),
        execute: jest.fn(),
        transaction: jest.fn().mockImplementation(async (fn) => {
          const mockTx: DatabaseTransaction = {
            query: jest.fn(),
            execute: jest.fn().mockResolvedValue({ rowsAffected: 1 }),
          };
          return fn(mockTx);
        }),
        createTable: jest.fn(),
        dropTable: jest.fn(),
        tableExists: jest.fn(),
      };

      await mockAPI.transaction(async (tx) => {
        await tx.execute('INSERT INTO users (name) VALUES (?)', ['Alice']);
        await tx.execute('INSERT INTO users (name) VALUES (?)', ['Bob']);
      });

      expect(mockAPI.transaction).toHaveBeenCalled();
    });

    it('should create and drop tables', async () => {
      const mockAPI: PluginDatabaseAPI = {
        query: jest.fn(),
        execute: jest.fn(),
        transaction: jest.fn(),
        createTable: jest.fn().mockResolvedValue(undefined),
        dropTable: jest.fn().mockResolvedValue(undefined),
        tableExists: jest.fn().mockResolvedValue(true),
      };

      const schema: TableSchema = {
        columns: [
          { name: 'id', type: 'integer', nullable: false },
          { name: 'name', type: 'text', nullable: false },
        ],
        primaryKey: 'id',
      };

      await mockAPI.createTable('users', schema);
      expect(mockAPI.createTable).toHaveBeenCalledWith('users', schema);

      const exists = await mockAPI.tableExists('users');
      expect(exists).toBe(true);

      await mockAPI.dropTable('users');
      expect(mockAPI.dropTable).toHaveBeenCalledWith('users');
    });
  });
});
