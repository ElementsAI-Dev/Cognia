/**
 * Schema Helpers Tests
 *
 * @description Tests for JSON Schema helper functions.
 */

import { Schema, parameters } from './schema';

describe('Schema Helpers', () => {
  describe('Schema.string', () => {
    it('should create a basic string schema', () => {
      const schema = Schema.string('User name');

      expect(schema.type).toBe('string');
      expect(schema.description).toBe('User name');
    });

    it('should create a string schema without description', () => {
      const schema = Schema.string();

      expect(schema.type).toBe('string');
      expect(schema.description).toBeUndefined();
    });

    it('should create a string schema with enum', () => {
      const schema = Schema.string('Language', {
        enum: ['en', 'es', 'fr', 'de'],
      });

      expect(schema.type).toBe('string');
      expect(schema.enum).toEqual(['en', 'es', 'fr', 'de']);
    });

    it('should create a string schema with length constraints', () => {
      const schema = Schema.string('Username', {
        minLength: 3,
        maxLength: 50,
      });

      expect(schema.minLength).toBe(3);
      expect(schema.maxLength).toBe(50);
    });

    it('should create a string schema with all options', () => {
      const schema = Schema.string('Code', {
        enum: ['A', 'B', 'C'],
        minLength: 1,
        maxLength: 1,
      });

      expect(schema.type).toBe('string');
      expect(schema.description).toBe('Code');
      expect(schema.enum).toHaveLength(3);
      expect(schema.minLength).toBe(1);
      expect(schema.maxLength).toBe(1);
    });
  });

  describe('Schema.number', () => {
    it('should create a basic number schema', () => {
      const schema = Schema.number('Count');

      expect(schema.type).toBe('number');
      expect(schema.description).toBe('Count');
    });

    it('should create a number schema without description', () => {
      const schema = Schema.number();

      expect(schema.type).toBe('number');
      expect(schema.description).toBeUndefined();
    });

    it('should create a number schema with constraints', () => {
      const schema = Schema.number('Score', {
        minimum: 0,
        maximum: 100,
      });

      expect(schema.minimum).toBe(0);
      expect(schema.maximum).toBe(100);
    });

    it('should create a number schema with only minimum', () => {
      const schema = Schema.number('Positive', { minimum: 0 });

      expect(schema.minimum).toBe(0);
      expect(schema.maximum).toBeUndefined();
    });

    it('should create a number schema with only maximum', () => {
      const schema = Schema.number('Limited', { maximum: 1000 });

      expect(schema.minimum).toBeUndefined();
      expect(schema.maximum).toBe(1000);
    });
  });

  describe('Schema.integer', () => {
    it('should create a basic integer schema', () => {
      const schema = Schema.integer('Count');

      expect(schema.type).toBe('integer');
      expect(schema.description).toBe('Count');
    });

    it('should create an integer schema without description', () => {
      const schema = Schema.integer();

      expect(schema.type).toBe('integer');
    });

    it('should create an integer schema with constraints', () => {
      const schema = Schema.integer('Page', {
        minimum: 1,
        maximum: 100,
      });

      expect(schema.type).toBe('integer');
      expect(schema.minimum).toBe(1);
      expect(schema.maximum).toBe(100);
    });
  });

  describe('Schema.boolean', () => {
    it('should create a basic boolean schema', () => {
      const schema = Schema.boolean('Is active');

      expect(schema.type).toBe('boolean');
      expect(schema.description).toBe('Is active');
    });

    it('should create a boolean schema without description', () => {
      const schema = Schema.boolean();

      expect(schema.type).toBe('boolean');
      expect(schema.description).toBeUndefined();
    });
  });

  describe('Schema.array', () => {
    it('should create a basic array schema', () => {
      const schema = Schema.array(Schema.string('Tag'), 'List of tags');

      expect(schema.type).toBe('array');
      expect(schema.items).toEqual({ type: 'string', description: 'Tag' });
      expect(schema.description).toBe('List of tags');
    });

    it('should create an array schema without description', () => {
      const schema = Schema.array(Schema.number('Number'));

      expect(schema.type).toBe('array');
      expect(schema.items).toEqual({ type: 'number', description: 'Number' });
      expect(schema.description).toBeUndefined();
    });

    it('should create an array of integers', () => {
      const schema = Schema.array(Schema.integer('ID'), 'List of IDs');

      expect(schema.type).toBe('array');
      expect(schema.items.type).toBe('integer');
    });

    it('should create an array of objects', () => {
      const itemSchema = Schema.object({
        name: Schema.string('Name'),
        value: Schema.number('Value'),
      });

      const schema = Schema.array(itemSchema, 'List of items');

      expect(schema.type).toBe('array');
      expect(schema.items.type).toBe('object');
    });
  });

  describe('Schema.object', () => {
    it('should create a basic object schema', () => {
      const schema = Schema.object({
        name: Schema.string('Name'),
        age: Schema.integer('Age'),
      });

      expect(schema.type).toBe('object');
      expect(schema.properties.name).toEqual({ type: 'string', description: 'Name' });
      expect(schema.properties.age).toEqual({ type: 'integer', description: 'Age' });
    });

    it('should create an object schema with required fields', () => {
      const schema = Schema.object(
        {
          name: Schema.string('Name'),
          email: Schema.string('Email'),
        },
        ['name', 'email'],
      );

      expect(schema.required).toEqual(['name', 'email']);
    });

    it('should create an object schema with description', () => {
      const schema = Schema.object(
        {
          x: Schema.number('X coordinate'),
          y: Schema.number('Y coordinate'),
        },
        undefined,
        'Point coordinates',
      );

      expect(schema.description).toBe('Point coordinates');
    });

    it('should create a nested object schema', () => {
      const schema = Schema.object({
        user: Schema.object({
          name: Schema.string('Name'),
          settings: Schema.object({
            theme: Schema.string('Theme'),
          }),
        }),
      });

      const userProp = schema.properties.user as { type: string; properties: Record<string, { type: string }> };
      expect(userProp.type).toBe('object');
      expect(userProp.properties.settings.type).toBe('object');
    });
  });

  describe('Schema.optional', () => {
    it('should mark a schema as optional', () => {
      const schema = Schema.optional(Schema.string('Optional field'));

      expect(schema.type).toBe('string');
      expect(schema.description).toBe('Optional field');
      expect(schema.required).toBe(false);
    });

    it('should mark number schema as optional', () => {
      const schema = Schema.optional(Schema.number('Optional count'));

      expect(schema.type).toBe('number');
      expect(schema.required).toBe(false);
    });

    it('should mark array schema as optional', () => {
      const schema = Schema.optional(
        Schema.array(Schema.string('Tag'), 'Optional tags'),
      );

      expect(schema.type).toBe('array');
      expect(schema.required).toBe(false);
    });

    it('should preserve all original properties', () => {
      const original = Schema.string('Test', { minLength: 1, maxLength: 10 });
      const optional = Schema.optional(original);

      expect(optional.type).toBe('string');
      expect(optional.description).toBe('Test');
      expect(optional.minLength).toBe(1);
      expect(optional.maxLength).toBe(10);
      expect(optional.required).toBe(false);
    });
  });

  describe('parameters', () => {
    it('should create a parameters schema', () => {
      const params = parameters({
        query: Schema.string('Search query'),
      });

      expect(params.type).toBe('object');
      expect(params.properties.query.type).toBe('string');
      expect(params.required).toBeUndefined();
    });

    it('should create a parameters schema with required fields', () => {
      const params = parameters(
        {
          query: Schema.string('Search query'),
          limit: Schema.integer('Max results'),
        },
        ['query'],
      );

      expect(params.type).toBe('object');
      expect(params.required).toEqual(['query']);
    });

    it('should create a complex parameters schema', () => {
      const params = parameters(
        {
          query: Schema.string('Search query'),
          language: Schema.optional(
            Schema.string('Language', { enum: ['en', 'es', 'fr'] }),
          ),
          limit: Schema.optional(
            Schema.integer('Max results', { minimum: 1, maximum: 100 }),
          ),
          tags: Schema.optional(
            Schema.array(Schema.string('Tag'), 'Tags to filter by'),
          ),
          filters: Schema.optional(
            Schema.object({
              dateRange: Schema.string('Date range'),
              type: Schema.string('Type'),
            }),
          ),
        },
        ['query'],
      );

      expect(params.type).toBe('object');
      expect(params.required).toEqual(['query']);
      expect(params.properties.query.type).toBe('string');
      expect(params.properties.language.type).toBe('string');
      expect(params.properties.limit.type).toBe('integer');
      expect(params.properties.tags.type).toBe('array');
      expect(params.properties.filters.type).toBe('object');
    });

    it('should create an empty parameters schema', () => {
      const params = parameters({});

      expect(params.type).toBe('object');
      expect(params.properties).toEqual({});
    });

    it('should handle multiple required fields', () => {
      const params = parameters(
        {
          a: Schema.string('A'),
          b: Schema.string('B'),
          c: Schema.string('C'),
        },
        ['a', 'b', 'c'],
      );

      expect(params.required).toEqual(['a', 'b', 'c']);
    });
  });

  describe('Integration - Real World Examples', () => {
    it('should create a web search tool schema', () => {
      const schema = parameters(
        {
          query: Schema.string('Search query'),
          limit: Schema.optional(
            Schema.integer('Maximum number of results', { minimum: 1, maximum: 100 }),
          ),
          language: Schema.optional(
            Schema.string('Language filter', { enum: ['en', 'es', 'fr', 'de', 'ja', 'zh'] }),
          ),
        },
        ['query'],
      );

      expect(schema.type).toBe('object');
      expect(schema.properties.query.description).toBe('Search query');
      expect(schema.required).toEqual(['query']);
    });

    it('should create a file operation tool schema', () => {
      const schema = parameters(
        {
          path: Schema.string('File path'),
          content: Schema.optional(Schema.string('File content')),
          encoding: Schema.optional(
            Schema.string('File encoding', { enum: ['utf-8', 'ascii', 'binary'] }),
          ),
          append: Schema.optional(Schema.boolean('Append mode')),
        },
        ['path'],
      );

      expect(schema.properties.path.type).toBe('string');
      expect(schema.properties.append.type).toBe('boolean');
    });

    it('should create a database query tool schema', () => {
      const schema = parameters(
        {
          table: Schema.string('Table name'),
          columns: Schema.optional(
            Schema.array(Schema.string('Column name'), 'Columns to select'),
          ),
          where: Schema.optional(
            Schema.object({
              field: Schema.string('Field name'),
              operator: Schema.string('Comparison operator', {
                enum: ['eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'like'],
              }),
              value: Schema.string('Value to compare'),
            }),
          ),
          limit: Schema.optional(Schema.integer('Max rows', { maximum: 1000 })),
          offset: Schema.optional(Schema.integer('Row offset', { minimum: 0 })),
        },
        ['table'],
      );

      expect(schema.properties.table.type).toBe('string');
      expect(schema.properties.columns.type).toBe('array');
      expect(schema.properties.where.type).toBe('object');
    });
  });
});
