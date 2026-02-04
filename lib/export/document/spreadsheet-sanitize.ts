/**
 * Spreadsheet sanitization utilities
 * Prevents formula injection in CSV/Excel exports.
 */

const FORMULA_PREFIX_REGEX = /^[=+\-@]/;
const FULL_WIDTH_FORMULA_PREFIX_REGEX = /^[＝＋－＠]/;
const CONTROL_PREFIX_REGEX = /^[\t\r\n]/;

/**
 * Sanitize a spreadsheet cell to prevent formula injection.
 * If the value starts with a formula indicator, prefix with a single quote.
 */
export function sanitizeSpreadsheetCell(value: string): string {
  if (!value) return value;
  if (value.startsWith("'")) return value;

  const trimmedStart = value.replace(/^[\s\u0000-\u001F]+/, '');
  if (!trimmedStart) return value;

  if (
    FORMULA_PREFIX_REGEX.test(trimmedStart) ||
    FULL_WIDTH_FORMULA_PREFIX_REGEX.test(trimmedStart) ||
    CONTROL_PREFIX_REGEX.test(value)
  ) {
    return `'${value}`;
  }

  return value;
}

/**
 * Sanitize a 2D table for spreadsheet exports.
 */
export function sanitizeSpreadsheetTable(
  rows: (string | number | boolean | null | undefined)[][]
): (string | number | boolean | null | undefined)[][] {
  return rows.map((row) =>
    row.map((cell) => (typeof cell === 'string' ? sanitizeSpreadsheetCell(cell) : cell))
  );
}
