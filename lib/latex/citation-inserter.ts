/**
 * Citation Inserter
 * Smart citation insertion with context awareness and auto-formatting
 */

import type { Paper } from '@/types/academic';
import type { CitationStyle } from '@/lib/ai/rag/citation-formatter';

// ============================================================================
// Types
// ============================================================================

export interface CitationEntry {
  key: string;
  paper: Paper;
  bibtex: string;
  formatted: Record<CitationStyle, string>;
}

export interface CitationSuggestion {
  entry: CitationEntry;
  relevance: number;
  reason: string;
  position?: {
    line: number;
    column: number;
  };
}

export interface CitationContext {
  beforeCursor: string;
  afterCursor: string;
  currentSentence: string;
  currentParagraph: string;
  documentKeywords: string[];
  existingCitations: string[];
}

export interface CitationInsertOptions {
  style: CitationStyle;
  format: 'inline' | 'parenthetical' | 'footnote' | 'endnote';
  includePageNumber?: boolean;
  pageNumber?: string;
  prefix?: string;
  suffix?: string;
  multiCite?: boolean;
}

export interface CitationLibrary {
  entries: Map<string, CitationEntry>;
  collections: Map<string, string[]>;
  recentlyUsed: string[];
  favorites: string[];
}

// ============================================================================
// Citation Key Generation
// ============================================================================

/**
 * Generate a unique citation key for a paper
 */
export function generateCitationKey(paper: Paper, existingKeys: string[] = []): string {
  const firstAuthor = paper.authors[0];
  let authorPart = 'unknown';

  if (firstAuthor) {
    const nameParts = firstAuthor.name.split(' ');
    authorPart = nameParts[nameParts.length - 1].toLowerCase().replace(/[^a-z]/g, '');
  }

  const year = paper.year?.toString() || '';

  // Get first significant word from title
  const titleWords = paper.title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => !['a', 'an', 'the', 'of', 'for', 'and', 'or', 'in', 'on', 'to'].includes(w));

  const titlePart = titleWords[0] || 'untitled';

  const baseKey = `${authorPart}${year}${titlePart}`;

  // Ensure uniqueness
  let key = baseKey;
  let counter = 1;
  while (existingKeys.includes(key)) {
    key = `${baseKey}${String.fromCharCode(96 + counter)}`; // a, b, c, ...
    counter++;
  }

  return key;
}

/**
 * Generate BibTeX entry for a paper
 */
export function generateBibTeX(paper: Paper, key: string): string {
  const fields: string[] = [];

  // Title
  if (paper.title) {
    fields.push(`  title = {${escapeBibTeX(paper.title)}}`);
  }

  // Authors
  if (paper.authors.length > 0) {
    const authors = paper.authors.map((a) => a.name).join(' and ');
    fields.push(`  author = {${escapeBibTeX(authors)}}`);
  }

  // Year
  if (paper.year) {
    fields.push(`  year = {${paper.year}}`);
  }

  // Journal/Venue
  if (paper.journal || paper.venue) {
    fields.push(`  journal = {${escapeBibTeX(paper.journal || paper.venue || '')}}`);
  }

  // Volume
  if (paper.volume) {
    fields.push(`  volume = {${paper.volume}}`);
  }

  // Issue/Number
  if (paper.issue) {
    fields.push(`  number = {${paper.issue}}`);
  }

  // Pages
  if (paper.pages) {
    fields.push(`  pages = {${paper.pages}}`);
  }

  // DOI
  if (paper.metadata?.doi) {
    fields.push(`  doi = {${paper.metadata.doi}}`);
  }

  // URL
  if (paper.urls && paper.urls.length > 0) {
    fields.push(`  url = {${paper.urls[0].url}}`);
  }

  // Abstract
  if (paper.abstract) {
    fields.push(`  abstract = {${escapeBibTeX(paper.abstract)}}`);
  }

  // Determine entry type
  const entryType = determineEntryType(paper);

  return `@${entryType}{${key},\n${fields.join(',\n')}\n}`;
}

/**
 * Determine the BibTeX entry type for a paper
 */
function determineEntryType(paper: Paper): string {
  const venue = (paper.venue || paper.journal || '').toLowerCase();

  if (venue.includes('conference') || venue.includes('proceedings') || venue.includes('workshop')) {
    return 'inproceedings';
  }
  if (venue.includes('journal') || venue.includes('transactions')) {
    return 'article';
  }
  if (venue.includes('arxiv') || venue.includes('preprint')) {
    return 'misc';
  }
  if (paper.metadata?.doi?.includes('book')) {
    return 'book';
  }

  return 'article';
}

/**
 * Escape special characters for BibTeX
 */
function escapeBibTeX(text: string): string {
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/[&%$#_{}]/g, (match) => `\\${match}`)
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

// ============================================================================
// Citation Formatting
// ============================================================================

/**
 * Format a citation for insertion
 */
export function formatCitation(
  entry: CitationEntry,
  options: CitationInsertOptions
): string {
  const { format, includePageNumber, pageNumber, prefix, suffix } = options;

  let citation = '';

  switch (format) {
    case 'inline':
      citation = formatInlineCitation(entry, options.style);
      break;
    case 'parenthetical':
      citation = formatParentheticalCitation(entry, options.style);
      break;
    case 'footnote':
      citation = formatFootnoteCitation(entry, options.style);
      break;
    case 'endnote':
      citation = formatEndnoteCitation(entry, options.style);
      break;
    default:
      citation = `\\cite{${entry.key}}`;
  }

  // Add page number
  if (includePageNumber && pageNumber) {
    citation = citation.replace('}', `, p.~${pageNumber}}`);
  }

  // Add prefix/suffix
  if (prefix) {
    citation = citation.replace('{', `{${prefix} `);
  }
  if (suffix) {
    citation = citation.replace(/}$/, ` ${suffix}}`);
  }

  return citation;
}

/**
 * Format inline citation (e.g., "Smith (2020)")
 */
function formatInlineCitation(entry: CitationEntry, style: CitationStyle): string {
  const firstAuthor = entry.paper.authors[0]?.name.split(' ').pop() || 'Unknown';
  const year = entry.paper.year || 'n.d.';

  switch (style) {
    case 'apa':
    case 'harvard':
      return `${firstAuthor} (${year})`;
    case 'mla':
      return `${firstAuthor}`;
    case 'chicago':
      return `${firstAuthor} (${year})`;
    case 'ieee':
      return `\\cite{${entry.key}}`;
    default:
      return `\\citet{${entry.key}}`;
  }
}

/**
 * Format parenthetical citation (e.g., "(Smith, 2020)")
 */
function formatParentheticalCitation(entry: CitationEntry, style: CitationStyle): string {
  const firstAuthor = entry.paper.authors[0]?.name.split(' ').pop() || 'Unknown';
  const year = entry.paper.year || 'n.d.';

  switch (style) {
    case 'apa':
    case 'harvard':
      return `(${firstAuthor}, ${year})`;
    case 'mla':
      return `(${firstAuthor})`;
    case 'chicago':
      return `(${firstAuthor} ${year})`;
    case 'ieee':
      return `\\cite{${entry.key}}`;
    default:
      return `\\citep{${entry.key}}`;
  }
}

/**
 * Format footnote citation
 */
function formatFootnoteCitation(entry: CitationEntry, style: CitationStyle): string {
  const formatted = entry.formatted[style] || entry.formatted.simple;
  return `\\footnote{${formatted}}`;
}

/**
 * Format endnote citation
 */
function formatEndnoteCitation(entry: CitationEntry, _style: CitationStyle): string {
  return `\\endnote{\\cite{${entry.key}}}`;
}

/**
 * Format multiple citations
 */
export function formatMultipleCitations(
  entries: CitationEntry[],
  options: CitationInsertOptions
): string {
  if (entries.length === 0) return '';
  if (entries.length === 1) return formatCitation(entries[0], options);

  const keys = entries.map((e) => e.key).join(', ');

  switch (options.format) {
    case 'inline':
    case 'parenthetical':
      return `\\cite{${keys}}`;
    case 'footnote':
      return `\\footnote{\\cite{${keys}}}`;
    case 'endnote':
      return `\\endnote{\\cite{${keys}}}`;
    default:
      return `\\cite{${keys}}`;
  }
}

// ============================================================================
// Context Analysis
// ============================================================================

/**
 * Extract citation context from document
 */
export function extractCitationContext(
  content: string,
  cursorPosition: number
): CitationContext {
  const beforeCursor = content.slice(0, cursorPosition);
  const afterCursor = content.slice(cursorPosition);

  // Get current sentence
  const sentenceStart = Math.max(
    beforeCursor.lastIndexOf('.') + 1,
    beforeCursor.lastIndexOf('!') + 1,
    beforeCursor.lastIndexOf('?') + 1,
    0
  );
  const sentenceEnd = Math.min(
    afterCursor.indexOf('.') !== -1 ? cursorPosition + afterCursor.indexOf('.') : content.length,
    afterCursor.indexOf('!') !== -1 ? cursorPosition + afterCursor.indexOf('!') : content.length,
    afterCursor.indexOf('?') !== -1 ? cursorPosition + afterCursor.indexOf('?') : content.length
  );
  const currentSentence = content.slice(sentenceStart, sentenceEnd).trim();

  // Get current paragraph
  const paragraphStart = beforeCursor.lastIndexOf('\n\n') + 2;
  const paragraphEnd = afterCursor.indexOf('\n\n');
  const currentParagraph = content.slice(
    paragraphStart,
    paragraphEnd !== -1 ? cursorPosition + paragraphEnd : content.length
  ).trim();

  // Extract keywords from document
  const documentKeywords = extractKeywords(content);

  // Extract existing citations
  const existingCitations = extractExistingCitations(content);

  return {
    beforeCursor,
    afterCursor,
    currentSentence,
    currentParagraph,
    documentKeywords,
    existingCitations,
  };
}

/**
 * Extract keywords from text
 */
function extractKeywords(text: string): string[] {
  // Remove LaTeX commands and citations
  const cleanText = text
    .replace(/\\[a-zA-Z]+\{[^}]*\}/g, '')
    .replace(/\$[^$]+\$/g, '')
    .toLowerCase();

  // Split into words and filter
  const words = cleanText.split(/\s+/);
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
    'this', 'that', 'these', 'those', 'it', 'its', 'we', 'our', 'they', 'their',
  ]);

  const keywords = words
    .filter((w) => w.length > 3 && !stopWords.has(w) && /^[a-z]+$/.test(w));

  // Count frequency
  const frequency = new Map<string, number>();
  for (const word of keywords) {
    frequency.set(word, (frequency.get(word) || 0) + 1);
  }

  // Return top keywords
  return Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);
}

/**
 * Extract existing citations from text
 */
function extractExistingCitations(text: string): string[] {
  const citations: string[] = [];

  // Match \cite{...} patterns
  const citeMatches = text.matchAll(/\\cite[tp]?\{([^}]+)\}/g);
  for (const match of citeMatches) {
    const keys = match[1].split(',').map((k) => k.trim());
    citations.push(...keys);
  }

  return [...new Set(citations)];
}

// ============================================================================
// Citation Suggestions
// ============================================================================

/**
 * Get citation suggestions based on context
 */
export function getCitationSuggestions(
  context: CitationContext,
  library: CitationLibrary,
  maxSuggestions: number = 5
): CitationSuggestion[] {
  const suggestions: CitationSuggestion[] = [];

  for (const [_key, entry] of library.entries) {
    // Skip already cited papers
    if (context.existingCitations.includes(entry.key)) {
      continue;
    }

    const relevance = calculateRelevance(context, entry);
    if (relevance > 0.1) {
      suggestions.push({
        entry,
        relevance,
        reason: generateReason(context, entry, relevance),
      });
    }
  }

  // Sort by relevance and return top suggestions
  return suggestions
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, maxSuggestions);
}

/**
 * Calculate relevance score for a citation
 */
function calculateRelevance(context: CitationContext, entry: CitationEntry): number {
  let score = 0;

  const paperText = [
    entry.paper.title,
    entry.paper.abstract || '',
    ...(entry.paper.categories || []),
  ].join(' ').toLowerCase();

  // Check keyword overlap
  for (const keyword of context.documentKeywords) {
    if (paperText.includes(keyword)) {
      score += 0.1;
    }
  }

  // Check sentence/paragraph overlap
  const sentenceWords = context.currentSentence.toLowerCase().split(/\s+/);
  for (const word of sentenceWords) {
    if (word.length > 4 && paperText.includes(word)) {
      score += 0.15;
    }
  }

  // Boost recent papers
  if (entry.paper.year) {
    const currentYear = new Date().getFullYear();
    const age = currentYear - entry.paper.year;
    if (age <= 2) score += 0.2;
    else if (age <= 5) score += 0.1;
  }

  // Cap at 1.0
  return Math.min(score, 1.0);
}

/**
 * Generate reason for suggestion
 */
function generateReason(
  context: CitationContext,
  entry: CitationEntry,
  relevance: number
): string {
  const reasons: string[] = [];

  // Find matching keywords
  const paperText = [
    entry.paper.title,
    entry.paper.abstract || '',
  ].join(' ').toLowerCase();

  const matchingKeywords = context.documentKeywords.filter((k) => paperText.includes(k));
  if (matchingKeywords.length > 0) {
    reasons.push(`Matches keywords: ${matchingKeywords.slice(0, 3).join(', ')}`);
  }

  // Check recency
  if (entry.paper.year) {
    const currentYear = new Date().getFullYear();
    if (currentYear - entry.paper.year <= 2) {
      reasons.push('Recent publication');
    }
  }

  // Check citation count
  if (entry.paper.citationCount && entry.paper.citationCount > 100) {
    reasons.push(`Highly cited (${entry.paper.citationCount})`);
  }

  if (reasons.length === 0) {
    if (relevance > 0.5) {
      reasons.push('Highly relevant to context');
    } else {
      reasons.push('Potentially relevant');
    }
  }

  return reasons.join('; ');
}

// ============================================================================
// Citation Library Management
// ============================================================================

/**
 * Create a new citation library
 */
export function createCitationLibrary(): CitationLibrary {
  return {
    entries: new Map(),
    collections: new Map(),
    recentlyUsed: [],
    favorites: [],
  };
}

/**
 * Add a paper to the citation library
 */
export function addToCitationLibrary(
  library: CitationLibrary,
  paper: Paper,
  collection?: string
): CitationEntry {
  const existingKeys = Array.from(library.entries.keys());
  const key = generateCitationKey(paper, existingKeys);
  const bibtex = generateBibTeX(paper, key);

  const entry: CitationEntry = {
    key,
    paper,
    bibtex,
    formatted: {
      apa: formatAPACitation(paper),
      mla: formatMLACitation(paper),
      chicago: formatChicagoCitation(paper),
      harvard: formatHarvardCitation(paper),
      ieee: formatIEEECitation(paper),
      simple: formatSimpleCitation(paper),
    },
  };

  library.entries.set(key, entry);

  if (collection) {
    if (!library.collections.has(collection)) {
      library.collections.set(collection, []);
    }
    library.collections.get(collection)!.push(key);
  }

  return entry;
}

/**
 * Remove an entry from the citation library
 */
export function removeFromCitationLibrary(library: CitationLibrary, key: string): boolean {
  if (!library.entries.has(key)) return false;

  library.entries.delete(key);

  // Remove from collections
  for (const [, keys] of library.collections) {
    const index = keys.indexOf(key);
    if (index !== -1) {
      keys.splice(index, 1);
    }
  }

  // Remove from recently used
  const recentIndex = library.recentlyUsed.indexOf(key);
  if (recentIndex !== -1) {
    library.recentlyUsed.splice(recentIndex, 1);
  }

  // Remove from favorites
  const favIndex = library.favorites.indexOf(key);
  if (favIndex !== -1) {
    library.favorites.splice(favIndex, 1);
  }

  return true;
}

/**
 * Mark a citation as used
 */
export function markCitationUsed(library: CitationLibrary, key: string): void {
  // Remove if already in list
  const index = library.recentlyUsed.indexOf(key);
  if (index !== -1) {
    library.recentlyUsed.splice(index, 1);
  }

  // Add to front
  library.recentlyUsed.unshift(key);

  // Keep only last 50
  if (library.recentlyUsed.length > 50) {
    library.recentlyUsed.pop();
  }
}

/**
 * Export library to BibTeX format
 */
export function exportLibraryToBibTeX(library: CitationLibrary): string {
  const entries: string[] = [];

  for (const [, entry] of library.entries) {
    entries.push(entry.bibtex);
  }

  return entries.join('\n\n');
}

// ============================================================================
// Citation Formatters (simplified versions)
// ============================================================================

function formatSimpleCitation(paper: Paper): string {
  const author = paper.authors[0]?.name || 'Unknown';
  const year = paper.year || 'n.d.';
  return `${author} (${year}). ${paper.title}.`;
}

function formatAPACitation(paper: Paper): string {
  const authors = paper.authors.map((a) => a.name).join(', ');
  const year = paper.year || 'n.d.';
  const title = paper.title;
  const venue = paper.journal || paper.venue || '';

  return `${authors} (${year}). ${title}. ${venue}.`.replace(/\.\./g, '.');
}

function formatMLACitation(paper: Paper): string {
  const authors = paper.authors.map((a) => a.name).join(', ');
  const title = paper.title;
  const venue = paper.journal || paper.venue || '';
  const year = paper.year || 'n.d.';

  return `${authors}. "${title}." ${venue}, ${year}.`.replace(/\.\./g, '.');
}

function formatChicagoCitation(paper: Paper): string {
  const authors = paper.authors.map((a) => a.name).join(', ');
  const title = paper.title;
  const venue = paper.journal || paper.venue || '';
  const year = paper.year || 'n.d.';

  return `${authors}. "${title}." ${venue} (${year}).`.replace(/\.\./g, '.');
}

function formatHarvardCitation(paper: Paper): string {
  const authors = paper.authors.map((a) => a.name).join(', ');
  const year = paper.year || 'n.d.';
  const title = paper.title;
  const venue = paper.journal || paper.venue || '';

  return `${authors} (${year}) '${title}', ${venue}.`.replace(/\.\./g, '.');
}

function formatIEEECitation(paper: Paper): string {
  const authors = paper.authors.map((a) => a.name).join(', ');
  const title = paper.title;
  const venue = paper.journal || paper.venue || '';
  const year = paper.year || 'n.d.';
  const volume = paper.volume ? `vol. ${paper.volume}` : '';
  const pages = paper.pages ? `pp. ${paper.pages}` : '';

  return `${authors}, "${title}," ${venue}, ${[volume, pages, year].filter(Boolean).join(', ')}.`.replace(/\.\./g, '.');
}

// ============================================================================
// Export
// ============================================================================

const citationInserterApi = {
  generateCitationKey,
  generateBibTeX,
  formatCitation,
  formatMultipleCitations,
  extractCitationContext,
  getCitationSuggestions,
  createCitationLibrary,
  addToCitationLibrary,
  removeFromCitationLibrary,
  markCitationUsed,
  exportLibraryToBibTeX,
};

export default citationInserterApi;
