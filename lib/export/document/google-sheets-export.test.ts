/**
 * Google Sheets Export Tests
 */

import { tableToCSV } from './google-sheets-export';
import type { TableData } from './excel-export';

describe('Google Sheets Export', () => {
  describe('tableToCSV', () => {
    const sampleData: TableData = {
      headers: ['Name', 'Age', 'City'],
      rows: [
        ['Alice', 30, 'New York'],
        ['Bob', 25, 'Los Angeles'],
      ],
    };

    it('should convert table data to CSV format', () => {
      const csv = tableToCSV(sampleData);
      expect(csv).toContain('Name,Age,City');
      expect(csv).toContain('Alice,30,New York');
      expect(csv).toContain('Bob,25,Los Angeles');
    });

    it('should include headers by default', () => {
      const csv = tableToCSV(sampleData);
      const lines = csv.split('\n');
      expect(lines[0]).toBe('Name,Age,City');
    });

    it('should exclude headers when option is set', () => {
      const csv = tableToCSV(sampleData, { includeHeaders: false });
      const lines = csv.split('\n');
      expect(lines[0]).toBe('Alice,30,New York');
    });

    it('should use custom delimiter', () => {
      const csv = tableToCSV(sampleData, { delimiter: ';' });
      expect(csv).toContain('Name;Age;City');
    });

    it('should quote strings containing delimiter', () => {
      const dataWithComma: TableData = {
        headers: ['Name', 'Description'],
        rows: [['Test', 'Hello, World']],
      };
      const csv = tableToCSV(dataWithComma);
      expect(csv).toContain('"Hello, World"');
    });

    it('should escape quotes in values', () => {
      const dataWithQuotes: TableData = {
        headers: ['Name', 'Quote'],
        rows: [['Test', 'Said "Hello"']],
      };
      const csv = tableToCSV(dataWithQuotes);
      expect(csv).toContain('"Said ""Hello"""');
    });

    it('should handle null and undefined values', () => {
      const dataWithNulls: TableData = {
        headers: ['A', 'B'],
        rows: [[null, undefined]],
      };
      const csv = tableToCSV(dataWithNulls);
      expect(csv).toContain(',');
    });

    it('should handle empty table', () => {
      const emptyData: TableData = {
        headers: [],
        rows: [],
      };
      const csv = tableToCSV(emptyData);
      expect(csv).toBe('');
    });

    it('should sanitize formula-like values', () => {
      const formulaData: TableData = {
        headers: ['Value'],
        rows: [['=SUM(1,2)'], ['+1'], ['-1'], ['@cmd'], ['\t=1']],
      };
      const csv = tableToCSV(formulaData);
      const lines = csv.split('\n');

      expect(lines[1]).toBe("\"'=SUM(1,2)\"");
      expect(lines[2]).toBe("'+1");
      expect(lines[3]).toBe("'-1");
      expect(lines[4]).toBe("'@cmd");
      expect(lines[5]).toBe("'\t=1");
    });
  });
});
