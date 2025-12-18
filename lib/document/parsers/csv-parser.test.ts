/**
 * Tests for CSV Parser
 */

import {
  parseCSV,
  detectDelimiter,
  csvToJSON,
  getCSVStats,
  extractCSVEmbeddableContent,
} from './csv-parser';

describe('detectDelimiter', () => {
  it('detects comma delimiter', () => {
    const content = 'name,age,city\nJohn,30,NYC';
    expect(detectDelimiter(content)).toBe(',');
  });

  it('detects tab delimiter', () => {
    const content = 'name\tage\tcity\nJohn\t30\tNYC';
    expect(detectDelimiter(content)).toBe('\t');
  });

  it('detects semicolon delimiter', () => {
    const content = 'name;age;city\nJohn;30;NYC';
    expect(detectDelimiter(content)).toBe(';');
  });

  it('detects pipe delimiter', () => {
    const content = 'name|age|city\nJohn|30|NYC';
    expect(detectDelimiter(content)).toBe('|');
  });

  it('defaults to comma when no delimiter found', () => {
    const content = 'single value';
    expect(detectDelimiter(content)).toBe(',');
  });
});

describe('parseCSV', () => {
  it('parses basic CSV with header', () => {
    const content = 'name,age,city\nJohn,30,NYC\nJane,25,LA';
    const result = parseCSV(content);

    expect(result.headers).toEqual(['name', 'age', 'city']);
    expect(result.data).toEqual([
      ['John', '30', 'NYC'],
      ['Jane', '25', 'LA'],
    ]);
    expect(result.rowCount).toBe(2);
    expect(result.columnCount).toBe(3);
  });

  it('parses CSV without header', () => {
    const content = 'John,30,NYC\nJane,25,LA';
    const result = parseCSV(content, { hasHeader: false });

    expect(result.headers).toEqual([]);
    expect(result.data).toEqual([
      ['John', '30', 'NYC'],
      ['Jane', '25', 'LA'],
    ]);
    expect(result.rowCount).toBe(2);
  });

  it('handles quoted values with commas', () => {
    const content = 'name,description\nJohn,"Hello, World"\nJane,"Nice, to meet you"';
    const result = parseCSV(content);

    expect(result.data).toEqual([
      ['John', 'Hello, World'],
      ['Jane', 'Nice, to meet you'],
    ]);
  });

  it('handles escaped quotes', () => {
    const content = 'name,quote\nJohn,"He said ""Hello"""\nJane,"She said ""Hi"""';
    const result = parseCSV(content);

    expect(result.data).toEqual([
      ['John', 'He said "Hello"'],
      ['Jane', 'She said "Hi"'],
    ]);
  });

  it('trims values by default', () => {
    const content = 'name, age , city \nJohn , 30 , NYC ';
    const result = parseCSV(content);

    expect(result.headers).toEqual(['name', 'age', 'city']);
    expect(result.data).toEqual([['John', '30', 'NYC']]);
  });

  it('preserves whitespace when trimValues is false', () => {
    const content = 'name, age \nJohn , 30 ';
    const result = parseCSV(content, { trimValues: false });

    expect(result.headers).toEqual(['name', ' age ']);
    expect(result.data).toEqual([['John ', ' 30 ']]);
  });

  it('skips empty lines by default', () => {
    const content = 'name,age\n\nJohn,30\n\nJane,25\n';
    const result = parseCSV(content);

    expect(result.rowCount).toBe(2);
  });

  it('handles TSV format', () => {
    const content = 'name\tage\tcity\nJohn\t30\tNYC';
    const result = parseCSV(content, { delimiter: '\t' });

    expect(result.headers).toEqual(['name', 'age', 'city']);
    expect(result.data).toEqual([['John', '30', 'NYC']]);
    expect(result.delimiter).toBe('\t');
  });

  it('auto-detects delimiter', () => {
    const content = 'name;age;city\nJohn;30;NYC';
    const result = parseCSV(content);

    expect(result.delimiter).toBe(';');
    expect(result.headers).toEqual(['name', 'age', 'city']);
  });

  it('handles empty CSV', () => {
    const result = parseCSV('', { hasHeader: false });

    expect(result.data).toEqual([]);
    expect(result.rowCount).toBe(0);
  });

  it('generates text representation', () => {
    const content = 'name,age\nJohn,30';
    const result = parseCSV(content);

    expect(result.text).toContain('CSV Data');
    expect(result.text).toContain('name');
    expect(result.text).toContain('age');
  });
});

describe('csvToJSON', () => {
  it('converts CSV with headers to JSON objects', () => {
    const content = 'name,age,city\nJohn,30,NYC\nJane,25,LA';
    const result = parseCSV(content);
    const json = csvToJSON(result);

    expect(json).toEqual([
      { name: 'John', age: '30', city: 'NYC', _row: '1' },
      { name: 'Jane', age: '25', city: 'LA', _row: '2' },
    ]);
  });

  it('converts CSV without headers to JSON with column indices', () => {
    const content = 'John,30,NYC\nJane,25,LA';
    const result = parseCSV(content, { hasHeader: false });
    const json = csvToJSON(result);

    expect(json).toEqual([
      { col1: 'John', col2: '30', col3: 'NYC', _row: '1' },
      { col1: 'Jane', col2: '25', col3: 'LA', _row: '2' },
    ]);
  });

  it('handles missing values', () => {
    const content = 'name,age,city\nJohn,30\nJane,,LA';
    const result = parseCSV(content);
    const json = csvToJSON(result);

    expect(json[0].city).toBe('');
    expect(json[1].age).toBe('');
  });
});

describe('getCSVStats', () => {
  it('calculates basic stats', () => {
    const content = 'name,age,score\nJohn,30,95\nJane,25,88';
    const result = parseCSV(content);
    const stats = getCSVStats(result);

    expect(stats.rowCount).toBe(2);
    expect(stats.columnCount).toBe(3);
  });

  it('counts empty cells', () => {
    const content = 'name,age\nJohn,\nJane,25';
    const result = parseCSV(content);
    const stats = getCSVStats(result);

    expect(stats.emptyCount).toBe(1);
  });

  it('detects numeric columns', () => {
    const content = 'name,age,score\nJohn,30,95\nJane,25,88';
    const result = parseCSV(content);
    const stats = getCSVStats(result);

    expect(stats.numericColumns).toContain('age');
    expect(stats.numericColumns).toContain('score');
    expect(stats.numericColumns).not.toContain('name');
  });
});

describe('extractCSVEmbeddableContent', () => {
  it('returns text representation', () => {
    const content = 'name,age\nJohn,30';
    const result = parseCSV(content);
    const embeddable = extractCSVEmbeddableContent(result);

    expect(embeddable).toBe(result.text);
  });
});
