/**
 * LaTeX Library - Main export file
 */

// Core modules
export * from './symbols';
export * from './parser';

// Feature modules
export * from './voice-to-latex';
export * from './citation-inserter';
export * from './equation-reasoner';
export * from './sketch-to-latex';
export * from './version-control';
export * from './templates';
export * from './export';

// Default exports
export { default as latexSymbols } from './symbols';
export { default as latexParser } from './parser';
export { default as voiceToLatex } from './voice-to-latex';
export { default as citationInserter } from './citation-inserter';
export { default as equationReasoner } from './equation-reasoner';
export { default as sketchToLatex } from './sketch-to-latex';
export { default as versionControl } from './version-control';
export { default as latexTemplates } from './templates';
export { default as latexExport } from './export';
