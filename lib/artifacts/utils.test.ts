/**
 * Tests for artifact utility functions
 */

import { generateArtifactTitle, enhancedDetectArtifactType } from './utils';

describe('generateArtifactTitle', () => {
  it('should extract HTML title', () => {
    const content = '<html><head><title>My Page</title></head></html>';
    expect(generateArtifactTitle(content, 'html')).toBe('My Page');
  });

  it('should detect mermaid type name', () => {
    const content = 'sequenceDiagram\n  A->>B: Hello';
    const result = generateArtifactTitle(content, 'mermaid');
    expect(result).toBe('Sequence Diagram');
  });

  it('should extract function name', () => {
    const content = 'function calculateTotal() { return 0; }';
    expect(generateArtifactTitle(content, 'code', 'javascript')).toBe('calculateTotal');
  });

  it('should extract export function name', () => {
    const content = 'export function MyComponent() { return <div />; }';
    expect(generateArtifactTitle(content, 'react', 'tsx')).toBe('MyComponent');
  });

  it('should use language display name as fallback when no names found', () => {
    const content = '1 + 2 + 3';
    expect(generateArtifactTitle(content, 'code', 'javascript')).toBe('JavaScript Code');
  });

  it('should extract const/let/var name from code', () => {
    const content = 'const x = 1;';
    expect(generateArtifactTitle(content, 'code', 'javascript')).toBe('x');
  });

  it('should return Code Snippet for unknown code', () => {
    const content = 'something random';
    expect(generateArtifactTitle(content, 'code')).toBe('Code Snippet');
  });
});

describe('enhancedDetectArtifactType', () => {
  it('should return base type when not code', () => {
    expect(enhancedDetectArtifactType('html')).toBe('html');
    expect(enhancedDetectArtifactType('mermaid')).toBe('mermaid');
    expect(enhancedDetectArtifactType('svg')).toBe('svg');
  });

  it('should return code when no content provided', () => {
    expect(enhancedDetectArtifactType('code', 'jsx')).toBe('code');
  });

  it('should detect react from jsx with React patterns', () => {
    const content = "import React from 'react';\nexport function App() { return <div />; }";
    expect(enhancedDetectArtifactType('code', 'jsx', content)).toBe('react');
  });

  it('should detect react from tsx with React patterns', () => {
    const content = "import { useState } from 'react';\nexport const Component = () => <div />;";
    expect(enhancedDetectArtifactType('code', 'tsx', content)).toBe('react');
  });

  it('should not detect react from jsx without React patterns', () => {
    const content = 'const x = 1; const y = 2;';
    expect(enhancedDetectArtifactType('code', 'jsx', content)).toBe('code');
  });

  it('should detect chart from json with chart patterns', () => {
    const content = '[{"name": "A", "value": 10}, {"name": "B", "value": 20}]';
    expect(enhancedDetectArtifactType('code', 'json', content)).toBe('chart');
  });

  it('should not detect chart from json without chart patterns', () => {
    const content = '{"key": "value", "other": true}';
    expect(enhancedDetectArtifactType('code', 'json', content)).toBe('code');
  });

  it('should not enhance non-code types', () => {
    const content = "import React from 'react';";
    expect(enhancedDetectArtifactType('document', 'jsx', content)).toBe('document');
  });

  it('should handle case-insensitive language', () => {
    const content = "import React from 'react';\nexport function App() { return <div />; }";
    expect(enhancedDetectArtifactType('code', 'JSX', content)).toBe('react');
    expect(enhancedDetectArtifactType('code', 'TSX', content)).toBe('react');
  });
});
