/**
 * Tests for Diagram Export
 * @jest-environment jsdom
 */

import { generateDiagramFilename } from './diagram-export';

// Mock DOM APIs that aren't available in jsdom
const mockCreateObjectURL = jest.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = jest.fn();

beforeAll(() => {
  global.URL.createObjectURL = mockCreateObjectURL;
  global.URL.revokeObjectURL = mockRevokeObjectURL;
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('generateDiagramFilename', () => {
  describe('mermaid diagrams', () => {
    it('should extract graph type', () => {
      expect(generateDiagramFilename('graph TD\nA-->B', 'mermaid')).toBe('graph_diagram');
    });

    it('should extract flowchart type', () => {
      expect(generateDiagramFilename('flowchart LR\nA-->B', 'mermaid')).toBe('flowchart_diagram');
    });

    it('should extract sequenceDiagram type', () => {
      expect(generateDiagramFilename('sequenceDiagram\nA->>B: Hello', 'mermaid')).toBe('sequencediagram_diagram');
    });

    it('should extract classDiagram type', () => {
      expect(generateDiagramFilename('classDiagram\nClass01', 'mermaid')).toBe('classdiagram_diagram');
    });

    it('should extract stateDiagram type', () => {
      expect(generateDiagramFilename('stateDiagram\n[*] --> State1', 'mermaid')).toBe('statediagram_diagram');
    });

    it('should extract erDiagram type', () => {
      expect(generateDiagramFilename('erDiagram\nCUSTOMER', 'mermaid')).toBe('erdiagram_diagram');
    });

    it('should extract gantt type', () => {
      expect(generateDiagramFilename('gantt\ntitle A Gantt', 'mermaid')).toBe('gantt_diagram');
    });

    it('should extract pie type', () => {
      expect(generateDiagramFilename('pie\n"A" : 50', 'mermaid')).toBe('pie_diagram');
    });

    it('should extract journey type', () => {
      expect(generateDiagramFilename('journey\ntitle My Journey', 'mermaid')).toBe('journey_diagram');
    });

    it('should extract gitGraph type', () => {
      expect(generateDiagramFilename('gitGraph\ncommit', 'mermaid')).toBe('gitgraph_diagram');
    });

    it('should return default for unknown mermaid', () => {
      expect(generateDiagramFilename('unknown content', 'mermaid')).toBe('mermaid_export');
    });
  });

  describe('vegalite charts', () => {
    it('should extract mark type from string', () => {
      const spec = JSON.stringify({ mark: 'bar' });
      expect(generateDiagramFilename(spec, 'vegalite')).toBe('bar_chart');
    });

    it('should extract mark type from object', () => {
      const spec = JSON.stringify({ mark: { type: 'line' } });
      expect(generateDiagramFilename(spec, 'vegalite')).toBe('line_chart');
    });

    it('should return default for missing mark', () => {
      const spec = JSON.stringify({ data: {} });
      expect(generateDiagramFilename(spec, 'vegalite')).toBe('vegalite_export');
    });

    it('should return default for invalid JSON', () => {
      expect(generateDiagramFilename('not json', 'vegalite')).toBe('vegalite_export');
    });
  });
});

// Note: The following tests require more complex DOM mocking
// They are structured but may need additional setup in a full test environment

describe('exportSvgElement', () => {
  it('should throw error for null element', async () => {
    const { exportSvgElement } = await import('./diagram-export');
    await expect(
      exportSvgElement(null, 'test', { format: 'svg' })
    ).rejects.toThrow('SVG element not found');
  });
});

describe('exportDiagram', () => {
  it('should throw error for null container', async () => {
    const { exportDiagram } = await import('./diagram-export');
    await expect(
      exportDiagram(null, 'test', { format: 'svg' })
    ).rejects.toThrow('Container not found');
  });

  it('should throw error for container without SVG', async () => {
    const { exportDiagram } = await import('./diagram-export');
    const container = document.createElement('div');
    await expect(
      exportDiagram(container, 'test', { format: 'svg' })
    ).rejects.toThrow('No SVG found in container');
  });
});

describe('copySvgAsImage', () => {
  it('should throw error for null container', async () => {
    const { copySvgAsImage } = await import('./diagram-export');
    await expect(copySvgAsImage(null)).rejects.toThrow('Container not found');
  });

  it('should throw error for container without SVG', async () => {
    const { copySvgAsImage } = await import('./diagram-export');
    const container = document.createElement('div');
    await expect(copySvgAsImage(container)).rejects.toThrow('No SVG found in container');
  });
});
